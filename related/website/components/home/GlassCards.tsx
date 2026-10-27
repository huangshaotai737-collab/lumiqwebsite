"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import Heading from "@/components/Heading";

import { chapterImage } from "./HomeBackgrounds";

import { Suspense, createContext, useContext, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, MeshTransmissionMaterial, useFBO } from "@react-three/drei";
import { CanvasTexture, ExtrudeGeometry, Group, MathUtils, NoToneMapping, PerspectiveCamera, ShaderMaterial, Shape, SRGBColorSpace, Texture, TextureLoader, VideoTexture, Vector3 } from "three";
import "@/app/[locale]/glass-preview/preview.css";
import copyStyles from "./ProductCardCopy.module.css";

export type GlassProduct = { name: string; image: string; body?: string; href?: string; explore?: string };

const demoProducts: GlassProduct[] = [
  { name: "LumiQ Go", image: "/assets/home-interactive/go.webp" },
  { name: "LumiQ Tablet", image: "/assets/home-products-refined-20260907/tablet-pair.webp" },
  { name: "LumiQ OLA", image: "/assets/home-products-refined-20260907/ola-original-transparent.webp" },
];

type CardPointer = { x: number; y: number; hovered: boolean };

type TextureEntry = { texture: Texture | null; settled: boolean; listeners: Set<() => void> };
const TexturePool = createContext<Map<string, TextureEntry> | null>(null);

// One request and GPU texture per CMS-resolved asset, shared by face and reflection.
// The pool belongs to this canvas and is disposed when the canvas unmounts.
function useSafeTexture(originalUrl: string, transparent = false): Texture {
  const cms = useContentAdapter();
  const url = cms.url(originalUrl);
  const pool = useContext(TexturePool)!;
  const invalidate = useThree(state => state.invalidate);
  const [, update] = useState(0);
  const fallback = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    if (!transparent) {
      const gradient = ctx.createLinearGradient(0, 0, 96, 96);
      gradient.addColorStop(0, "#f8f5fb");
      gradient.addColorStop(.5, "#e9eef8");
      gradient.addColorStop(1, "#f7eee9");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 96, 96);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [transparent]);
  useEffect(() => {
    let entry = pool.get(url);
    const changed = () => { update(value => value + 1); invalidate(); };
    if (!entry) {
      entry = { texture: null, settled: false, listeners: new Set() };
      pool.set(url, entry);
      const resource = entry;
      new TextureLoader().load(url, texture => {
        if (pool.get(url) !== resource) { texture.dispose(); return; }
        texture.colorSpace = SRGBColorSpace;
        resource.texture = texture;
        resource.settled = true;
        resource.listeners.forEach(notify => notify());
      }, undefined, () => {
        resource.settled = true;
        resource.listeners.forEach(notify => notify());
      });
    }
    entry.listeners.add(changed);
    changed();
    return () => { entry.listeners.delete(changed); };
  }, [url, pool, invalidate]);
  useEffect(() => () => fallback.dispose(), [fallback]);
  return pool.get(url)?.texture ?? fallback;
}

function GlassScene({ selected, select, sideView, content, products, carousel = false }: {
  selected: number; select: (index: number) => void; sideView: boolean; content: boolean; products: GlassProduct[]; carousel?: boolean;
}) {
  const { camera, size } = useThree();
  const pending = useRef<{ index: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const blockedUntil = useRef(0);
  const cancelHover = useCallback(() => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
  }, []);
  useEffect(() => {
    cancelHover();
    blockedUntil.current = performance.now() + 1000;
    return cancelHover;
  }, [selected, cancelHover]);
  const hover = useCallback((index: number | null) => {
    if (carousel || index === null || index === selected || performance.now() < blockedUntil.current) {
      cancelHover(); return;
    }
    if (pending.current?.index === index) return;
    cancelHover();
    pending.current = { index, timer: setTimeout(() => {
      pending.current = null;
      blockedUntil.current = performance.now() + 1000;
      select(index);
    }, 420) };
  }, [selected, select, cancelHover, carousel]);
  const opticalObjects = useRef<Group>(null);
  const reflections = useRef<Group>(null);
  const refractionBackground = useRef<Group>(null);
  const pointers = useMemo(() => products.map(() => ({ x: 0, y: 0, hovered: false })), [products]);
  const buffer = useFBO(512, 512);
  useFrame(({ gl, scene }) => {
    if (!opticalObjects.current) return;
    const previous = gl.getRenderTarget();
    opticalObjects.current.visible = false;
    if (refractionBackground.current) refractionBackground.current.visible = true;
    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(previous);
    opticalObjects.current.visible = true;
    if (refractionBackground.current) refractionBackground.current.visible = !carousel;
  }, -1);
  const background = useSafeTexture(carousel ? chapterImage("products") : "/assets/home-interactive/pearl-light.webp");
  const geometry = useMemo(() => {
    const w = 3.1, h = 4.5, r = .22;
    const s = new Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new ExtrudeGeometry(s, { depth: .18, bevelEnabled: true, bevelThickness: .035, bevelSize: .075, bevelSegments: 6, curveSegments: 16, steps: 1 });
    g.center();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    (camera as PerspectiveCamera).fov = MathUtils.radToDeg(2 * Math.atan(Math.max(carousel ? 8.8 : 7.2, (carousel ? 16.8 : 11.5) * size.height / size.width) / (2 * Math.hypot(36, 2.2))));
    camera.lookAt(0, carousel ? -.45 : -.9, 0);
    camera.updateProjectionMatrix();
  }, [camera, size, carousel]);
  return <>
    <ambientLight intensity={2} />
    <group ref={refractionBackground} visible={!carousel}>
      <ViewportBackground texture={background} fixed={carousel} />
    </group>
    <Environment resolution={256}>
      <color attach="background" args={["#b8b3c5"]} />
      <Lightformer form="rect" intensity={4} position={[-4, 3, 4]} scale={[1.2, 8, 1]} color="#fff4fc" />
      <Lightformer form="rect" intensity={3} position={[5, 1, 3]} scale={[1, 7, 1]} color="#dae8ff" />
      <Lightformer form="rect" intensity={2} position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 2, 1]} />
    </Environment>
    <group ref={opticalObjects}>
    {products.map((product, index) => <GlassCard key={product.name} geometry={geometry} index={index} product={product} five={carousel} offset={carousel ? ((index - selected + products.length + Math.floor(products.length / 2)) % products.length) - Math.floor(products.length / 2) : index - 1}
      active={selected === index} select={select} hover={hover} sideView={sideView} content={content} buffer={buffer.texture} pointer={pointers[index]} />)}
    {/* Mirror geometry across the contact plane; keep the original backdrop continuous. */}
    <group ref={reflections} position={[0, -4.56, 0]} scale={[1, -1, 1]}>
      {products.map((product, index) => <GlassCard key={product.name} geometry={geometry} index={index} product={product} five={carousel} offset={carousel ? ((index - selected + products.length + Math.floor(products.length / 2)) % products.length) - Math.floor(products.length / 2) : index - 1}
        active={selected === index} select={select} hover={hover} sideView={sideView} content={content} buffer={buffer.texture} pointer={pointers[index]} reflected />)}
    </group>
    </group>
  </>;
}

// Refraction uses the same fixed viewport coordinates and crossfade as the page background.
function ViewportBackground({ texture, fixed }: { texture: Texture; fixed: boolean }) {
  const nextTexture = useSafeTexture(chapterImage("films"));
  const videoMap = useRef<VideoTexture | null>(null);
  const decodedTime = useRef(-1);
  useEffect(() => () => { videoMap.current?.dispose(); }, []);
  const material = useRef<ShaderMaterial>(null);
  const { gl } = useThree();
  const uniforms = useMemo(() => ({ map: { value: texture }, nextMap: { value: nextTexture }, blend: { value: 0 }, viewport: { value: [1, 1] },
    canvasOrigin: { value: [0, 0] }, canvasSize: { value: [1, 1] }, canvasHeight: { value: 1 }, pixelRatio: { value: 1 }, imageSize: { value: [1, 1] } }), [texture, nextTexture]);
  useFrame(() => {
    if (!material.current) return;
    const rect = gl.domElement.getBoundingClientRect();
    const u = material.current.uniforms;
    const image = texture.image as HTMLImageElement;
    const video = fixed ? document.querySelector<HTMLVideoElement>("[data-background-video]") : null;
    const liveVideo = video?.dataset.ready === "true";
    if (liveVideo && !videoMap.current) {
      videoMap.current = new VideoTexture(video);
      videoMap.current.colorSpace = SRGBColorSpace;
    }
    if (liveVideo && videoMap.current && !video.seeking && decodedTime.current !== video.currentTime) {
      videoMap.current.needsUpdate = true;
      decodedTime.current = video.currentTime;
    }
    u.map.value = liveVideo ? videoMap.current : texture;
    u.nextMap.value = liveVideo ? videoMap.current : nextTexture;
    const backdrop = fixed ? document.querySelector('.lh-fixed-backgrounds')?.getBoundingClientRect() : null;
    u.viewport.value = backdrop ? [backdrop.width, backdrop.height] : [rect.width, rect.height];
    u.blend.value = 0;
    u.canvasOrigin.value = backdrop ? [rect.left - backdrop.left, rect.top - backdrop.top] : [0, 0]; u.canvasHeight.value = rect.height;
    u.canvasSize.value = [rect.width, rect.height];
    u.pixelRatio.value = gl.getPixelRatio(); u.imageSize.value = liveVideo ? [video.videoWidth, video.videoHeight] : [image.width, image.height];
  }, -2);
  return <mesh frustumCulled={false} renderOrder={-10} raycast={() => {}}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial ref={material} uniforms={uniforms} depthWrite={false} depthTest={false}
      vertexShader={`varying vec2 screenUv; void main(){screenUv=uv;gl_Position=vec4(position.xy,.999,1.);}`}
      fragmentShader={`uniform sampler2D map; uniform sampler2D nextMap; uniform float blend; uniform vec2 viewport; uniform vec2 canvasOrigin; uniform vec2 imageSize;
        varying vec2 screenUv; uniform vec2 canvasSize;
        void main(){
          vec2 screen=vec2(screenUv.x,1.-screenUv.y)*canvasSize+canvasOrigin;
          float scale=max(viewport.x/imageSize.x,viewport.y/imageSize.y);
          vec2 uv=(screen-viewport*.5)/(imageSize*scale)+.5;
          gl_FragColor=mix(texture2D(map,vec2(uv.x,1.-uv.y)),texture2D(nextMap,vec2(uv.x,1.-uv.y)),blend);
          #include <colorspace_fragment>
        }`} />
  </mesh>;
}

function GlassCard({ geometry, index, product, offset, five, active, select, hover, sideView, content, buffer, pointer, reflected = false }: {
  geometry: ExtrudeGeometry; index: number; product: GlassProduct; offset: number; five: boolean; active: boolean; select: (index: number) => void; hover: (index: number | null) => void; sideView: boolean; content: boolean; buffer: Texture; pointer: CardPointer; reflected?: boolean;
}) {
  const cms = useContentAdapter();
  const group = useRef<Group>(null);
  const copySurface = useRef<HTMLDivElement>(null);
  const lastTransform = useRef("");
  const motionPreference = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)"), []);
  const projected = useMemo(() => [new Vector3(), new Vector3(), new Vector3()], []);
  const targetX = five ? Math.sign(offset) * ([0, 4.15, 7][Math.abs(offset)] ?? 7) : offset * 3.55;
  const targetScale = five ? [1.36, .83, .76][Math.abs(offset)] : active ? 1 : .9;
  const opacity = five && !active ? .7 : 1;
  const initialX = useRef(targetX);
  const initialScale = useRef(targetScale);
  const previousOffset = useRef(offset);
  useLayoutEffect(() => { group.current?.scale.setScalar(initialScale.current); }, []);
  useFrame(({camera, size}, delta) => {
    if (!group.current) return;
    const angle = sideView ? .82 : offset > 0 ? -.28 : .28;
    // A wrapped item re-enters at the opposite edge, never travelling across the foreground.
    if (five && Math.abs(offset - previousOffset.current) > 2) {
      group.current.position.x = targetX;
      group.current.rotation.y = angle;
      group.current.scale.setScalar(targetScale);
      pointer.hovered = false;
    }
    previousOffset.current = offset;
    const reduced = motionPreference.matches;
    const hovering = pointer.hovered && !reduced;
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, angle + (hovering ? pointer.x * .07 : 0), 7, delta);
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, hovering ? -pointer.y * .045 : 0, 7, delta);
    const ease = reduced ? 1 : 1 - Math.exp(-7 * delta);
    group.current.position.x = MathUtils.lerp(group.current.position.x, targetX, ease);
    group.current.scale.setScalar(MathUtils.lerp(group.current.scale.x, targetScale, ease));
    group.current.updateMatrix();
    const m = group.current.matrix.elements;
    group.current.position.y = -2.28 + Math.abs(m[1]) * 1.625 + Math.abs(m[5]) * 2.325 + Math.abs(m[9]) * .125;
    if (copySurface.current) {
      // Keep the glass in WebGL, but project readable DOM copy with a flat matrix.
      // Safari can misplace/omit text inside Html's nested CSS perspective layers.
      group.current.updateWorldMatrix(true, false);
      const [origin, x, y] = projected;
      origin.set(0, 0, .3).applyMatrix4(group.current.matrixWorld).project(camera);
      x.set(1, 0, .3).applyMatrix4(group.current.matrixWorld).project(camera);
      y.set(0, -1, .3).applyMatrix4(group.current.matrixWorld).project(camera);
      const a=(x.x-origin.x)*size.width/200, b=-(x.y-origin.y)*size.height/200;
      const c=(y.x-origin.x)*size.width/200, d=-(y.y-origin.y)*size.height/200;
      const transform = `matrix(${[a,b,c,d,-142.5*a-210*c,-142.5*b-210*d].map(value => value.toFixed(4)).join(",")})`;
      if (transform !== lastTransform.current) {
        copySurface.current.style.transform = transform;
        lastTransform.current = transform;
      }
      // The first projected frame is ready before DOM copy becomes visible.
      // Otherwise Html briefly paints unscaled text at its default position.
      if (!copySurface.current.dataset.projected) copySurface.current.dataset.projected = "true";
    }
  });
  // Keep the beveled bottom on the reflecting floor at either card scale.
  return <group ref={group} position={[initialX.current, 0, 0]} visible={Math.abs(offset) <= (five ? 2 : 1)}>
    {!reflected && <GlassShadow active={active} />}
    <mesh geometry={geometry} raycast={reflected || Math.abs(offset) > (five ? 2 : 1) ? () => {} : undefined} onPointerMove={reflected ? undefined : e => {
      e.stopPropagation();
      const local = group.current!.worldToLocal(e.point.clone());
      pointer.x = MathUtils.clamp(local.x / 1.625, -1, 1);
      pointer.y = MathUtils.clamp(local.y / 2.325, -1, 1);
      pointer.hovered = true;
      hover(index);
    }} onPointerOut={reflected ? undefined : () => { pointer.hovered = false; hover(null); }}
      onPointerOver={reflected ? undefined : e => { e.stopPropagation(); hover(index); }} onClick={reflected ? undefined : e => { e.stopPropagation(); select(index); }}>
      {reflected ? <meshBasicMaterial color="#f1eef8" transparent opacity={.10 * opacity} depthWrite={false} toneMapped={false} /> :
      <MeshTransmissionMaterial buffer={buffer} thickness={.25}
        userData={reflected ? { reflectionOpacity: .45 * opacity } : {}}
        transmission={1} roughness={active ? .7 : .38} ior={1.65} transparent opacity={(reflected ? .45 : 1) * opacity}
        clearcoat={1} clearcoatRoughness={.045} attenuationColor="#dcd5ea" attenuationDistance={2.5}
        chromaticAberration={0} anisotropicBlur={0} distortion={0}
        samples={2} resolution={512} backsideResolution={256} color="#ffffff" />}
    </mesh>
    <PearlFlow index={index} reflected={reflected} opacity={opacity} active={active} />
    {content && <CardArtwork product={product} active={active} reflected={reflected} opacity={opacity} hideLabel={five && !reflected && Boolean(product.body)} />}
    {content && !reflected && Math.abs(offset) <= (five ? 2 : 1) && <Html position={[0, 0, .3]} zIndexRange={[20, 10]}>
      <div ref={copySurface} className={`glass-sample-content ${copyStyles.surface}`} onMouseEnter={() => hover(index)}
        onPointerMove={e => {
          if (e.pointerType === "touch") return;
          const rect = e.currentTarget.getBoundingClientRect();
          pointer.x = MathUtils.clamp((e.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
          pointer.y = MathUtils.clamp(1 - (e.clientY - rect.top) / rect.height * 2, -1, 1);
          pointer.hovered = true;
          hover(index);
        }} onPointerLeave={() => { pointer.hovered = false; hover(null); }} data-active={active} data-offset={offset} data-scale={targetScale}>
        {product.href ? <a href={product.href} className="glass-product-hit"
          onClick={e => { if (!active) { e.preventDefault(); select(index); } }}
          aria-label={`${product.name}. ${product.body}. ${product.explore}`} /> :
          <button className="glass-product-hit" onClick={() => select(index)} aria-pressed={active}>
            <span className="glass-accessible-label">{product.name} {cms.text("field_9df95ca6165be7d3")}{active ? cms.text("field_508457dea05708c6") : cms.text("field_d584df7212969e9c")}</span>
          </button>}
        {five && product.body && <div className={copyStyles.copy} data-card-copy data-no-word-reveal aria-hidden="true">
          <div className={copyStyles.title} data-card-title>{product.name}</div>
          {active && <p className={copyStyles.description}>{product.body}</p>}
          <div className={copyStyles.action} data-card-action>{product.explore} {cms.text("field_028813a441e9ed0f")}</div>
        </div>}
      </div>
    </Html>}
  </group>;
}

function GlassShadow({ active }: { active: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 768;
    const ctx = canvas.getContext("2d")!;
    ctx.shadowColor = "#67507866"; ctx.shadowBlur = 32; ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#675078"; ctx.beginPath(); ctx.roundRect(38, 40, 436, 680, 32); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.roundRect(38, 40, 436, 680, 32); ctx.fill();
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, active ? -.09 : -.03, -.17]}>
    <planeGeometry args={[3.65, 5.12]} />
    <meshBasicMaterial map={texture} transparent opacity={active ? 1 : .6} depthWrite={false} toneMapped={false} />
  </mesh>;
}

/* Original artwork participates in the mirrored card as well as the foreground. */
function CardArtwork({ product, active, reflected, opacity, hideLabel = false }: { product: GlassProduct; active: boolean; reflected: boolean; opacity: number; hideLabel?: boolean }) {
  const texture = useSafeTexture(product.image, true);
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    document.fonts.load('700 74px "Lumiq Manrope"').then(() => { if (alive) setFontReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const image = texture.image as HTMLImageElement;
  const aspect = image.width / image.height;
  // Keep every aspect ratio inside the artwork zone, above the DOM caption.
  const width = Math.min(product.body ? 2.35 : 2.55, (product.body ? 2.1 : 2.95) * aspect), height = width / aspect;
  const label = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = product.body ? 512 : 256;
    const ctx = canvas.getContext("2d")!;
    ctx.textAlign = "center"; ctx.fillStyle = active ? "#10243b" : "#233448";
    ctx.font = `700 96px ${fontReady ? '"Lumiq Manrope"' : 'Arial'}, sans-serif`;
    ctx.fillText(product.name, 512, 100);
    ctx.fillStyle = active ? "#35465c" : "#687286"; ctx.font = `${active ? 500 : 400} 52px Arial, sans-serif`;
    if (product.body) {
      const lines: string[] = []; let line = "";
      for (const word of product.body.match(/[^\s\u3000-\u9fff]+\s*|[\u3000-\u9fff]/gu) || []) {
        if (ctx.measureText(line + word).width > 930 && line) { lines.push(line.trim()); line = ""; }
        line += word;
      }
      if (line) lines.push(line.trim());
      lines.forEach((text, i) => ctx.fillText(text, 512, 190 + i * 62));
      ctx.fillText(`${product.explore}  ↗`, 512, 430);
    } else ctx.fillText(active ? "选中 · 70% 磨砂" : "未选中 · 38% 磨砂", 512, 192);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace;
    return map;
  }, [product, active, fontReady]);
  useEffect(() => () => label.dispose(), [label]);
  return <>
    <mesh position={[0, product.body ? .98 : .45, .24]} renderOrder={active ? 4 : 0}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial key={String(active)} map={texture} transparent opacity={(reflected ? .55 : 1) * opacity} userData={reflected ? { reflectionOpacity: .55 * opacity } : {}} depthWrite={false} toneMapped={false}
        onBeforeCompile={shader => {
          if (active) shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb = max(vec3(0.), (diffuseColor.rgb - .18) * 1.12 + .18) * 1.06;");
        }} />
    </mesh>
    {!hideLabel && <mesh position={[0, product.body ? -1.3 : -1.55, .24]} renderOrder={active ? 4 : 0}>
      <planeGeometry args={[2.8, product.body ? 1.4 : .7]} />
      <meshBasicMaterial map={label} transparent opacity={(reflected ? .55 : 1) * opacity} userData={reflected ? { reflectionOpacity: .55 * opacity } : {}} depthWrite={false} toneMapped={false} />
    </mesh>}
  </>;
}

function PearlFlow({ index, reflected, opacity, active }: { index: number; reflected: boolean; opacity: number; active: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, strength: { value: 1 }, glowWidth: { value: 1 }, reflectionFade: { value: 1 } }), []);
  useFrame((_, delta) => {
    if (!material.current) return;
    const live = material.current.uniforms;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) live.time.value += Math.min(delta, .05) / 22;
    live.strength.value = (reflected ? .55 : 1) * opacity * (active ? 2.4 : .85);
    live.glowWidth.value = active ? 2.8 : 1;
  });
  return <mesh position={[0, 0, .2]} renderOrder={3} raycast={() => {}}>
    <planeGeometry args={[4.85, 6.25]} />
    <shaderMaterial ref={material} transparent depthWrite={false} uniforms={uniforms}
      vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`varying vec2 vUv; uniform float time; uniform float strength; uniform float glowWidth; uniform float reflectionFade;
        void main(){
          vec2 p=(vUv-.5)*vec2(4.85,6.25);
          vec2 q=abs(p)-vec2(1.33,2.03);
          float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.295;
          float edge=1.-smoothstep(-.03,0.,d);
          float x=vUv.x+vUv.y*.42-.7-.38*sin(time);
          float band=exp(-x*x*30.);
          vec3 tint=mix(vec3(.78,.72,.94),vec3(.73,.88,.98),vUv.y);
          tint=mix(tint,vec3(1.,.82,.9),.5+.5*sin(time+vUv.y*3.));
          float rim=exp(-abs(d)*35.);
          float bloom=exp(-d*d/ (.022*glowWidth))*.48;
          float diffusion=exp(-d*d/ (.14*glowWidth))*.24;
          float inner=exp(-abs(d)*3.)*edge*.1;
          float alpha=min(.86,(rim*.22+bloom+diffusion+inner+edge*band*.05)*strength);
          gl_FragColor=vec4(mix(tint,vec3(1.),.78+.22*rim),alpha*reflectionFade);
        }`} />
  </mesh>;
}

/** Keep the DOM cards until the real renderer and product artwork can paint.
 * A successful capability probe does not guarantee Canvas can create a context. */
function CanvasReady({ onReady }: { onReady: () => void }) {
  const pool = useContext(TexturePool)!;
  const elapsed = useRef(0);
  const frames = useRef(0);
  const announced = useRef(false);
  const callback = useRef(onReady);
  callback.current = onReady;
  useFrame((_, delta) => {
    elapsed.current += delta;
    frames.current++;
    // Never gate the entire mirror on the slowest image. Late artwork fills in
    // on the same mirror surface; failed artwork retains a neutral texture.
    if (!announced.current && frames.current > 2 && pool.size > 0 &&
        ([...pool.values()].every(entry => entry.settled) || elapsed.current >= 1.2)) {
      announced.current = true;
      callback.current();
    }
  });
  return null;
}

// Render during interaction and settling only. The mirrored composition stays
// on the canvas while idle; scroll/resize/late textures explicitly wake it.
function InteractionFrames({ running, selected }: { running: boolean; selected: number }) {
  const { invalidate, size } = useThree();
  useEffect(() => {
    if (!running) return;
    let request = 0;
    let until = 0;
    const tick = (now: number) => {
      invalidate();
      if (now < until) request = requestAnimationFrame(tick);
      else request = 0;
    };
    const wake = () => {
      until = performance.now() + 1600;
      if (!request) request = requestAnimationFrame(tick);
    };
    const events = ["pointermove", "pointerdown", "pointerout", "scroll", "resize", "keydown"];
    events.forEach(name => window.addEventListener(name, wake, {passive:true, capture:true}));
    wake();
    return () => {
      cancelAnimationFrame(request);
      events.forEach(name => window.removeEventListener(name, wake, true));
    };
  }, [running, selected, size.width, size.height, invalidate]);
  return null;
}

export function GlassCanvas({ selected, select, products = demoProducts, sideView = false, content = true, carousel = false, running = true, onReady }: {
  selected: number; select: (index: number) => void; products?: GlassProduct[]; sideView?: boolean; content?: boolean; carousel?: boolean; running?: boolean; onReady?: () => void;
}) {
  const cms = useContentAdapter();
  const [pool] = useState(() => new Map<string, TextureEntry>());
  useEffect(() => () => {
    pool.forEach(entry => entry.texture?.dispose());
    pool.clear();
  }, [pool]);
  return <Canvas frameloop={running ? "demand" : "never"} camera={{ position: [0, 1.3, 36], fov: 12, near: .1, far: 100 }} dpr={1}
    gl={{ antialias: true, alpha: true, toneMapping: NoToneMapping }} fallback={carousel ? null : <p>{cms.text("field_33e42817ed9c66ca")}</p>}>
    {!carousel && <color attach="background" args={["#f5f3f9"]} />}
    <TexturePool.Provider value={pool}><InteractionFrames running={running} selected={selected} /><Suspense fallback={null}>{onReady && <CanvasReady onReady={onReady} />}<GlassScene selected={selected} select={select} sideView={sideView} content={content} products={products} carousel={carousel} /></Suspense></TexturePool.Provider>
  </Canvas>;
}

export default function GlassPreview() {
  const [selected, select] = useState(1);
  const [sideView, setSideView] = useState(false);
  const [content, setContent] = useState(true);
  return <main className="glass-preview">
    <header><p>材质样板 · 尚未替换首页</p><Heading as="h1">玻璃、微光与倒影。</Heading>
      <p>选中 70% 磨砂 · 未选中 38% 磨砂。悬停或点击切换。</p></header>
    <div className="glass-preview-controls">
      {demoProducts.map((p, i) => <button key={p.name} aria-pressed={selected === i} onClick={() => select(i)}>{p.name}</button>)}
      <button aria-pressed={sideView} onClick={() => setSideView(!sideView)}>侧面查看厚度</button>
      <button aria-pressed={!content} onClick={() => setContent(!content)}>只看玻璃</button>
    </div>
    <div className="glass-preview-scroll"><div className="glass-preview-canvas">
      <GlassCanvas selected={selected} select={select} sideView={sideView} content={content} />
    </div></div>
  </main>;
}

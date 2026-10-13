"use client";

import {Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {Environment, Lightformer, MeshTransmissionMaterial} from "@react-three/drei";
import {CanvasTexture, LinearToneMapping, OrthographicCamera, SRGBColorSpace} from "three";
import {createPillowGeometry} from "@/lib/pillow-glass";
import {glassFlowPhase} from "@/lib/glass-flow";
import {decorativeGlassEvents, glassIsVisible} from "@/lib/glass-visibility";

let webglAvailable: boolean | undefined;
function canRenderGlass() {
  if (webglAvailable !== undefined) return webglAvailable;
  try {
    const context = document.createElement('canvas').getContext('webgl2', {alpha: true, antialias: true});
    webglAvailable = Boolean(context);
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglAvailable = false;
  }
  return webglAvailable;
}

function paintStudio(canvas: HTMLCanvasElement, phase: number) {
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#e5e8ed';
  context.fillRect(0, 0, 512, 512);
  // Unequal overlapping washes, with incommensurate drift frequencies.
  // No repeating circular sweep or granular noise in the frosted face.
  const washes = [
    [140, 145, 235, .75, 'rgba(96,115,137,.32)'],
    [325, 255, 180, 2.1, 'rgba(154,186,218,.28)'],
    [110, 425, 185, 4.5, 'rgba(255,255,255,.85)'],
    [455, 110, 240, 1.6, 'rgba(255,255,255,.68)'],
    [300, 390, 200, 3.3, 'rgba(199,185,220,.28)'],
  ] as const;
  for (const [cx, cy, radius, offset, color] of washes) {
    const x = cx + Math.sin(phase * .63 + offset) * 65 + Math.sin(phase * 1.13 + offset) * 18;
    const y = cy + Math.cos(phase * .79 + offset) * 55;
    context.save();
    context.translate(x, y);
    context.rotate(offset + Math.sin(phase * .31) * .2);
    context.scale(1.3, .78);
    const light = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    light.addColorStop(0, color);
    light.addColorStop(1, color.replace(/,[.\d]+\)$/, ',0)'));
    context.fillStyle = light;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();
  }
}

// One continuous solid, not separate CSS bands. The neutral transmission
// background is a studio approximation; it does not capture the live DOM.
function GlassSlab({running, variant}: {running: boolean; variant: number}) {
  const {size, camera, invalidate} = useThree();
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(invalidate, 1000 / (variant ? 8 : 12));
    return () => window.clearInterval(timer);
  }, [running, invalidate, variant]);
  // Commit the projection and geometry together. R3F's automatic projection
  // resize can otherwise expose the old slab in the new viewport for a frame.
  useLayoutEffect(() => {
    const lens = camera as OrthographicCamera;
    lens.left = -size.width / 200;
    lens.right = size.width / 200;
    lens.top = size.height / 200;
    lens.bottom = -size.height / 200;
    lens.updateProjectionMatrix();
    invalidate();
  }, [size.width, size.height, camera, invalidate]);
  const geometry = useMemo(() => createPillowGeometry(
    Math.max(.4, size.width / 100 - .04), Math.max(.4, size.height / 100 - .04),
  ), [size.width, size.height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const backdrop = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    paintStudio(canvas, glassFlowPhase(0, variant));
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [variant]);
  useEffect(() => () => backdrop.dispose(), [backdrop]);
  const lastPaint = useRef(-1);
  useFrame(({clock}) => {
    const elapsed = clock.getElapsedTime();
    if (elapsed - lastPaint.current < 1 / 20) return;
    lastPaint.current = elapsed;
    paintStudio(backdrop.image as HTMLCanvasElement, glassFlowPhase(elapsed, variant));
    backdrop.needsUpdate = true;
  });
  return <>
    <ambientLight intensity={.35} />
    <Environment resolution={128}>
      <Lightformer form="circle" position={[-3, 3, 4]} rotation={[0, -.35, -.35]} scale={[3.5, 6, 1]} intensity={2.4} />
      <Lightformer position={[4, 1, 3]} rotation={[0, .45, .4]} scale={[1.5, 5, 1]} intensity={1.6} />
      <Lightformer form="circle" position={[-2, -4, 3]} scale={[4, 2, 1]} intensity={2} />
    </Environment>
    <mesh geometry={geometry}>
      <MeshTransmissionMaterial background={backdrop} color="#ffffff"
        transmission={.96} roughness={.3} thickness={.7} ior={1.43}
        clearcoat={.4} clearcoatRoughness={.26} envMapIntensity={.9}
        chromaticAberration={.004} distortion={0} temporalDistortion={0}
        samples={8} resolution={256} />
    </mesh>
  </>;
}

class MaterialFallback extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() { return this.state.failed ? <FrostedFallback /> : this.props.children; }
}

function FrostedFallback() {
  return <div style={{position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'rgba(237,240,245,.7)', backdropFilter: 'blur(30px)'}} />;
}

export default function GlassCardMaterial({animated = false, variant = 0}: {animated?: boolean; variant?: number}) {
  const container = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [supported, setSupported] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => setRunning(visible && !reduced.matches && !document.hidden);
    // Keep the frosted fallback while offscreen. Three hidden transmission
    // canvases otherwise allocate/reproject together on every viewport resize.
    const observer = new IntersectionObserver(([entry]) => {
      visible = glassIsVisible(entry);
      if (visible) setSupported(canRenderGlass());
      setInView(visible);
      update();
    }, {rootMargin: '0px', threshold: [0, .2]});
    if (container.current) observer.observe(container.current);
    reduced.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  return <div ref={container} className="prod-glass-material" aria-hidden="true" style={{position: "absolute", inset: 0, borderRadius: 'inherit', pointerEvents: "none", zIndex: 0}}>
    {inView && supported ? <MaterialFallback>
      <Canvas orthographic camera={{position: [0, 0, 10], manual: true, near: .1, far: 30}}
        events={decorativeGlassEvents}
        resize={{scroll: false, debounce: {scroll: 0, resize: 50}, offsetSize: true}}
        frameloop="demand" dpr={variant ? 1 : [1, 1.5]} gl={{alpha: true, antialias: true, toneMapping: LinearToneMapping, toneMappingExposure: 1.3}}
        fallback={<FrostedFallback />}>
        <GlassSlab running={running && animated} variant={variant} />
      </Canvas>
    </MaterialFallback> : <FrostedFallback />}
    <style jsx global>{`
      .prod-glass-material canvas { width: 100% !important; height: 100% !important; }
      .prod-glass-material { filter: drop-shadow(0 12px 16px rgba(37,43,52,.16)); }
    `}</style>
  </div>;
}

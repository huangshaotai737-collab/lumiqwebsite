import type {ReactNode} from "react";
import Heading from "@/components/Heading";
import Image from "@/components/content/ContentImage";

export type ProductVisual = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
  position?: string;
  unoptimized?: boolean;
};
export type ProductIndexItem = {
  eyebrow?: string;
  title: string;
  body?: ReactNode;
  href?: string;
};
export type ProductFeatureProps = {
  id?: string;
  className?: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  items: ProductIndexItem[];
  image?: ProductVisual;
  media?: ReactNode;
  mediaLeft?: boolean;
  children?: ReactNode;
  navigationLabel?: string;
};

export function ProductFeatureHeading({id,eyebrow,title,intro}:Pick<ProductFeatureProps,"id"|"eyebrow"|"title"|"intro">) {
  return <header className="pd-section-heading pd-feature-heading is-center">
    {eyebrow && <p className="pd-eyebrow">{eyebrow}</p>}
    <Heading as="h2" id={id}>{title}</Heading>
    {intro && <div className="pd-section-intro">{intro}</div>}
  </header>;
}

export function ProductFeatureRows({items, navigationLabel}: {
  items: ProductIndexItem[];
  navigationLabel?: string;
}) {
  const rows = (
    <ol className="pd-feature-rows">
      {items.map((item, index) => (
        <li className="pd-feature-row" key={`${item.title}-${index}`}>
          <span className="pd-feature-number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="pd-feature-copy">
            {item.eyebrow && <p className="pd-feature-label">{item.eyebrow}</p>}
            <Heading as="h3">
              {item.href ? (
                <a href={item.href}>{item.title}<span aria-hidden="true"> ↗</span></a>
              ) : item.title}
            </Heading>
            {item.body && <div className="pd-feature-description">{item.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
  return navigationLabel ? <nav aria-label={navigationLabel}>{rows}</nav> : rows;
}

export default function ProductFeatureSection({id,className="",eyebrow,title,intro,items,image,media,mediaLeft=false,children,navigationLabel}:ProductFeatureProps) {
  return <section className={`pd-floor pd-unified-section pd-feature-section ${className}`} id={id} aria-labelledby={id ? `${id}-title`:undefined} tabIndex={id ? -1:undefined}>
    <div className="pd-shell">
      <ProductFeatureHeading id={id ? `${id}-title`:undefined} eyebrow={eyebrow} title={title} intro={intro}/>
      <div className={`pd-unified-layout${mediaLeft ? " is-media-left":""}`}>
        <div className="pd-unified-copy"><ProductFeatureRows items={items} navigationLabel={navigationLabel}/>{children}</div>
        {media ? <div className="pd-unified-visual">{media}</div> : image && <figure className="pd-unified-visual">
          <Image src={image.src} alt={image.alt} width={1600} height={1200} sizes="(max-width: 900px) 100vw, 46vw" unoptimized={image.unoptimized} style={{objectFit:image.fit??"contain",objectPosition:image.position??"center"}}/>
        </figure>}
      </div>
    </div>
  </section>;
}

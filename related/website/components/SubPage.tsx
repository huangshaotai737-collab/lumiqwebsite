import Heading from "@/components/Heading";
import type { ReactNode } from "react";

interface SubPageProps {
  className?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

export default function SubPage({ className, eyebrow, title, intro, children }: SubPageProps) {
  return (
    <main className={`subpage${className ? ` ${className}` : ""}`}>
      <section className="subpage-hero">
        <div className="container">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <Heading as="h1" className="serif subpage-title">{title}</Heading>
          {intro && <p className="subpage-intro">{intro}</p>}
        </div>
      </section>
      <section className="subpage-body">
        <div className="container prose">{children}</div>
      </section>
    </main>
  );
}

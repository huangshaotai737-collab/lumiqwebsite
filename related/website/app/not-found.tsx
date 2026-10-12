import Heading from "@/components/Heading";
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#fff" }}
    >
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--gold)",
          }}
        >
          Lost in the story
        </span>
        <Heading as="h1"
          className="serif"
          style={{
            fontSize: "clamp(5rem, 15vw, 8rem)",
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1,
            margin: "0.75rem 0 0",
          }}
        >
          404<span style={{ color: "var(--gold)" }}>.</span>
        </Heading>
        <Heading as="h2"
          className="serif"
          style={{
            marginTop: "1rem",
            fontSize: "1.35rem",
            color: "var(--ink)",
          }}
        >
          This page wandered off.
        </Heading>
        <p
          style={{
            marginTop: "0.6rem",
            fontSize: "0.95rem",
            color: "var(--ink-3)",
            lineHeight: 1.7,
          }}
        >
          The page you are looking for does not exist or has moved.
        </p>
        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            gap: "1.5rem",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/en" className="btn btn-navy">
            Go home
          </Link>
          <Link
            href="/en/products"
            style={{
              color: "var(--ink-2)",
              fontSize: "0.95rem",
              borderBottom: "1px solid var(--ink-4)",
              paddingBottom: 2,
            }}
          >
            Browse the products
          </Link>
        </div>
      </div>
    </div>
  );
}

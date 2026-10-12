import { useTranslations } from "next-intl";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

export default function PrintProductPage() {
  const t = useTranslations("Book");

  return (
    <ProductDetailTemplate
      slug="print"
      accent="#336a9d"
      accentSoft="#e1edf5"
      backLabel={t("all")}
      productName="Lumiq Print"
      title={`${t("titleBefore")} ${t("titleEm")}`}
      lede={t("lede")}
      conceptNotice={t("conceptNotice")}
      priceLabel="USD 69"
      ctaLabel={t("buy")}
      heroImage={{
        src: "/assets/products/lumiq-print.png",
        alt: t("alt"),
        fit: "contain",
        unoptimized: true,
      }}
      story={{
        eyebrow: t("eyebrow"),
        title: t("sectionTitle"),
        body: t("body"),
        image: {
          src: "/assets/print-detail/consistent-20260907/gift.webp",
          alt: t("alt"),
          unoptimized: true,
        },
        bullets: [1, 2, 3, 4].map((number) => t(`s${number}`)),
      }}
      scenesEyebrow={t("eyebrow")}
      scenesTitle={t("detailsTitle")}
      scenes={[
        {
          eyebrow: "01",
          title: t("titleEm"),
          body: t("lede"),
          image: {
            src: "/assets/print-detail/consistent-20260907/craft.webp",
            alt: t("alt"),
            unoptimized: true,
          },
        },
        {
          eyebrow: "02",
          title: t("sectionTitle"),
          body: t("body"),
          image: {
            src: "/assets/print-detail/consistent-20260907/reading.webp",
            alt: t("alt"),
            unoptimized: true,
          },
        },
      ]}
      features={{
        eyebrow: t("eyebrow"),
        title: t("detailsTitle"),
        intro: t("body"),
        items: [1, 2, 3, 4].map((number) => ({
          title: t(`s${number}`),
          body: t(`s${number}Body`),
        })),
        image: {
          src: "/assets/print-detail/consistent-20260907/pages.webp",
          alt: t("alt"),
          unoptimized: true,
        },
      }}
      darkSection={{
        eyebrow: t("eyebrow"),
        title: t("sectionTitle"),
        intro: t("body"),
        items: [1, 2, 3, 4].map((number) => ({
          title: t(`s${number}`),
          body: t(`s${number}Body`),
        })),
        image: {
          src: "/assets/products/lumiq-print.png",
          alt: t("alt"),
          fit: "contain",
          unoptimized: true,
        },
      }}
      finalTitle={`${t("titleBefore")} ${t("titleEm")}`}
      finalBody={t("lede")}
    />
  );
}

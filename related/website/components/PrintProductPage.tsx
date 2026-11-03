import {readContentAdapter} from "@/lib/content/server-adapter";
import { getTranslations } from "next-intl/server";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

export default async function PrintProductPage() {
  const cms = await readContentAdapter();
  const t = await getTranslations("Book");
  const presentation = await getTranslations("BrandPresentation.print");

  return (
    <ProductDetailTemplate
      slug="print"
      accent="#336a9d"
      accentSoft="#e1edf5"
      backLabel={t("all")}
      productName={cms.snapshot.products.print.name}
      title={`${t("titleBefore")} ${t("titleEm")}`}
      lede={t("lede")}
      conceptNotice={t("conceptNotice")}
      priceLabel="USD 69"
      ctaLabel={t("buy")}
      heroImage={{
        src: cms.url("/assets/products/lumiq-print.png"),
        alt: t("alt"),
        fit: "contain",
        unoptimized: true,
      }}
      story={{
        eyebrow: t("eyebrow"),
        title: t("sectionTitle"),
        body: t("body"),
        image: {
          src: cms.url("/assets/print-detail/consistent-20260907/gift.webp"),
          alt: t("alt"),
          unoptimized: true,
        },
        items: [1,4].map(number=>({title:t(`s${number}`),body:t(`s${number}Body`)})),
      }}
      scenes={[]}
      features={{
        eyebrow: t("eyebrow"),
        title: t("detailsTitle"),
        intro: presentation("craftIntro"),
        items: [2, 3].map((number) => ({
          title: t(`s${number}`),
          body: t(`s${number}Body`),
        })),
        image: {
          src: cms.url("/assets/print-detail/consistent-20260907/pages.webp"),
          alt: t("alt"),
          unoptimized: true,
        },
      }}
      finalTitle={`${t("titleBefore")} ${t("titleEm")}`}
      finalBody={t("lede")}
    />
  );
}

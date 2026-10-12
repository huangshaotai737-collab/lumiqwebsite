import Heading from "@/components/Heading";
import SubPage from "@/components/SubPage";
import {useTranslations} from "next-intl";

export default function AboutPage() {
  const t = useTranslations("About");

  return (
    <SubPage
      className="about-page"
      eyebrow={t("eyebrow")}
      title={t("title")}
      intro={t("intro")}
    >
      <p>{t.rich("p1", {strong: (chunks) => <strong>{chunks}</strong>})}</p>

      <p>{t("p2")}</p>

      <blockquote>{t("quote1")}</blockquote>

      <p>{t("p3")}</p>

      <Heading as="h2">{t("whyTitle")}</Heading>
      <p>{t.rich("whyP1", {strong: (chunks) => <strong> {chunks}</strong>})}</p>

      <p>{t("whyP2")}</p>

      <Heading as="h2">{t("parentsTitle")}</Heading>
      <p>{t.rich("parentsP", {strong: (chunks) => <strong> {chunks}</strong>})}</p>

      <Heading as="h2">{t("visionTitle")}</Heading>
      <p>{t.rich("visionP", {em: (chunks) => <em>{chunks}</em>})}</p>

      <blockquote>{t("quote2")}</blockquote>
    </SubPage>
  );
}

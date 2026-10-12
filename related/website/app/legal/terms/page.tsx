import Heading from "@/components/Heading";
import SubPage from "@/components/SubPage";
import DraftNotice from "@/components/DraftNotice";
import {useTranslations} from "next-intl";

export default function TermsPage() {
  const t = useTranslations("Legal");
  return (
    <SubPage className="terms-page" eyebrow={t("eyebrow")} title={t("terms.title")} intro={t("terms.intro")}>
      <DraftNotice>{t("draft")}</DraftNotice>
      <p>{t("terms.p1")}</p>
      <Heading as="h2">{t("terms.h1")}</Heading>
      <p>{t("terms.p2")}</p>
      <Heading as="h2">{t("terms.h2")}</Heading>
      <p>{t("terms.p3")}</p>
      <Heading as="h2">{t("terms.h3")}</Heading>
      <p>{t("terms.p4")}</p>
      <Heading as="h2">{t("terms.h4")}</Heading>
      <p>{t("terms.p5")}</p>
    </SubPage>
  );
}

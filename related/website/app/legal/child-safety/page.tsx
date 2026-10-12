import Heading from "@/components/Heading";
import SubPage from "@/components/SubPage";
import DraftNotice from "@/components/DraftNotice";
import {useTranslations} from "next-intl";

export default function ChildSafetyPage() {
  const t = useTranslations("Legal");
  return (
    <SubPage className="child-safety-page" eyebrow={t("eyebrow")} title={t("childSafety.title")} intro={t("childSafety.intro")}>
      <DraftNotice>{t("draft")}</DraftNotice>
      <p>{t("childSafety.p1")}</p>
      <Heading as="h2">{t("childSafety.h1")}</Heading>
      <p>{t("childSafety.p2")}</p>
      <Heading as="h2">{t("childSafety.h2")}</Heading>
      <p>{t("childSafety.p3")}</p>
      <Heading as="h2">{t("childSafety.h3")}</Heading>
      <p>{t("childSafety.p4")}</p>
      <Heading as="h2">{t("childSafety.h4")}</Heading>
      <p>{t("childSafety.p5")}</p>
      <Heading as="h2">{t("childSafety.h5")}</Heading>
      <p>{t("childSafety.p6")}</p>
    </SubPage>
  );
}

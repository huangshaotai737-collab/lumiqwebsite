import Heading from "@/components/Heading";
import SubPage from "@/components/SubPage";
import DraftNotice from "@/components/DraftNotice";
import {useTranslations} from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("Legal");
  return (
    <SubPage className="privacy-page" eyebrow={t("eyebrow")} title={t("privacy.title")} intro={t("privacy.intro")}>
      <DraftNotice>{t("draft")}</DraftNotice>
      <Heading as="h2">{t("privacy.waitlistHeading")}</Heading>
      <p>{t("privacy.waitlistBody")}</p>
      <p>{t("privacy.p1")}</p>
      <Heading as="h2">{t("privacy.h1")}</Heading>
      <p>{t("privacy.p2")}</p>
      <Heading as="h2">{t("privacy.h2")}</Heading>
      <p>{t("privacy.p3")}</p>
      <Heading as="h2">{t("privacy.h3")}</Heading>
      <p>{t("privacy.p4")}</p>
    </SubPage>
  );
}

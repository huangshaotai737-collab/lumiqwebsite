import Heading from "@/components/Heading";
import SubPage from "@/components/SubPage";
import DraftNotice from "@/components/DraftNotice";
import {useTranslations} from "next-intl";

export default function CookiesPage() {
  const t = useTranslations("Legal");
  return (
    <SubPage className="cookies-page" eyebrow={t("eyebrow")} title={t("cookies.title")} intro={t("cookies.intro")}>
      <DraftNotice>{t("draft")}</DraftNotice>
      <p>{t("cookies.p1")}</p>
      <Heading as="h2">{t("cookies.h1")}</Heading>
      <p>{t("cookies.p2")}</p>
      <Heading as="h2">{t("cookies.h2")}</Heading>
      <p>{t("cookies.p3")}</p>
      <Heading as="h2">{t("cookies.h3")}</Heading>
      <p>{t("cookies.p4")}</p>
    </SubPage>
  );
}

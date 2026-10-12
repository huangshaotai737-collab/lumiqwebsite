import Heading from "@/components/Heading";
import SubPage from "@/components/SubPage";
import DraftNotice from "@/components/DraftNotice";
import {useTranslations} from "next-intl";

export default function ContactPage() {
  const t = useTranslations("Contact");
  const channels = [
    { label: t("general"), email: "hello@lumiqstudio.com" },
    { label: t("support"), email: "support@lumiqstudio.com" },
    { label: t("press"), email: "press@lumiqstudio.com" },
    { label: t("partnerships"), email: "partners@lumiqstudio.com" },
  ];

  return (
    <SubPage
      className="contact-page"
      eyebrow={t("eyebrow")}
      title={t("title")}
      intro={t("intro")}
    >
      {channels.map((c) => (
        <div key={c.email} className="contact-card">
          <div style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "0.35rem" }}>
            {c.label}
          </div>
          <a href={`mailto:${c.email}`} style={{ fontSize: "1.15rem", fontWeight: 600 }}>
            {c.email}
          </a>
        </div>
      ))}

      <Heading as="h2">{t("mailing")}</Heading>
      <DraftNotice compact>{t("addressPending")}</DraftNotice>
      <p>
        LumiqStudio (Arpha Inc.)<br />
        {t("address")}
      </p>
    </SubPage>
  );
}

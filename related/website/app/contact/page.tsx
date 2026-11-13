import {readContentAdapter} from "@/lib/content/server-adapter";
import Heading from "@/components/Heading";
import SubPage from "@/components/SubPage";
import DraftNotice from "@/components/DraftNotice";
import {getTranslations} from "next-intl/server";

export default async function ContactPage() {
  const cms = await readContentAdapter();
  const t = await getTranslations("Contact");
  const channels = [
    { label: t("general"), email: cms.text("field_23cd241d015790f4") },
    { label: t("support"), email: cms.value("settings.supportEmail") },
    { label: t("press"), email: cms.text("field_3c5de26aeecac7ba") },
    { label: t("partnerships"), email: cms.text("field_b560ef7d1f4e4007") },
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
        {cms.text("field_ac77db89fd52c5f8")}<br />
        {t("address")}
      </p>
    </SubPage>
  );
}

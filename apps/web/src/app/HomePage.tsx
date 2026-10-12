import { useTranslation } from "react-i18next";

/** Placeholder home page until the screens are designed from DESIGN.md. */
export function HomePage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-prose px-4 py-24">
      <h1 className="text-3xl font-semibold">{t("app.name")}</h1>
      <p className="mt-4 text-base leading-relaxed">{t("app.tagline")}</p>
    </main>
  );
}

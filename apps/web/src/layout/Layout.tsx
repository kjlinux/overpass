import type { Language } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Footer } from "./Footer";
import { Header } from "./Header";

export type LayoutProps = { language: Language; children: ComponentChildren };

/** Skip link, masthead, the ruled main column and the footer. */
export function Layout({ language, children }: LayoutProps): JSX.Element {
  const { t } = useTranslation("layout");
  return (
    <div class="flex min-h-screen flex-col">
      <a
        href="#main"
        class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-accent focus:bg-paper focus:px-4 focus:py-3"
      >
        {t("skipToContent")}
      </a>
      <Header language={language} />
      <main
        id="main"
        tabIndex={-1}
        class="mx-auto w-full max-w-frame flex-1 px-4 md:px-6 lg:border-x lg:border-rule lg:px-8"
      >
        {children}
      </main>
      <Footer language={language} />
    </div>
  );
}

import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, cx } from "../components/ui";
import { AccountLinks } from "./AccountLinks";
import { LanguageSelect } from "./LanguageSelect";
import { localizedPath, navItems } from "./nav";
import { SearchTrigger } from "./SearchTrigger";
import { ThemeSwitch } from "./ThemeSwitch";

const frame = "mx-auto max-w-frame px-4 md:px-6 lg:px-8";
const navLink =
  "flex min-h-tap items-center px-4 font-medium text-ink no-underline hover:underline";

type Props = { language: Language };

const toggleId = "site-nav-toggle";

/** Escape closes an open menu; any other key, or a closed menu, is left alone. */
export function closesMenu(open: boolean, key: string): boolean {
  return open && key === "Escape";
}

function NavList({ language }: Props): JSX.Element {
  const { t } = useTranslation("layout");
  const { path } = useLocation();
  return (
    <ul class={cx(frame, "flex flex-col lg:flex-row lg:px-0")}>
      {navItems.map((item) => {
        const href = localizedPath(language, item.path);
        const current = path === href || path.startsWith(`${href}/`);
        return (
          <li key={item.key} class="border-b border-rule lg:border-b-0 lg:border-r">
            <a
              href={href}
              aria-current={current ? "page" : undefined}
              class={cx(navLink, current && "shadow-[inset_0_-2px_0_var(--color-accent)]")}
            >
              {t(`nav.${item.key}`)}
            </a>
          </li>
        );
      })}
      <li class="border-b border-rule lg:ml-auto lg:border-b-0 lg:border-l">
        <ThemeSwitch class="w-full justify-start px-4" />
      </li>
      <AccountLinks language={language} inMenu />
    </ul>
  );
}

/** Open state of the mobile menu; Escape closes it and gives focus back to its toggle. */
function useMenu() {
  const [open, setOpen] = useState(false);
  const onKeyDown = (event: KeyboardEvent) => {
    if (!closesMenu(open, event.key)) return;
    setOpen(false);
    document.getElementById(toggleId)?.focus();
  };
  return { open, setOpen, onKeyDown };
}

/** Masthead: wordmark row with tools, then the navigation on its own ruled row. */
export function Header({ language }: Props): JSX.Element {
  const { t } = useTranslation("layout");
  const { open, setOpen, onKeyDown } = useMenu();
  return (
    <header class="border-b border-rule bg-paper" onKeyDown={onKeyDown}>
      <div class={cx(frame, "flex min-h-16 items-center justify-between gap-4")}>
        <a
          href={localizedPath(language, "/")}
          class="py-3 text-[22px] font-bold leading-none tracking-tight text-ink no-underline hover:underline"
        >
          {t("wordmark")}
        </a>
        <div class="flex items-center gap-2">
          <SearchTrigger language={language} />
          <LanguageSelect language={language} />
          <AccountLinks language={language} inMenu={false} />
          <Button
            id={toggleId}
            class="lg:hidden"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? t("closeMenu") : t("menu")}
          </Button>
        </div>
      </div>
      <nav
        id="site-nav"
        aria-label={t("mainNavigation")}
        class={cx("border-t border-rule", open ? "block" : "hidden lg:block")}
      >
        <NavList language={language} />
      </nav>
    </header>
  );
}

import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { Button, ButtonLink } from "../components/ui";
import { useSession } from "../session";
import { localizedPath } from "./nav";

const navLink =
  "flex min-h-tap items-center px-4 font-medium text-ink no-underline hover:underline";

type Props = { language: Language; inMenu: boolean };
type Link = { key: string; path: string };

const memberLinks: Link[] = [
  { key: "dashboard", path: "/dashboard" },
  { key: "settings", path: "/settings" },
];
const visitorLinks: Link[] = [{ key: "signIn", path: "/sign-in" }];

/** The closing action: sign up for a visitor, sign out for a member. */
function LastAction({ language, inMenu }: Props): JSX.Element {
  const { t } = useTranslation("layout");
  const { me, signOut } = useSession();
  const { route } = useLocation();
  const spacing = inMenu ? "m-4" : "";
  if (me === null || me === undefined) {
    return (
      <ButtonLink href={localizedPath(language, "/sign-up")} class={spacing}>
        {t("signUp")}
      </ButtonLink>
    );
  }
  const leave = () => {
    void signOut().then(() => {
      route(localizedPath(language, "/"));
    });
  };
  return (
    <Button onClick={leave} class={spacing}>
      {t("signOut")}
    </Button>
  );
}

/** Sign-in and sign-up for visitors; dashboard, settings and sign-out for members. */
export function AccountLinks({ language, inMenu }: Props): JSX.Element {
  const { t } = useTranslation("layout");
  const { me } = useSession();
  const links = me === null || me === undefined ? visitorLinks : memberLinks;
  const href = (link: Link) => localizedPath(language, link.path);
  if (inMenu) {
    return (
      <>
        {links.map((link) => (
          <li key={link.key} class="border-b border-rule lg:hidden">
            <a href={href(link)} class={navLink}>
              {t(link.key)}
            </a>
          </li>
        ))}
        <li class="lg:hidden">
          <LastAction language={language} inMenu />
        </li>
      </>
    );
  }
  return (
    <div class="hidden items-center gap-2 lg:flex">
      {links.map((link) => (
        <a key={link.key} href={href(link)} class="inline-flex min-h-tap items-center px-2">
          {t(link.key)}
        </a>
      ))}
      <LastAction language={language} inMenu={false} />
    </div>
  );
}

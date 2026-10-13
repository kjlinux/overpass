import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { PageSkeleton } from "../app/PageSkeleton";
import { useLanguage } from "../app/useLanguage";
import { Button } from "../components/ui";
import { FormAlert } from "../forms/FormAlert";
import { localizedPath } from "../layout/nav";
import { networkErrorCode } from "./api";
import { useSession } from "./SessionContext";

type Props = { children: (me: Me) => JSX.Element };

/** An unreachable API is not a sign-out: say so and offer a retry instead of redirecting. */
function Unavailable({ retry }: { retry: () => void }): JSX.Element {
  const { t } = useTranslation("ui");
  return (
    <div class="flex flex-col items-start gap-4 py-12">
      <FormAlert error={{ code: networkErrorCode, message: "" }} />
      <Button onClick={retry}>{t("retry")}</Button>
    </div>
  );
}

/** Renders its children for a signed-in member, otherwise sends them to sign in and back. */
export function RequireSession({ children }: Props): JSX.Element {
  const { me, unavailable, refresh } = useSession();
  const { route, url } = useLocation();
  const language = useLanguage();
  const ownUrl = useRef(url);
  useEffect(() => {
    // A page still shown while the next one loads must not redirect for the next URL.
    if (me !== null || url !== ownUrl.current) return;
    route(`${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`, true);
  }, [me, route, url, language]);
  if (unavailable) return <Unavailable retry={() => void refresh()} />;
  return me === null || me === undefined ? <PageSkeleton /> : children(me);
}

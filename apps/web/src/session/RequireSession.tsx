import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { PageSkeleton } from "../app/PageSkeleton";
import { useLanguage } from "../app/useLanguage";
import { localizedPath } from "../layout/nav";
import { useSession } from "./SessionContext";

type Props = { children: (me: Me) => JSX.Element };

/** Renders its children for a signed-in member, otherwise sends them to sign in and back. */
export function RequireSession({ children }: Props): JSX.Element {
  const { me } = useSession();
  const { route, url } = useLocation();
  const language = useLanguage();
  useEffect(() => {
    if (me !== null) return;
    route(`${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`, true);
  }, [me, route, url, language]);
  return me === null || me === undefined ? <PageSkeleton /> : children(me);
}

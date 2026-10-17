import type { RouteDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate } from "./format";

/** The sandbox module has shipped. */
const testTrackReady: boolean = true;

const blocked =
  "aria-disabled:cursor-not-allowed aria-disabled:border-rule aria-disabled:bg-surface aria-disabled:text-ink-2";

function TestAction({ route }: { route: RouteDetail }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const service = route.service.name;
  if (testTrackReady && route.service.simulated) {
    const href = localizedPath(language, `/sandbox?service=${route.service.slug}`);
    return (
      <ButtonLink variant="primary" class="w-full" href={href}>
        {t("detail.test")}
      </ButtonLink>
    );
  }
  const note = route.service.simulated ? "detail.testSoon" : "detail.testNone";
  return (
    <div class="flex flex-col gap-2">
      <Button
        variant="primary"
        class={`w-full ${blocked}`}
        aria-disabled="true"
        aria-describedby="test-note"
      >
        {t("detail.test")}
      </Button>
      <p id="test-note" class="text-caption text-ink-2">
        {t(note, { service })}
      </p>
    </div>
  );
}

function verifyNote(route: RouteDetail, language: string): { key: string; date?: string } {
  const { eligibility, nextCheckAt } = route.viewer;
  if (eligibility === "own_route") return { key: "detail.verifyOwn" };
  if (eligibility === "too_soon" && nextCheckAt !== null) {
    return { key: "detail.verifyTooSoon", date: formatDate(nextCheckAt, language) };
  }
  return { key: "detail.verifyNote" };
}

/** Disabled but still focusable, so a keyboard user reaches the reason it is disabled. */
function VerifyAction(props: { route: RouteDetail; onVerify: () => void }): JSX.Element {
  const { route, onVerify } = props;
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const { url } = useLocation();
  if (route.viewer.eligibility === "anonymous") {
    const href = `${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`;
    return (
      <ButtonLink class="w-full" href={href}>
        {t("detail.verifySignIn")}
      </ButtonLink>
    );
  }
  const allowed = route.viewer.eligibility === "allowed";
  const note = verifyNote(route, language);
  return (
    <div class="flex flex-col gap-2">
      <Button
        class={`w-full ${blocked}`}
        aria-disabled={allowed ? undefined : "true"}
        aria-describedby="verify-note"
        onClick={allowed ? onVerify : undefined}
      >
        {t("detail.verify")}
      </Button>
      <p id="verify-note" class="text-caption text-ink-2">
        {t(note.key, { date: note.date })}
      </p>
    </div>
  );
}

export type RouteActionsProps = { route: RouteDetail; onVerify: () => void; onRemove: () => void };

/** Tester is the primary action of the page; editing tools appear for the author only. */
export function RouteActions({ route, onVerify, onRemove }: RouteActionsProps): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  return (
    <div class="flex flex-col gap-4">
      <TestAction route={route} />
      <VerifyAction route={route} onVerify={onVerify} />
      {route.viewer.isAuthor ? (
        <div class="flex flex-wrap gap-2 border-t border-rule pt-4">
          <ButtonLink variant="ghost" href={localizedPath(language, `/routes/${route.id}/edit`)}>
            {t("detail.edit")}
          </ButtonLink>
          <Button variant="ghost" onClick={onRemove}>
            {t("detail.remove")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

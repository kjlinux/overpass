import type { ApiError, SimulatorVote as Vote } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { localizedPath } from "../../layout";
import { apiRequest, useSession } from "../../session";
import { useApi } from "../routes";

function SignInToVote(): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  const { url } = useLocation();
  const href = `${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`;
  return <ButtonLink href={href}>{t("vote.signIn")}</ButtonLink>;
}

/** One vote per account; voting again keeps one vote, withdrawing removes it. */
function VoteButton(props: {
  vote: Vote;
  onChange: (method: "PUT" | "DELETE") => void;
  busy: boolean;
}) {
  const { t } = useTranslation("requests");
  const { vote, onChange, busy } = props;
  if (vote.voted) {
    return (
      <Button
        loading={busy}
        onClick={() => {
          onChange("DELETE");
        }}
      >
        {t("vote.withdraw")}
      </Button>
    );
  }
  return (
    <Button
      variant="primary"
      loading={busy}
      onClick={() => {
        onChange("PUT");
      }}
    >
      {t("vote.ask")}
    </Button>
  );
}

export function SimulatorVote({ slug }: { slug: string }): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  const { me } = useSession();
  const { state, refresh } = useApi<Vote>(`/v1/services/${slug}/simulator-vote`);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | undefined>(undefined);
  if (state.status !== "ready") return <Skeleton lines={2} />;
  const change = async (method: "PUT" | "DELETE") => {
    setBusy(true);
    const { error } = await apiRequest(method, `/v1/services/${slug}/simulator-vote`, {});
    if (error === null) await refresh();
    setBusy(false);
    setFailure(error ?? undefined);
  };
  const signedIn = me !== null && me !== undefined;
  return (
    <div class="flex flex-col items-start gap-4">
      <p role="status" class="text-h3 font-semibold tabular-nums">
        {t("vote.count", { count: state.data.votes })}
      </p>
      {signedIn ? (
        <VoteButton vote={state.data} busy={busy} onChange={(method) => void change(method)} />
      ) : (
        <SignInToVote />
      )}
      <FormAlert error={failure} />
      <a href={localizedPath(language, "/simulator-requests")}>{t("vote.ranking")}</a>
    </div>
  );
}

import { countryName } from "@overpass/shared";
import type { ApiError, Proposal } from "@overpass/shared";
import { Inbox } from "lucide-preact";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, EmptyState, Field, Skeleton, Textarea } from "../../components/ui";
import { FormAlert, LoadError } from "../../forms";
import { apiRequest } from "../../session";
import { useApi } from "../routes";

type Decide = (id: string, decision: "accept" | "reject", reason?: string) => void;

/** A refusal carries an optional reason, sent to the member in the outcome e-mail. */
function RejectForm(props: { id: string; busy: boolean; onDecide: Decide; onCancel: () => void }) {
  const { t } = useTranslation("admin");
  const [reason, setReason] = useState("");
  const onSubmit = (event: Event) => {
    event.preventDefault();
    props.onDecide(props.id, "reject", reason.trim() === "" ? undefined : reason.trim());
  };
  return (
    <form class="flex flex-col gap-4 border border-rule p-4" onSubmit={onSubmit}>
      <Field
        id={`reason-${props.id}`}
        label={t("proposals.reason")}
        help={t("proposals.reasonHelp")}
      >
        {(control) => (
          <Textarea
            {...control}
            value={reason}
            maxLength={500}
            onInput={(event) => {
              setReason(event.currentTarget.value);
            }}
          />
        )}
      </Field>
      <div class="flex flex-wrap gap-2">
        <Button type="submit" disabled={props.busy}>
          {t("proposals.confirmReject")}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>
          {t("proposals.cancel")}
        </Button>
      </div>
    </form>
  );
}

/** A link typed by a member: https only on the API side, never trusted with the referrer. */
function DocsLink({ href }: { href: string }): JSX.Element {
  const { t } = useTranslation("admin");
  return (
    <a
      class="self-start [overflow-wrap:anywhere]"
      href={href}
      rel="noopener noreferrer nofollow ugc"
      target="_blank"
    >
      {t("proposals.docs")}
    </a>
  );
}

function ProposalRow(props: { proposal: Proposal; busy: boolean; onDecide: Decide }) {
  const { proposal, busy, onDecide } = props;
  const { t } = useTranslation("admin");
  const language = useLanguage();
  const [rejecting, setRejecting] = useState(false);
  const facts = [
    t(`category.${proposal.category}`),
    countryName(proposal.country, language),
    proposal.author,
  ];
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4">
      <p class="m-0 text-h3 font-semibold [overflow-wrap:anywhere]">{proposal.name}</p>
      <p class="m-0 text-caption text-ink-2">{facts.join(" · ")}</p>
      <DocsLink href={proposal.docsUrl} />
      {rejecting ? (
        <RejectForm
          id={proposal.id}
          busy={busy}
          onDecide={onDecide}
          onCancel={() => {
            setRejecting(false);
          }}
        />
      ) : (
        <Decisions
          busy={busy}
          onAccept={() => {
            onDecide(proposal.id, "accept");
          }}
          onReject={() => {
            setRejecting(true);
          }}
        />
      )}
    </li>
  );
}

function Decisions(props: { busy: boolean; onAccept: () => void; onReject: () => void }) {
  const { t } = useTranslation("admin");
  return (
    <div class="flex flex-wrap gap-2">
      <Button onClick={props.onAccept} disabled={props.busy}>
        {t("proposals.accept")}
      </Button>
      <Button variant="ghost" onClick={props.onReject} disabled={props.busy}>
        {t("proposals.reject")}
      </Button>
    </div>
  );
}

export function ProposalsQueue(): JSX.Element {
  const { t } = useTranslation("admin");
  const { state, refresh, reload } = useApi<Proposal[]>("/v1/admin/service-proposals");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | undefined>(undefined);
  const decide: Decide = (id, decision, reason) => {
    setBusy(true);
    const body = reason === undefined ? { decision } : { decision, reason };
    void apiRequest("POST", `/v1/admin/service-proposals/${id}`, body).then(async ({ error }) => {
      if (error === null) await refresh();
      setBusy(false);
      setFailure(error ?? undefined);
    });
  };
  if (state.status === "error") {
    return <LoadError error={state.error} onRetry={() => void reload()} />;
  }
  if (state.status !== "ready") return <Skeleton lines={4} />;
  if (state.data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={t("proposals.emptyTitle")}
        description={t("proposals.emptyText")}
      />
    );
  }
  return (
    <div class="flex flex-col gap-4">
      <FormAlert error={failure} />
      <ul class="m-0 list-none border-t border-rule p-0">
        {state.data.map((proposal) => (
          <ProposalRow key={proposal.id} proposal={proposal} busy={busy} onDecide={decide} />
        ))}
      </ul>
    </div>
  );
}

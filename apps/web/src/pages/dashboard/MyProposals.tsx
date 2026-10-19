import { countryName } from "@overpass/shared";
import type { Proposal } from "@overpass/shared";
import { Inbox } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Chip, EmptyState } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate } from "../routes/format";

function ProposalRow({ proposal }: { proposal: Proposal }): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4">
      <span class="self-start">
        <Chip selected={proposal.status === "accepted"}>
          {t(`proposals.status.${proposal.status}`)}
        </Chip>
      </span>
      {proposal.service === null ? (
        <span class="font-semibold [overflow-wrap:anywhere]">{proposal.name}</span>
      ) : (
        <a
          class="font-semibold [overflow-wrap:anywhere]"
          href={localizedPath(language, `/services/${proposal.service}`)}
        >
          {proposal.name}
        </a>
      )}
      <span class="text-caption text-ink-2">
        {countryName(proposal.country, language)} · {formatDate(proposal.createdAt, language)}
      </span>
      {proposal.reason === null ? null : (
        <p class="m-0 text-ink-2">{t("proposals.reason", { reason: proposal.reason })}</p>
      )}
    </li>
  );
}

/** The services the member proposed and what the team decided. */
export function MyProposalsList({ proposals }: { proposals: Proposal[] }): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  if (proposals.length === 0) {
    const propose = (
      <ButtonLink href={localizedPath(language, "/services/propose")}>
        {t("proposals.action")}
      </ButtonLink>
    );
    const empty = { title: t("proposals.emptyTitle"), description: t("proposals.emptyText") };
    return <EmptyState icon={Inbox} {...empty} action={propose} />;
  }
  return (
    <ul class="m-0 list-none border-t border-rule p-0">
      {proposals.map((proposal) => (
        <ProposalRow key={proposal.id} proposal={proposal} />
      ))}
    </ul>
  );
}

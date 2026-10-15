import type { SandboxProvider, SandboxTarget, Scenario } from "@overpass/shared";
import { scenarios } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { useSession } from "../../session";
import { useApi } from "../routes/useApi";
import { KeysPanel } from "./KeysPanel";
import { ProviderPanel } from "./ProviderPanel";
import { Results } from "./Results";
import { ScenarioPanel } from "./ScenarioPanel";
import { TargetPanel } from "./TargetPanel";
import { useTrack } from "./useTrack";

function Visitor(): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();
  const next = encodeURIComponent(localizedPath(language, "/sandbox"));
  return (
    <section class="max-w-prose border-b border-rule py-8">
      <h2 class="text-h2 font-semibold">{t("visitor.heading")}</h2>
      <p class="mt-3">{t("visitor.body")}</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <ButtonLink variant="primary" href={localizedPath(language, `/sign-in?next=${next}`)}>
          {t("visitor.signIn")}
        </ButtonLink>
        <ButtonLink variant="secondary" href={localizedPath(language, "/sandbox/demo")}>
          {t("visitor.demo")}
        </ButtonLink>
      </div>
    </section>
  );
}

const isScenario = (value: string | undefined): value is Scenario =>
  scenarios.some((scenario) => scenario === value);

/** Provider and scenario come from the link a route's Tester button builds. */
function useChoices(providers: SandboxProvider[]) {
  const { query } = useLocation();
  const asked = query["provider"];
  const [providerId, setProviderId] = useState(
    providers.some((item) => item.id === asked) ? asked : providers[0]?.id,
  );
  const [picked, setPicked] = useState<Scenario | undefined>(
    isScenario(query["scenario"]) ? query["scenario"] : undefined,
  );
  const provider = providers.find((item) => item.id === providerId) ?? providers[0];
  return {
    provider,
    unavailable: asked !== undefined && asked !== provider?.id,
    setProviderId,
    picked,
    setPicked,
  };
}

type Track = ReturnType<typeof useTrack>;
type Choices = ReturnType<typeof useChoices>;

function Setup(props: {
  providers: SandboxProvider[];
  provider: SandboxProvider;
  choices: Choices;
  track: Track;
  scenario: Scenario;
}): JSX.Element {
  const { providers, provider, choices, track, scenario } = props;
  const { actions, current } = track;
  const setScenario = (next: Scenario) => {
    choices.setPicked(next);
    void actions.update({ scenario: next });
  };
  return (
    <div class="lg:border-r lg:border-rule lg:pr-8">
      <FormAlert error={track.error} />
      <ProviderPanel
        providers={providers}
        provider={provider}
        unavailable={choices.unavailable}
        onSelect={choices.setProviderId}
      />
      <ScenarioPanel scenarios={scenarios} value={scenario} onChange={setScenario} />
      <KeysPanel
        keys={track.mine}
        currentId={current?.id}
        fresh={track.fresh}
        busy={track.busy === "create"}
        onCreate={() => void actions.create(scenario)}
        onUse={actions.use}
        onRevoke={(id) => void actions.revoke(id)}
      />
      <KeyTarget track={track} />
    </div>
  );
}

/** The target of the key in use; remounted per key so its local choice starts from the key. */
function KeyTarget({ track }: { track: Track }): JSX.Element | null {
  const { current, actions } = track;
  if (current === undefined) return null;
  const setTarget = (target: SandboxTarget, webhookUrl?: string) =>
    void actions.update({ target, ...(webhookUrl === undefined ? {} : { webhookUrl }) });
  return (
    <TargetPanel
      key={current.id}
      item={current}
      secret={track.fresh?.key}
      origin={location.origin}
      error={track.error?.fields?.["webhookUrl"]?.message}
      onChange={setTarget}
    />
  );
}

function Bench({ providers }: { providers: SandboxProvider[] }): JSX.Element {
  const choices = useChoices(providers);
  const { provider } = choices;
  const track = useTrack(provider?.id);
  if (provider === undefined) return <Skeleton />;
  const scenario = choices.picked ?? track.current?.scenario ?? "success";
  return (
    <div class="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[400px_minmax(0,1fr)]">
      <Setup
        providers={providers}
        provider={provider}
        choices={choices}
        track={track}
        scenario={scenario}
      />
      <Results provider={provider} track={track} scenario={scenario} />
    </div>
  );
}

/** The test track: configuration on the left, the call and its webhooks on the right. */
export function TrackPage(): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();
  const { me } = useSession();
  const providers = useApi<SandboxProvider[]>("/v1/sandbox/providers").state;
  const loading = me === undefined || providers.status === "loading";
  return (
    <Layout language={language}>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-rule py-8">
        <div class="max-w-prose">
          <h1 class="text-h1 font-semibold md:text-[40px]">{t("title")}</h1>
          <p class="mt-3">{t("intro")}</p>
        </div>
        <a href="/v1/sandbox/openapi.json">{t("openapi")}</a>
      </div>
      {me === null ? <Visitor /> : null}
      {me !== null && me !== undefined && providers.status === "ready" ? (
        <Bench providers={providers.data} />
      ) : null}
      {loading ? (
        <div class="py-8">
          <Skeleton />
        </div>
      ) : null}
      {providers.status === "error" ? (
        <div class="py-8">
          <FormAlert error={providers.error} />
        </div>
      ) : null}
    </Layout>
  );
}

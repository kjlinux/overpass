import type { SandboxKey, SandboxTarget } from "@overpass/shared";
import { sandboxTargets } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, CodeBlock, Field, TextInput } from "../../components/ui";
import { relayCommand } from "./command";
import { RadioRow, Section } from "./parts";

type Props = {
  item: SandboxKey;
  secret: string | undefined;
  origin: string;
  error: string | undefined;
  onChange: (target: SandboxTarget, webhookUrl?: string) => void;
};

function Relay({ item, secret, origin }: Pick<Props, "item" | "secret" | "origin">): JSX.Element {
  const { t } = useTranslation("sandbox");
  const key = secret ?? `${item.prefix}...`;
  const caption = secret === undefined ? t("target.terminalPrefix") : t("target.terminal");
  return (
    <div class="mt-4 space-y-3">
      <CodeBlock code={relayCommand({ origin, key })} language={caption} />
      <p class="text-caption text-ink-2">{t("target.relayHelp")}</p>
      <a class="inline-flex min-h-tap items-center" href="#sandbox-tools-cli">
        {t("target.guide")}
      </a>
    </div>
  );
}

function UrlForm(props: {
  item: SandboxKey;
  error: string | undefined;
  onSave: (url: string) => void;
}): JSX.Element {
  const { t } = useTranslation("sandbox");
  const [url, setUrl] = useState(props.item.webhookUrl ?? "");
  const error = props.error === undefined ? {} : { error: props.error };
  return (
    <form
      class="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSave(url);
      }}
    >
      <Field id="sandbox-url" label={t("target.urlLabel")} help={t("target.urlHelp")} {...error}>
        {(control) => (
          <TextInput
            {...control}
            type="url"
            inputMode="url"
            value={url}
            onInput={(event) => {
              setUrl(event.currentTarget.value);
            }}
          />
        )}
      </Field>
      <Button variant="secondary" type="submit">
        {t("target.save")}
      </Button>
    </form>
  );
}

function Secret({ value }: { value: string }): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <div class="mt-6 space-y-2">
      <CodeBlock code={value} language={t("keys.secret")} />
      <p class="text-caption text-ink-2">{t("keys.secretHelp")}</p>
    </div>
  );
}

function Targets(props: {
  chosen: SandboxTarget;
  onChoose: (target: SandboxTarget) => void;
}): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <div role="radiogroup" aria-labelledby="sandbox-target" class="border-t border-rule">
      {sandboxTargets.map((target) => (
        <RadioRow
          key={target}
          name="target"
          value={target}
          checked={props.chosen === target}
          label={t(`target.${target}.label`)}
          help={t(`target.${target}.help`)}
          onChange={() => {
            props.onChoose(target);
          }}
        />
      ))}
    </div>
  );
}

/** Where this key's webhooks go; the relay command carries the key when it is still known. */
export function TargetPanel({ item, secret, origin, error, onChange }: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  const [chosen, setChosen] = useState<SandboxTarget>(item.target);
  const choose = (target: SandboxTarget) => {
    setChosen(target);
    if (target !== "url") onChange(target);
  };
  return (
    <Section id="sandbox-target" title={t("target.heading")}>
      <Targets chosen={chosen} onChoose={choose} />
      {chosen === "relay" ? <Relay item={item} secret={secret} origin={origin} /> : null}
      {chosen === "url" ? (
        <UrlForm
          item={item}
          error={error}
          onSave={(url) => {
            onChange("url", url);
          }}
        />
      ) : null}
      {chosen === "inbox" ? (
        <p class="mt-4 text-caption text-ink-2">{t("target.inboxHelp")}</p>
      ) : null}
      <Secret value={item.webhookSecret} />
    </Section>
  );
}

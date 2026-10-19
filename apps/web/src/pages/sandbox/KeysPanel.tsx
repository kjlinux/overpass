import type { SandboxKey } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, CodeBlock, ConfirmDialog } from "../../components/ui";
import { Section } from "./parts";

export const maxKeys = 5;

type Props = {
  keys: SandboxKey[];
  currentId: string | undefined;
  fresh: { id: string; key: string } | undefined;
  busy: boolean;
  onCreate: () => void;
  onUse: (id: string) => void;
  onRevoke: (id: string) => void;
};

function Reveal({ secret }: { secret: string }): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <div role="status" class="mb-4 border border-success bg-success-surface p-4">
      <p>
        <strong>{t("keys.revealTitle")}</strong> {t("keys.revealBody")}
      </p>
      <div class="mt-3 bg-paper">
        <CodeBlock code={secret} language={t("keys.yours")} />
      </div>
    </div>
  );
}

type RowProps = { item: SandboxKey; current: boolean; onUse: () => void; onRevoke: () => void };

function KeyRow({ item, current, onUse, onRevoke }: RowProps): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();
  const date = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(item.expiresAt),
  );
  const marker = current ? "pl-3 shadow-[inset_3px_0_0_var(--color-accent)]" : "";
  return (
    <li
      class={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-rule py-3 ${marker}`}
      aria-current={current ? "true" : undefined}
    >
      <code class="font-medium">{item.prefix}</code>
      <span class="row-span-2 flex gap-1">
        {current ? null : (
          <Button variant="ghost" onClick={onUse}>
            {t("keys.use")}
          </Button>
        )}
        <Button variant="ghost" onClick={onRevoke}>
          {t("keys.revoke")}
        </Button>
      </span>
      <span class="text-caption text-ink-2">{t("keys.meta", { date, quota: item.quota })}</span>
    </li>
  );
}

function RevokeDialog(props: {
  id: string | undefined;
  onDone: (confirmed: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <ConfirmDialog
      open={props.id !== undefined}
      title={t("keys.revokeTitle")}
      description={t("keys.revokeBody")}
      confirmLabel={t("keys.revokeConfirm")}
      destructive
      onConfirm={() => {
        props.onDone(true);
      }}
      onCancel={() => {
        props.onDone(false);
      }}
    />
  );
}

function KeyList(props: {
  keys: SandboxKey[];
  currentId: string | undefined;
  onUse: (id: string) => void;
  onRevoke: (id: string) => void;
}): JSX.Element {
  return (
    <ul class="border-t border-rule empty:hidden">
      {props.keys.map((item) => (
        <KeyRow
          key={item.id}
          item={item}
          current={item.id === props.currentId}
          onUse={() => {
            props.onUse(item.id);
          }}
          onRevoke={() => {
            props.onRevoke(item.id);
          }}
        />
      ))}
    </ul>
  );
}

/** Creating a key shows it once; afterwards only its prefix and its limits remain visible. */
export function KeysPanel({
  keys,
  currentId,
  fresh,
  busy,
  onCreate,
  onUse,
  onRevoke,
}: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  const [revoking, setRevoking] = useState<string>();
  const count = (
    <span class="text-caption text-ink-2">
      {t("keys.count", { count: keys.length, max: maxKeys })}
    </span>
  );
  const done = (confirmed: boolean) => {
    if (confirmed && revoking !== undefined) onRevoke(revoking);
    setRevoking(undefined);
  };
  return (
    <Section id="sandbox-keys" title={t("keys.heading")} aside={count}>
      {fresh === undefined ? null : <Reveal secret={fresh.key} />}
      {keys.length === 0 ? <p class="mb-4">{t("keys.empty")}</p> : null}
      <KeyList keys={keys} currentId={currentId} onUse={onUse} onRevoke={setRevoking} />
      {keys.length < maxKeys ? (
        <Button variant="secondary" class="mt-4" loading={busy} onClick={onCreate}>
          {t("keys.create")}
        </Button>
      ) : null}
      <RevokeDialog id={revoking} onDone={done} />
    </Section>
  );
}

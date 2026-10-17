import type { SandboxKeyOutput } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, Card } from "../../components/ui";

type Props = {
  keyRecord: SandboxKeyOutput | null;
  loading: boolean;
  onGenerate: () => void;
};

function AnonymousKeyCard({
  loading,
  onGenerate,
}: {
  loading: boolean;
  onGenerate: () => void;
}): JSX.Element {
  const { t } = useTranslation("sandbox");
  return (
    <Card
      title={t("apiKey.title")}
      action={
        <Button variant="secondary" onClick={onGenerate} disabled={loading}>
          {t("apiKey.generate")}
        </Button>
      }
    >
      <p class="text-caption text-ink-2">{t("apiKey.anonymousNotice")}</p>
    </Card>
  );
}

function QuotaBar({ quotaRemaining }: { quotaRemaining: number }): JSX.Element {
  const quotaPercent = Math.max(0, Math.min(100, quotaRemaining));
  return (
    <div class="h-2 w-full bg-surface overflow-hidden border border-rule">
      <div
        class="h-full bg-accent transition-all duration-base"
        style={{ width: `${String(quotaPercent)}%` }}
      />
    </div>
  );
}

function ActiveKeyCard({
  keyRecord,
  loading,
  onGenerate,
}: {
  keyRecord: SandboxKeyOutput;
  loading: boolean;
  onGenerate: () => void;
}): JSX.Element {
  const { t } = useTranslation("sandbox");
  const expiresFormatted = new Date(keyRecord.expiresAt).toLocaleDateString();

  return (
    <Card
      title={t("apiKey.title")}
      action={
        <Button variant="ghost" onClick={onGenerate} disabled={loading}>
          {t("apiKey.generate")}
        </Button>
      }
    >
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2 text-caption">
          <span class="font-mono text-ink bg-surface px-2 py-1 select-all">{keyRecord.key}</span>
          <span class="font-medium text-ink">
            {t("apiKey.quota", { remaining: keyRecord.quotaRemaining })}
          </span>
        </div>
        <QuotaBar quotaRemaining={keyRecord.quotaRemaining} />
        <p class="text-caption text-ink-2">{t("apiKey.expires", { date: expiresFormatted })}</p>
      </div>
    </Card>
  );
}

export function SandboxKeyCard({ keyRecord, loading, onGenerate }: Props): JSX.Element {
  if (keyRecord === null) {
    return <AnonymousKeyCard loading={loading} onGenerate={onGenerate} />;
  }
  return <ActiveKeyCard keyRecord={keyRecord} loading={loading} onGenerate={onGenerate} />;
}

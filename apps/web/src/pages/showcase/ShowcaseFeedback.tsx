import { Inbox } from "lucide-preact";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Notification,
  NotificationStack,
  Skeleton,
} from "../../components/ui";
import type { NotificationVariant } from "../../components/ui";
import { Section } from "./Section";

/** A destructive confirmation, opened from a button. */
export function DialogSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  const [open, setOpen] = useState(false);
  const close = (): void => {
    setOpen(false);
  };
  return (
    <Section id="dialog" title={t("dialog.title")}>
      <Button
        variant="danger"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("dialog.open")}
      </Button>
      <ConfirmDialog
        open={open}
        title={t("dialog.heading")}
        description={t("dialog.text")}
        confirmLabel={t("dialog.confirm")}
        destructive
        onConfirm={close}
        onCancel={close}
      />
    </Section>
  );
}

const variants: NotificationVariant[] = ["neutral", "success", "warning", "danger"];

/** Notifications of every variant, shown on demand in the stack. */
export function NotificationSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  const [shown, setShown] = useState<NotificationVariant[]>([]);
  return (
    <Section id="notifications" title={t("notifications.title")}>
      <div class="flex flex-wrap gap-4">
        {variants.map((variant) => (
          <Button
            key={variant}
            onClick={() => {
              setShown([...shown.filter((item) => item !== variant), variant]);
            }}
          >
            {t(`notifications.${variant}`)}
          </Button>
        ))}
      </div>
      <NotificationStack>
        {shown.map((variant) => (
          <Notification
            key={variant}
            variant={variant}
            onDismiss={() => {
              setShown((current) => current.filter((item) => item !== variant));
            }}
          >
            {t(`notifications.${variant}Text`)}
          </Notification>
        ))}
      </NotificationStack>
    </Section>
  );
}

/** Loading skeleton and empty state side by side. */
export function StatesSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  return (
    <Section id="states" title={t("states.title")}>
      <div class="grid gap-6 md:grid-cols-2">
        <Skeleton />
        <EmptyState
          icon={Inbox}
          title={t("states.emptyTitle")}
          description={t("states.emptyText")}
          action={<Button variant="primary">{t("states.emptyAction")}</Button>}
        />
      </div>
    </Section>
  );
}

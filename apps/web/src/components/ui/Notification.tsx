import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-preact";
import type { ComponentChildren, JSX } from "preact";
import { useEffect } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { IconButton } from "./Button";
import { cx } from "./cx";

export type NotificationVariant = "neutral" | "success" | "warning" | "danger";

const icons: Record<NotificationVariant, typeof Info> = {
  neutral: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

const tones: Record<NotificationVariant, string> = {
  neutral: "border-l-accent text-accent",
  success: "border-l-success text-success",
  warning: "border-l-warning text-warning",
  danger: "border-l-danger text-danger",
};

const autoHideDelay = 6000;

export type NotificationProps = {
  variant?: NotificationVariant;
  onDismiss: () => void;
  children: ComponentChildren;
};

/** A raised notice; successes leave after 6 s, errors stay until dismissed. */
export function Notification({
  variant = "neutral",
  onDismiss,
  children,
}: NotificationProps): JSX.Element {
  const { t } = useTranslation("ui");
  const Icon = icons[variant];

  useEffect(() => {
    if (variant !== "success") return undefined;
    const timer = setTimeout(onDismiss, autoHideDelay);
    return () => {
      clearTimeout(timer);
    };
  }, [variant, onDismiss]);

  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      class={cx(
        "fade-in flex items-center gap-3 border border-l-4 border-rule-strong bg-raised py-2 pl-4 pr-2 shadow-raised",
        tones[variant],
      )}
    >
      <Icon class="h-5 w-5 flex-none" aria-hidden="true" />
      <p class="flex-1 text-ink">{children}</p>
      <IconButton label={t("close")} onClick={onDismiss}>
        <X class="h-5 w-5" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

/** Stacks notifications bottom centre on phones, bottom right from 768 px. */
export function NotificationStack({ children }: { children: ComponentChildren }): JSX.Element {
  return (
    <div class="fixed inset-x-4 bottom-4 z-40 flex flex-col gap-3 md:left-auto md:w-[420px]">
      {children}
    </div>
  );
}

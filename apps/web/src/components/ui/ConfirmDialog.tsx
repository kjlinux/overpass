import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Opens or closes the native dialog as a modal whenever `open` changes. */
function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}

/** A native modal dialog: focus is trapped, Escape cancels, focus returns to the trigger. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  const { t } = useTranslation("ui");
  const ref = useModal(open);

  return (
    <dialog
      ref={ref}
      class="fade-in m-auto w-[calc(100%-32px)] max-w-[480px] border border-rule-strong bg-raised p-8 text-ink shadow-raised backdrop:bg-ink/40"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onClose={onCancel}
    >
      <h3 class="text-h3 font-semibold" id="confirm-title">
        {title}
      </h3>
      <p class="mt-3" id="confirm-description">
        {description}
      </p>
      <div class="mt-6 flex flex-wrap justify-between gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

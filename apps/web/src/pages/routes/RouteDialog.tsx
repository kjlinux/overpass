import type { ApiError } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import { FormAlert } from "../../forms";

export type RouteDialogProps = {
  open: boolean;
  title: string;
  text: string;
  submitLabel: string;
  busy: boolean;
  error: ApiError | undefined;
  onSubmit: (event: Event) => void;
  onClose: () => void;
  children: ComponentChildren;
};

/** A native modal form: focus is trapped, Escape closes, focus returns to the trigger. */
export function RouteDialog(props: RouteDialogProps): JSX.Element {
  const { open, title, text, submitLabel, busy, error, onSubmit, onClose, children } = props;
  const { t } = useTranslation("routes");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="route-dialog-title"
      onClose={onClose}
      class="fade-in w-[min(480px,calc(100%-32px))] border border-rule-strong bg-raised p-8 text-ink shadow-raised backdrop:bg-[rgb(0_0_0/0.4)]"
    >
      <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <h2 id="route-dialog-title" class="text-h3 font-semibold">
          {title}
        </h2>
        <p>{text}</p>
        <FormAlert error={error} />
        {children}
        <div class="flex flex-wrap justify-between gap-3">
          <Button variant="ghost" onClick={onClose}>
            {t("dialog.cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

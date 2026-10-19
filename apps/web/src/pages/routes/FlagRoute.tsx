import { fieldMessage, routeReportInput } from "@overpass/shared";
import type { ApiError, RouteDetail, RouteReportInput } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Field, Textarea } from "../../components/ui";
import { useForm } from "../../forms";
import type { FieldBinding } from "../../forms";
import { RouteDialog } from "./RouteDialog";

export type FlagSend = (input: RouteReportInput) => Promise<ApiError | undefined>;

/** Signed-in readers only, never the author: the API refuses both cases anyway. */
export const mayFlag = (route: RouteDetail): boolean =>
  route.viewer.eligibility !== "anonymous" && !route.viewer.isAuthor;

function ReasonField({ binding }: { binding: FieldBinding }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const issue = binding.error;
  const error =
    issue === undefined ? {} : { error: issue.message ?? fieldMessage(issue.code, language) };
  return (
    <Field id="reason" label={t("flag.reason")} help={t("flag.help")} {...error}>
      {(control) => (
        <Textarea
          {...control}
          name="reason"
          maxLength={500}
          value={binding.value}
          onInput={binding.onInput}
          onBlur={binding.onBlur}
        />
      )}
    </Field>
  );
}

function FlagDialog(props: {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  onSend: FlagSend;
}) {
  const { t } = useTranslation("routes");
  const form = useForm(routeReportInput, { reason: "" });
  const [busy, setBusy] = useState(false);
  const reason = form.bind("reason");
  const submit = async (event: Event) => {
    event.preventDefault();
    const input = form.validate();
    if (input === undefined || busy) return;
    setBusy(true);
    const error = await props.onSend(input);
    setBusy(false);
    if (error === undefined) props.onSent();
    else form.showApiError(error);
  };
  return (
    <RouteDialog
      {...{ open: props.open, onClose: props.onClose, busy, error: form.formError }}
      onSubmit={(event) => void submit(event)}
      title={t("flag.title")}
      text={t("flag.text")}
      submitLabel={t("flag.submit")}
    >
      <ReasonField binding={reason} />
    </RouteDialog>
  );
}

/** "Signaler cette fiche": a reason in a dialog, then a written thank-you in place of the button. */
export function FlagAction({ route, onSend }: { route: RouteDetail; onSend: FlagSend }) {
  const { t } = useTranslation("routes");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  if (!mayFlag(route)) return null;
  return (
    <div class="flex flex-col gap-2 border-t border-rule pt-4">
      {sent ? null : (
        <Button
          variant="ghost"
          class="self-start"
          onClick={() => {
            setOpen(true);
          }}
        >
          {t("flag.action")}
        </Button>
      )}
      <p role="status" class="text-success empty:hidden">
        {sent ? t("flag.sent") : ""}
      </p>
      <FlagDialog
        open={open}
        onSend={onSend}
        onClose={() => {
          setOpen(false);
        }}
        onSent={() => {
          setOpen(false);
          setSent(true);
        }}
      />
    </div>
  );
}

/** Shown to the author and to admins, the only readers of a hidden itinerary. */
export function HiddenNotice({ route }: { route: RouteDetail }): JSX.Element | null {
  const { t } = useTranslation("routes");
  if (route.moderation !== "hidden") return null;
  return (
    <div role="note" class="mt-6 border border-l-4 border-warning bg-warning-surface p-4">
      <p class="m-0 font-semibold">{t("hidden.title")}</p>
      <p class="m-0 mt-1">{t("hidden.text")}</p>
    </div>
  );
}

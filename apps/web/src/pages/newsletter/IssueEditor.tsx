import { newsletterRules } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, ConfirmDialog, Field, TextInput, Textarea } from "../../components/ui";
import { ItemList } from "./ItemList";
import type { EditorPatch, Editing } from "./useIssueEditor";

export type IssueEditorProps = {
  editing: Editing;
  busy: boolean;
  saved: boolean;
  onChange: (patch: EditorPatch) => void;
  onSave: () => void;
  onSend: () => void;
  onClose: () => void;
};

const valueOf = (event: Event) => (event.currentTarget as HTMLInputElement).value;

function Texts({ editing, onChange }: IssueEditorProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  const readOnly = editing.status !== "draft";
  return (
    <>
      <Field id="issue-subject" label={t("admin.subject")}>
        {(control) => (
          <TextInput
            {...control}
            value={editing.subject}
            readOnly={readOnly}
            maxLength={newsletterRules.subjectMaxLength}
            onInput={(event) => {
              onChange({ subject: valueOf(event) });
            }}
          />
        )}
      </Field>
      <Field id="issue-intro" label={t("admin.introField")}>
        {(control) => (
          <Textarea
            {...control}
            rows={6}
            value={editing.intro}
            readOnly={readOnly}
            maxLength={newsletterRules.introMaxLength}
            onInput={(event) => {
              onChange({ intro: valueOf(event) });
            }}
          />
        )}
      </Field>
    </>
  );
}

function Actions(props: IssueEditorProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  const [confirming, setConfirming] = useState(false);
  return (
    <div class="flex flex-wrap gap-3">
      <Button
        variant="primary"
        disabled={props.busy}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {t("admin.send")}
      </Button>
      <Button loading={props.busy} onClick={props.onSave}>
        {t("admin.save")}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t("admin.sendTitle")}
        description={t("admin.sendText")}
        confirmLabel={t("admin.send")}
        onConfirm={() => {
          setConfirming(false);
          props.onSend();
        }}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </div>
  );
}

/** Subject, intro and ordered items of one issue; only a draft can change or be sent. */
export function IssueEditor(props: IssueEditorProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  const { editing, saved } = props;
  const draft = editing.status === "draft";
  return (
    <div class="flex flex-col gap-6">
      {draft ? null : <p class="m-0 text-ink-2">{t("admin.readOnly")}</p>}
      <Texts {...props} />
      <section aria-labelledby="issue-items">
        <h3 id="issue-items" class="mb-3 text-h3 font-semibold">
          {t("admin.items")}
        </h3>
        <ItemList
          items={editing.items}
          readOnly={!draft}
          onChange={(items) => {
            props.onChange({ items });
          }}
        />
      </section>
      {draft && saved ? (
        <p class="m-0 text-success" role="status">
          {t("admin.saved")}
        </p>
      ) : null}
      {draft ? <Actions {...props} /> : null}
      <div>
        <Button variant="ghost" onClick={props.onClose}>
          {t("admin.close")}
        </Button>
      </div>
    </div>
  );
}

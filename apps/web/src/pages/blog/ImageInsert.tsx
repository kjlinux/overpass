import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Field, TextInput } from "../../components/ui";
import { FormAlert } from "../../forms";
import { ImageFileInput } from "./ImageFileInput";
import { imageMarkdown, insertAt } from "./images";
import { useImageUpload } from "./useImageUpload";

export type ContentForm = {
  values: Record<string, string>;
  setValues: (values: Record<string, string>) => void;
};

/** Puts the snippet where the cursor was in the text, then gives the focus back there. */
function insertIntoContent(form: ContentForm, snippet: string): void {
  const area = document.getElementById("content") as HTMLTextAreaElement | null;
  const content = form.values["content"] ?? "";
  const { text, cursor } = insertAt(content, area?.selectionStart ?? null, snippet);
  form.setValues({ ...form.values, content: text });
  requestAnimationFrame(() => {
    area?.focus();
    area?.setSelectionRange(cursor, cursor);
  });
}

function useInsert(form: ContentForm) {
  const [alt, setAlt] = useState("");
  const [missing, setMissing] = useState(false);
  const { upload, busy, error } = useImageUpload();
  const onFile = async (file: File) => {
    setMissing(alt.trim() === "");
    if (alt.trim() === "") return;
    const stored = await upload(file);
    if (stored === undefined) return;
    insertIntoContent(form, imageMarkdown(alt.trim(), stored.url));
    setAlt("");
  };
  return { alt, setAlt, missing, busy, error, onFile };
}

/** Description first, then the file: an image never lands in the text without its alternative. */
export function ImageInsert({ form }: { form: ContentForm }): JSX.Element {
  const { t } = useTranslation("blog");
  const { alt, setAlt, missing, busy, error, onFile } = useInsert(form);
  const altError = missing ? { error: t("editor.imageAltMissing") } : {};
  return (
    <div class="grid gap-3 border border-rule p-4 md:grid-cols-2">
      <Field
        id="imageAlt"
        label={t("editor.imageAlt")}
        help={t("editor.imageAltHelp")}
        {...altError}
      >
        {(control) => (
          <TextInput
            {...control}
            name="imageAlt"
            value={alt}
            onInput={(event) => {
              setAlt(event.currentTarget.value);
            }}
          />
        )}
      </Field>
      <ImageFileInput
        id="imageFile"
        label={t("editor.imageFile")}
        help={t(busy ? "editor.imageUploading" : "editor.imageHelp")}
        busy={busy}
        onFile={(file) => void onFile(file)}
      />
      {error === undefined ? null : (
        <div class="md:col-span-2">
          <FormAlert error={error} />
        </div>
      )}
    </div>
  );
}

import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import { FormAlert } from "../../forms";
import { ImageFileInput } from "./ImageFileInput";
import type { ContentForm } from "./ImageInsert";
import { useImageUpload } from "./useImageUpload";

/** An optional cover: a preview once chosen, and a button to drop it again. */
export function CoverField({ form }: { form: ContentForm }): JSX.Element {
  const { t } = useTranslation("blog");
  const { upload, busy, error } = useImageUpload();
  const cover = form.values["cover"] ?? "";
  const setCover = (url: string) => {
    form.setValues({ ...form.values, cover: url });
  };
  const onFile = async (file: File) => {
    const stored = await upload(file);
    if (stored !== undefined) setCover(stored.url);
  };
  return (
    <div class="flex flex-col gap-3">
      <ImageFileInput
        id="cover"
        label={t("editor.cover")}
        help={t(busy ? "editor.imageUploading" : "editor.coverHelp")}
        busy={busy}
        onFile={(file) => void onFile(file)}
      />
      {cover === "" ? null : (
        <div class="flex flex-wrap items-end gap-4">
          <img
            src={cover}
            alt=""
            class="aspect-[16/9] w-64 max-w-full border border-rule object-cover"
          />
          <Button
            onClick={() => {
              setCover("");
            }}
          >
            {t("editor.coverRemove")}
          </Button>
        </div>
      )}
      {error === undefined ? null : <FormAlert error={error} />}
    </div>
  );
}

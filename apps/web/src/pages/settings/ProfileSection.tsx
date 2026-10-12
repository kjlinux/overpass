import { handleSchema, profileUpdateInput } from "@overpass/shared";
import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button } from "../../components/ui";
import {
  FormAlert,
  SelectField,
  StackChoices,
  TextField,
  countryOptions,
  useForm,
  useSubmit,
} from "../../forms";
import { apiRequest, useSession } from "../../session";
import { SavedNote, SettingsSection } from "./SettingsSection";

function useProfileEdit(me: Me) {
  const { setMe } = useSession();
  const [stacks, setStacks] = useState(me.stacks);
  const [saved, setSaved] = useState(false);
  // The current handle may be a generated dev- one, which members cannot pick but may keep.
  const schema = useMemo(
    () =>
      profileUpdateInput.extend({
        handle: z.union([z.literal(me.handle), handleSchema]).optional(),
      }),
    [me.handle],
  );
  const form = useForm(schema, { handle: me.handle, country: me.country });
  const submit = useSubmit({
    validate: () => {
      setSaved(false);
      return form.validate();
    },
    send: ({ handle, ...data }) =>
      apiRequest<Me>("PATCH", "/v1/me", {
        ...data,
        stacks,
        ...(handle === me.handle ? {} : { handle }),
      }),
    onError: (error) => {
      form.showApiError(error, { handle_taken: "handle" });
    },
    onSuccess: (next) => {
      setMe(next);
      setSaved(true);
    },
  });
  return { form, stacks, setStacks, saved, ...submit };
}

export function ProfileSection({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("settings");
  const language = useLanguage();
  const { form, stacks, setStacks, saved, busy, onSubmit } = useProfileEdit(me);
  return (
    <SettingsSection heading={t("profile.heading")}>
      <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <FormAlert error={form.formError} />
        <TextField
          id="handle"
          label={t("profile.handle")}
          help={t("profile.handleHelp")}
          form={form}
        />
        <SelectField
          id="country"
          label={t("profile.country")}
          options={countryOptions(language)}
          form={form}
        />
        <StackChoices legend={t("profile.stacks")} value={stacks} onChange={setStacks} />
        <Button type="submit" variant="primary" loading={busy} class="self-start">
          {t("profile.submit")}
        </Button>
        <SavedNote shown={saved} />
      </form>
    </SettingsSection>
  );
}

import { subscribeInput } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import { useState } from "preact/hooks";
import { useForm, useSubmit } from "../forms";
import { apiRequest } from "../session";

/** Sends a subscription; the answer is the same for known and unknown addresses. */
export function useSubscribe(language: Language) {
  const form = useForm(subscribeInput, { email: "", language });
  const [done, setDone] = useState(false);
  const { busy, onSubmit } = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<{ status: "pending" }>("POST", "/v1/newsletter/subscribe", data),
    onError: (error) => {
      form.showApiError(error);
    },
    onSuccess: () => {
      setDone(true);
    },
  });
  const restart = () => {
    form.setValues({ email: "", language: form.values.language ?? language });
    setDone(false);
  };
  return { form, busy, onSubmit, done, restart };
}

import type { ApiError, Envelope } from "@overpass/shared";
import { useState } from "preact/hooks";

type Options<Data, Result> = {
  validate: () => Data | undefined;
  send: (data: Data) => Promise<Envelope<Result>>;
  onError: (error: ApiError) => void;
  onSuccess: (result: Result) => void;
};

/** Validates, sends once at a time, then routes the answer to success or error. */
export function useSubmit<Data, Result>(options: Options<Data, Result>) {
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    const data = options.validate();
    if (data === undefined) return;
    setBusy(true);
    const result = await options.send(data);
    setBusy(false);
    if (result.error === null) options.onSuccess(result.data);
    else options.onError(result.error);
  };
  const onSubmit = (event: Event) => {
    event.preventDefault();
    void submit();
  };
  return { busy, onSubmit };
}

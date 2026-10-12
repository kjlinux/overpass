import type { ApiError, Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Skeleton } from "../../components/ui";
import { localizedPath } from "../../layout/nav";
import { apiRequest, useSession } from "../../session";
import { AuthLayout } from "./AuthLayout";
import { tokenFromHash } from "./ResetPasswordPage";

type Failure = "invalid" | "taken";

/** Sends the token of the link once, then continues to the stacks step. */
function useConfirmation(): Failure | undefined {
  const language = useLanguage();
  const { route } = useLocation();
  const { setMe } = useSession();
  const [failure, setFailure] = useState<Failure | undefined>(undefined);
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const token = tokenFromHash(location.hash);
    history.replaceState(null, "", location.pathname);
    if (token === undefined) {
      setFailure("invalid");
      return;
    }
    void apiRequest<Me>("POST", "/v1/auth/confirm", { token }).then(({ data, error }) => {
      if (data !== null) {
        setMe(data);
        route(localizedPath(language, "/sign-up/stacks"), true);
      } else setFailure(failureOf(error));
    });
  }, [language, route, setMe]);
  return failure;
}

function failureOf(error: ApiError): Failure {
  return error.code === "email_taken" ? "taken" : "invalid";
}

export function ConfirmSignUpPage(): JSX.Element {
  const { t } = useTranslation("accounts");
  const language = useLanguage();
  const failure = useConfirmation();
  if (failure === undefined) {
    return (
      <AuthLayout title={t("confirm.title")} intro={t("confirm.working")}>
        <Skeleton title={false} lines={2} />
      </AuthLayout>
    );
  }
  const [title, text, path, label] =
    failure === "taken"
      ? [t("confirm.takenTitle"), t("confirm.taken"), "/sign-in", t("confirm.signIn")]
      : [t("confirm.invalidTitle"), t("confirm.invalid"), "/sign-up", t("confirm.restart")];
  return (
    <AuthLayout title={title}>
      <p role="alert">{text}</p>
      <ButtonLink variant="primary" class="mt-6" href={localizedPath(language, path)}>
        {label}
      </ButtonLink>
    </AuthLayout>
  );
}

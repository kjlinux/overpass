import { LoaderCircle } from "lucide-preact";
import type { ButtonHTMLAttributes, ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { classOf, cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "pressable inline-flex min-h-tap items-center justify-center gap-2 border px-5 font-semibold no-underline whitespace-nowrap disabled:cursor-not-allowed disabled:border-rule disabled:bg-surface disabled:text-ink-2";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-accent bg-accent text-accent-ink hover:border-accent-active hover:bg-accent-active",
  secondary: "border-rule-strong bg-paper text-ink hover:bg-surface",
  ghost: "border-transparent bg-transparent text-ink hover:bg-accent-surface",
  danger:
    "border-danger bg-danger text-accent-ink hover:border-danger-active hover:bg-danger-active",
};

/** Class list of a button-like element, for links that must look like buttons. */
export function buttonClass(variant: ButtonVariant, className?: string): string {
  return cx(base, variants[variant], className);
}

export type ButtonProps = Omit<ButtonHTMLAttributes, "class"> & {
  variant?: ButtonVariant;
  loading?: boolean;
  class?: string;
};

export function Button({
  variant = "secondary",
  loading = false,
  class: className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps): JSX.Element {
  const { t } = useTranslation("ui");
  return (
    <button
      {...rest}
      type={type}
      class={buttonClass(variant, className)}
      disabled={disabled === true || loading}
      aria-busy={loading}
    >
      {loading ? <LoaderCircle class="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      <span class={cx(loading && "sr-only")}>{children}</span>
      {loading ? <span aria-live="polite">{t("loading")}</span> : null}
    </button>
  );
}

export type ButtonLinkProps = JSX.IntrinsicElements["a"] & { variant?: ButtonVariant };

export function ButtonLink({ variant = "secondary", ...props }: ButtonLinkProps): JSX.Element {
  return <a {...props} class={buttonClass(variant, classOf(props.class))} />;
}

export type IconButtonProps = Omit<ButtonHTMLAttributes, "class"> & {
  label: string;
  class?: string;
  children: ComponentChildren;
};

/** A 44 px square ghost button whose only content is an icon. */
export function IconButton({
  label,
  class: className,
  children,
  type = "button",
  ...rest
}: IconButtonProps): JSX.Element {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      class={cx(
        "pressable inline-flex h-11 w-11 items-center justify-center border border-transparent bg-transparent text-ink hover:bg-accent-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}

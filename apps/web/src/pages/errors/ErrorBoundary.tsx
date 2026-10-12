import type { Language } from "@overpass/shared";
import { Component } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { ErrorPage } from "./ErrorPage";

type Props = { language: Language; children: ComponentChildren };
type State = { failed: boolean };

/** Renders the server error page when a page throws while rendering. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static override getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error): void {
    console.error(error);
  }

  override render(): JSX.Element | ComponentChildren {
    if (this.state.failed) return <ErrorPage kind="server" language={this.props.language} />;
    return this.props.children;
  }
}

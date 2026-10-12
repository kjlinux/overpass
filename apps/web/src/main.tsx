import { render } from "preact";
import { App } from "./app/App";
import { initI18n } from "./i18n/i18n";
import "./index.css";

await initI18n();

const root = document.getElementById("root");
if (root !== null) {
  // Preact 11 renders after existing children, so the static skeleton must go first.
  root.replaceChildren();
  render(<App />, root);
}

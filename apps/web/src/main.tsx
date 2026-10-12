import { render } from "preact";
import { App } from "./app/App";
import { initI18n } from "./i18n/i18n";
import "./index.css";

await initI18n();

const root = document.getElementById("root");
if (root !== null) render(<App />, root);

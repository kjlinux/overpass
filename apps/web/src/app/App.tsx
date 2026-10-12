import { ErrorBoundary, LocationProvider, Route, Router } from "preact-iso";
import { SessionProvider } from "../session";
import { LanguageShell } from "./LanguageShell";
import { RootRedirect } from "./RootRedirect";

/** Root component: location context, error boundary and top-level routes. */
export function App() {
  return (
    <LocationProvider>
      <SessionProvider>
        <ErrorBoundary>
          <Router>
            <Route path="/:lang" component={LanguageShell} />
            <Route path="/:lang/*" component={LanguageShell} />
            <Route default component={RootRedirect} />
          </Router>
        </ErrorBoundary>
      </SessionProvider>
    </LocationProvider>
  );
}

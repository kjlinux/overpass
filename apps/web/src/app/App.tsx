import { ErrorBoundary, LocationProvider, Route, Router } from "preact-iso";
import { LanguageShell } from "./LanguageShell";
import { RootRedirect } from "./RootRedirect";

/** Root component: location context, error boundary and top-level routes. */
export function App() {
  return (
    <LocationProvider>
      <ErrorBoundary>
        <Router>
          <Route path="/:lang" component={LanguageShell} />
          <Route path="/:lang/*" component={LanguageShell} />
          <Route default component={RootRedirect} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  );
}

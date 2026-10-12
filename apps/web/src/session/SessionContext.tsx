import type { Me } from "@overpass/shared";
import { createContext } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { useCallback, useContext, useEffect, useMemo, useState } from "preact/hooks";
import { apiRequest } from "./api";

/** me is undefined while loading or when the API is unreachable, null only when signed out. */
export type SessionState = {
  me: Me | null | undefined;
  unavailable: boolean;
  setMe: (me: Me | null) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<boolean>;
};

const SessionContext = createContext<SessionState>({
  me: null,
  unavailable: false,
  setMe: () => undefined,
  refresh: () => Promise.resolve(),
  signOut: () => Promise.resolve(false),
});

function useSessionState(): SessionState {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [unavailable, setUnavailable] = useState(false);
  const refresh = useCallback(async () => {
    setUnavailable(false);
    const result = await apiRequest<Me>("GET", "/v1/me");
    if (result.error === null) setMe(result.data);
    else if (result.error.code === "unauthorized") setMe(null);
    else setUnavailable(true);
  }, []);
  const signOut = useCallback(async () => {
    const result = await apiRequest<null>("POST", "/v1/auth/logout", {});
    if (result.error === null) setMe(null);
    return result.error === null;
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return useMemo(
    () => ({ me, unavailable, setMe, refresh, signOut }),
    [me, unavailable, refresh, signOut],
  );
}

export function SessionProvider({ children }: { children: ComponentChildren }): JSX.Element {
  return <SessionContext.Provider value={useSessionState()}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

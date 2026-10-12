import type { Me } from "@overpass/shared";
import { createContext } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { useCallback, useContext, useEffect, useMemo, useState } from "preact/hooks";
import { apiRequest } from "./api";

/** undefined while loading, null when signed out. */
export type SessionState = {
  me: Me | null | undefined;
  setMe: (me: Me | null) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState>({
  me: null,
  setMe: () => undefined,
  refresh: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
});

export function SessionProvider({ children }: { children: ComponentChildren }): JSX.Element {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const refresh = useCallback(async () => {
    const result = await apiRequest<Me>("GET", "/v1/me");
    setMe(result.data);
  }, []);
  const signOut = useCallback(async () => {
    await apiRequest<null>("POST", "/v1/auth/logout", {});
    setMe(null);
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const value = useMemo(() => ({ me, setMe, refresh, signOut }), [me, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

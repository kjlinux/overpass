import type { Pothole, RouteDetail, RouteSummary } from "@overpass/shared";

export type SearchRoutesParams = {
  query?: string | undefined;
  service?: string | undefined;
  country?: string | undefined;
  stack?: string | undefined;
  language?: "fr" | "en" | undefined;
};

export type SimulationParams = {
  provider: string;
  scenario: string;
  amount?: string | undefined;
  currency?: string | undefined;
};

export interface OverpassApiClient {
  searchRoutes(params: SearchRoutesParams): Promise<readonly RouteSummary[]>;
  getRoute(id: string): Promise<RouteDetail | null>;
  listPotholes(routeId?: string, service?: string): Promise<readonly Pothole[]>;
  simulatePayment(params: SimulationParams): Promise<Record<string, unknown>>;
}

export class HttpOverpassClient implements OverpassApiClient {
  constructor(
    private readonly baseUrl: string = process.env.API_URL ?? "http://127.0.0.1:3000",
    private readonly token: string | undefined = process.env.OVERPASS_TOKEN,
  ) {}

  async searchRoutes(params: SearchRoutesParams): Promise<readonly RouteSummary[]> {
    const qs = new URLSearchParams();
    if (params.query) qs.set("q", params.query);
    if (params.service) qs.set("service", params.service);
    if (params.country) qs.set("country", params.country);
    if (params.stack) qs.set("stack", params.stack);
    if (params.language) qs.set("language", params.language);
    const res = await this.fetch(`/v1/routes?${qs.toString()}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { items?: RouteSummary[] } };
    return json.data?.items ?? [];
  }

  async getRoute(id: string): Promise<RouteDetail | null> {
    const res = await this.fetch(`/v1/routes/${id}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: RouteDetail };
    return json.data ?? null;
  }

  async listPotholes(routeId?: string, service?: string): Promise<readonly Pothole[]> {
    if (routeId) {
      const detail = await this.getRoute(routeId);
      return detail?.potholes ?? [];
    }
    const routes = await this.searchRoutes({ service });
    const allPotholes: Pothole[] = [];
    for (const r of routes.slice(0, 5)) {
      const detail = await this.getRoute(r.id);
      if (detail) allPotholes.push(...detail.potholes);
    }
    return allPotholes;
  }

  async simulatePayment(params: SimulationParams): Promise<Record<string, unknown>> {
    const res = await this.fetch(`/v1/sandbox/${params.provider}/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenario: params.scenario,
        method: "POST",
        path: `/v1/${params.provider}/checkout`,
        body: { amount: params.amount ?? "1000", currency: params.currency ?? "XOF" },
      }),
    });
    if (!res.ok) return { error: `status_${String(res.status)}` };
    const json = (await res.json()) as { data?: Record<string, unknown> };
    return json.data ?? {};
  }

  private fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init?.headers);
    if (this.token) headers.set("authorization", `Bearer ${this.token}`);
    return fetch(url, { ...init, headers });
  }
}

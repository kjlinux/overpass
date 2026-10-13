import type { RouteDetail, RouteSummary, Service } from "@overpass/shared";

export const summary: RouteSummary = {
  id: "8d3c1f2e-1b4a-4c5d-9e6f-0a1b2c3d4e5f",
  service: { slug: "wave", name: "Wave", simulated: true },
  country: "CI",
  stack: "laravel",
  language: "fr",
  title: "Encaisser un paiement Wave Checkout depuis Laravel",
  author: "awa-k",
  version: 4,
  state: "clear",
  recentCheckers: 3,
  unresolvedPotholes: 1,
  lastCheckAt: "2026-10-09T12:00:00.000Z",
  updatedAt: "2026-10-02T12:00:00.000Z",
};

export const detail: RouteDetail = {
  ...summary,
  content:
    "## Prérequis\n\nUn compte marchand.\n\n## Recevoir le webhook\n\n```php\nabort_unless($ok, 401);\n```",
  fallback: false,
  translations: [{ id: summary.id, language: "fr" }],
  checks: [
    {
      id: "c1",
      handle: "kofi-dev",
      country: "CI",
      environment: "production",
      checkedAt: "2026-10-09T12:00:00.000Z",
    },
  ],
  potholes: [
    {
      id: "p1",
      handle: "fatou-dev",
      description: "Le webhook arrive parfois deux fois pour la même session.",
      status: "confirmed",
      createdAt: "2026-09-21T12:00:00.000Z",
      updatedAt: "2026-09-22T12:00:00.000Z",
    },
  ],
  viewer: { isAuthor: false, eligibility: "allowed", nextCheckAt: null },
};

export const services: Service[] = [
  { slug: "wave", name: "Wave", category: "payment", countries: ["CI", "SN"], simulated: true },
  {
    slug: "orange-money",
    name: "Orange Money",
    category: "payment",
    countries: ["CI"],
    simulated: false,
  },
];

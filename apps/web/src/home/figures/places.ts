export type PlacedCountry = { code: string; column: number; row: number };

const columns = 9;
const mapRows = 6;

/** Approximate place of each country of the services seed: nine longitude columns, six latitude rows. */
const places: Record<string, readonly [number, number]> = {
  SN: [2, 1],
  ML: [3, 1],
  NE: [6, 1],
  GM: [1, 2],
  BF: [4, 2],
  TD: [7, 2],
  GW: [1, 3],
  GN: [2, 3],
  BJ: [5, 3],
  CI: [3, 4],
  TG: [4, 4],
  CM: [6, 4],
  UG: [9, 5],
  GA: [6, 6],
  CG: [7, 6],
  CD: [8, 6],
};

/** Places the covered countries on the tile grid, in reading order; unknown codes go below the map. */
export function placeCountries(codes: readonly string[]): PlacedCountry[] {
  const known = codes.filter((code) => code in places);
  const unknown = codes.filter((code) => !(code in places));
  const mapped = known.map((code) => {
    const [column, row] = places[code] ?? [1, 1];
    return { code, column, row };
  });
  mapped.sort((a, b) => a.row - b.row || a.column - b.column);
  const extra = unknown.map((code, index) => ({
    code,
    column: (index % columns) + 1,
    row: mapRows + 1 + Math.floor(index / columns),
  }));
  return [...mapped, ...extra];
}

/**
 * Lightweight counts for homepage ability-map cards.
 * Update these when the knowledge maps change; `npm run build` verifies the maps themselves.
 */
export const abilityMapMeta = {
  algorithm: {
    templateCount: 12,
    practiceCount: 30,
  },
  system: {
    domainCount: 9,
    pointCount: 49,
  },
  agent: {
    domainCount: 9,
    pointCount: 209,
  },
} as const;

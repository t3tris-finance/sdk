import type { VaultSnapshot } from "./vault";

/** Inputs shared by the catalog and the Earn performance chart. */
export type PerformanceSnapshot = Pick<
  VaultSnapshot,
  "ts" | "pricePerShareEffective" | "totalNetAssets" | "totalSupply"
> &
  Partial<Pick<VaultSnapshot, "pricePerShare" | "trigger">>;

const YEAR = 365 * 86_400;
const WAD = 10n ** 18n;
const RATE_CLAMP = 10_000;
const MIN_TAIL_RATE_DT = 3_600;

type Nav = { ts: number; pps: number; tvl: number; assets: bigint; supply: bigint };

/** Effective assets include settlement gaps; a unit-rebased PPS is display-only. */
function effectiveAssets(row: PerformanceSnapshot): bigint {
  const supply = BigInt(row.totalSupply);
  const raw = BigInt(row.totalNetAssets ?? "0");
  if (row.pricePerShare !== undefined && row.pricePerShareEffective !== row.pricePerShare)
    return raw;
  return supply > 0n ? (BigInt(row.pricePerShareEffective) * supply) / WAD : raw;
}

/** Distinct valuation anchors, not every flat-price settlement or poll. */
export function valuationNavs(history: PerformanceSnapshot[]): Nav[] {
  const navs: Nav[] = [];
  let priorPps: string | null = null;
  for (const row of [...history].sort((a, b) => a.ts - b.ts)) {
    const ppsWad = BigInt(row.pricePerShareEffective || "0");
    if (ppsWad <= 0n) continue;
    const assets = effectiveAssets(row);
    const tvl = Number(assets);
    if (!(tvl > 0) || !Number.isFinite(tvl)) continue;
    if (
      navs.length === 0 &&
      row.trigger !== undefined &&
      row.trigger !== "valuation" &&
      row.trigger !== "migration"
    )
      continue;
    if (row.pricePerShareEffective === priorPps) continue;
    priorPps = row.pricePerShareEffective;
    navs.push({
      ts: row.ts,
      pps: Number(ppsWad) / Number(WAD),
      tvl,
      assets,
      supply: BigInt(row.totalSupply),
    });
  }
  // Normalize a mechanical supply split to the latest share basis without
  // changing TVL weights or claiming the split as yield.
  let factor = 1;
  for (let i = navs.length - 1; i > 0; i--) {
    const current = navs[i];
    const previous = navs[i - 1];
    if (!current || !previous) continue;
    current.pps *= factor;
    if (
      previous.assets > 0n &&
      previous.assets === current.assets &&
      previous.supply > 0n &&
      current.supply > 0n &&
      previous.supply !== current.supply
    ) {
      const priceRatio = current.pps / factor / previous.pps;
      const supplyRatio = Number(previous.supply) / Number(current.supply);
      if (Math.abs(priceRatio / supplyRatio - 1) < 0.01) factor *= priceRatio;
    }
  }
  if (navs[0]) navs[0].pps *= factor;
  return navs;
}

/** Linear, TVL-and-time-weighted APY with a prorated opening interval and a
 * bounded forward tail. A period with no in-window valuation is N/A. */
export function weightedApyUpTo(navs: Nav[], windowStart: number, upTo: number): number | null {
  const inWindow = navs.filter((nav) => nav.ts >= windowStart && nav.ts <= upTo);
  const first = inWindow[0];
  if (!first) return null;
  const prior = navs.filter((nav) => nav.ts < windowStart).at(-1);
  if (inWindow.length === 1) {
    if (!prior) return null;
    const dt = first.ts - prior.ts;
    return dt > 0 ? clamp(((first.pps / prior.pps - 1) * YEAR) / dt) : null;
  }
  let num = 0;
  let den = 0;
  for (let i = 1; i < inWindow.length; i++) {
    const a = inWindow[i - 1];
    const b = inWindow[i];
    if (!a || !b || b.ts <= a.ts || a.pps <= 0 || b.pps <= 0) continue;
    const tvl = (a.tvl + b.tvl) / 2;
    num += tvl * (b.pps / a.pps - 1);
    den += tvl * (b.ts - a.ts);
  }
  if (prior && first.ts > windowStart && first.ts > prior.ts && prior.pps > 0) {
    const tvl = (prior.tvl + first.tvl) / 2;
    const fraction = (first.ts - windowStart) / (first.ts - prior.ts);
    num += tvl * (first.pps / prior.pps - 1) * fraction;
    den += tvl * (first.ts - windowStart);
  }
  const last = inWindow.at(-1);
  let lastA = inWindow.at(-2);
  if (last) {
    for (let i = inWindow.length - 2; i >= 0; i--) {
      const candidate = inWindow[i];
      if (!candidate) break;
      lastA = candidate;
      if (last.ts - candidate.ts >= MIN_TAIL_RATE_DT) break;
    }
  }
  if (last && lastA && upTo > last.ts && last.ts > lastA.ts && lastA.pps > 0) {
    const dt = last.ts - lastA.ts;
    const tail = upTo - last.ts;
    num += last.tvl * ((last.pps / lastA.pps - 1) / dt) * Math.min(tail, dt);
    den += last.tvl * tail;
  }
  return den > 0 ? clamp((YEAR * num) / den) : null;
}

function clamp(value: number): number | null {
  return Number.isFinite(value) ? Math.max(-RATE_CLAMP, Math.min(RATE_CLAMP, value)) : null;
}

export type PerformanceRange = "D" | "W" | "M" | "Y" | "ALL";

/** The detail BFF's history identity is tier + timestamp (not block). Keep
 * the last ordered observation at a timestamp for chart/APY presentation;
 * the API's raw rows remain available and unchanged. */
export function canonicalPerformanceHistory<T extends PerformanceSnapshot & { tier: string }>(
  history: T[],
): T[] {
  const unique = new Map<string, T>();
  for (const row of history) unique.set(`${row.tier}:${row.ts}`, row);
  return [...unique.values()].sort((a, b) => a.ts - b.ts);
}

/** Chart's APY samples, including the range-specific leading segment. The
 * rightmost non-null sample is the number shown in the vault's APY tile. */
export function chartApyPoints(
  history: PerformanceSnapshot[],
  now: number,
  baseline: PerformanceSnapshot[],
  horizonSec: number,
  range: PerformanceRange,
): { ts: number; apy: number | null }[] {
  const plotted = history
    .filter((snapshot) => BigInt(snapshot.pricePerShareEffective || "0") > 0n)
    .sort((a, b) => a.ts - b.ts);
  const plotFrom = plotted[0]?.ts;
  if (plotFrom === undefined) return [];
  const navs = valuationNavs([...baseline.filter((row) => row.ts < plotFrom), ...plotted]);
  const start = Math.max(0, now - horizonSec);
  const points = plotted.map((snapshot) => ({
    ts: snapshot.ts,
    apy: weightedApyUpTo(navs, start, snapshot.ts),
  }));
  const last = points.at(-1);
  if (last && now > last.ts) points.push({ ...last, ts: now });
  const priorNavs = navs.filter((nav) => nav.ts < start);
  const prior = priorNavs.at(-1);
  const previous = priorNavs.at(-2);
  const firstInWindow = navs.find((nav) => nav.ts >= start);
  if (prior && firstInWindow) {
    const openingApy =
      range === "D"
        ? weightedApyUpTo(navs, start, firstInWindow.ts)
        : previous && range === "W"
          ? weightedApyUpTo([previous, prior], previous.ts, prior.ts)
          : previous && range === "M"
            ? weightedApyUpTo(priorNavs, Math.max(0, start - horizonSec), prior.ts)
            : null;
    if (openingApy !== null) {
      for (const point of points) {
        if (point.ts >= firstInWindow.ts) break;
        if (point.ts >= prior.ts) point.apy = openingApy;
      }
    }
  }
  return points;
}

export function latestChartApy(
  history: PerformanceSnapshot[],
  now: number,
  baseline: PerformanceSnapshot[],
  horizonSec: number,
  range: PerformanceRange,
): number | null {
  let latest: number | null = null;
  for (const point of chartApyPoints(history, now, baseline, horizonSec, range)) {
    if (point.apy !== null) latest = point.apy;
  }
  return latest;
}

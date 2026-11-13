const BITGET = process.env.BITGET_BASE_URL || "https://api.bitget.com";
const CG = process.env.COINGECKO_BASE_URL || "https://api.coingecko.com/api/v3";

function validPrice(value) {
  const n = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchBitgetSpot(symbols, fetcher = fetch) {
  const wanted = [...new Set(symbols)];
  if (!wanted.length || !wanted.every(s => /^[A-Z0-9]{3,16}$/.test(s))) {
    return { ok: false, data: {}, reason: "invalid_symbols" };
  }
  let res;
  try {
    const url = new URL("/api/v3/market/tickers?category=SPOT", BITGET);
    res = await fetcher(url.toString(), { signal: AbortSignal.timeout(12000) });
  } catch (_) {
    return { ok: false, data: {}, reason: "bitget_network_failure" };
  }
  if (!res || !res.ok) {
    return { ok: false, data: {}, reason: "bitget_http_error" };
  }
  const json = await res.json().catch(() => null);
  if (!json || json.code !== "00000" || !Array.isArray(json.data)) {
    return { ok: false, data: {}, reason: "bitget_invalid_response" };
  }

  const result = {};
  const target = new Set(wanted);
  for (const row of json.data) {
    if (!row || !target.has(row.symbol)) continue;
    const last = validPrice(row.lastPrice);
    if (last === null) continue;
    const pct = row.price24hPcnt == null || row.price24hPcnt === ""
      ? null : Number(row.price24hPcnt);
    result[row.symbol] = {
      last,
      change24hPct: pct !== null && Number.isFinite(pct) ? pct * 100 : null
    };
  }
  const missing = wanted.filter(symbol => !result[symbol]);
  return { ok: missing.length === 0, data: result,
           reason: missing.length ? "bitget_missing_symbols" : "ok", missing };
}

async function fetchCoinGeckoSpot(fetcher = fetch) {
  const ids = "bitcoin,ethereum,solana,pi-network";
  let res;
  try {
    res = await fetcher(`${CG}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(12000) });
  } catch (_) { return { ok: false, data: {}, reason: "coingecko_network_failure" }; }
  if (!res || !res.ok) return { ok: false, data: {}, reason: "coingecko_http_error" };
  const j = await res.json().catch(() => null);
  if (!j || typeof j !== "object") return { ok: false, data: {}, reason: "coingecko_bad_json" };
  const lookup = {
    BTCUSDT: j.bitcoin,
    ETHUSDT: j.ethereum,
    SOLUSDT: j.solana,
    PIUSDT: j["pi-network"]
  };
  const result = {};
  for (const [symbol, row] of Object.entries(lookup)) {
    const last = validPrice(row?.usd);
    if (last === null) continue;
    const pct = row.usd_24h_change == null ? null : Number(row.usd_24h_change);
    result[symbol] = { last, change24hPct: pct !== null && Number.isFinite(pct) ? pct : null };
  }
  const missing = Object.keys(lookup).filter(symbol => !result[symbol]);
  return { ok: missing.length === 0, data: result,
           reason: missing.length ? "coingecko_missing_symbols" : "ok", missing };
}

module.exports = { fetchBitgetSpot, fetchCoinGeckoSpot };

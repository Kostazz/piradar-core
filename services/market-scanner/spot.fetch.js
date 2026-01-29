const BITGET = process.env.BITGET_BASE_URL || "https://api.bitget.com";
const CG = process.env.COINGECKO_BASE_URL || "https://api.coingecko.com/api/v3";

async function fetchBitgetSpot(symbols /* e.g. BTCUSDT */) {
  const url = `${BITGET}/api/spot/v1/market/tickers`;
  const res = await fetch(url);
  if (!res.ok) return { ok: false, data: null, reason: `bitget_http_${res.status}` };
  const json = await res.json().catch(() => null);
  const arr = json?.data || [];
  const wanted = new Set(symbols);
  const out = {};
  for (const row of arr) {
    if (wanted.has(row.symbol)) {
      out[row.symbol] = {
        last: Number(row.close) || null,
        change24hPct: row.chgUTC ? Number(row.chgUTC) * 100 : (Number(row.changeUtc) || null)
      };
    }
  }
  const ok = Object.keys(out).length >= Math.min(2, symbols.length);
  return { ok, data: out, reason: ok ? "ok" : "bitget_partial" };
}

async function fetchCoinGeckoSpot() {
  // BTC, ETH, SOL, PI
  const ids = "bitcoin,ethereum,solana,pi-network";
  const url = `${CG}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) return { ok: false, data: null, reason: `coingecko_http_${res.status}` };
  const j = await res.json().catch(() => null);
  if (!j) return { ok: false, data: null, reason: "coingecko_bad_json" };

  const map = {
    BTCUSDT: j.bitcoin,
    ETHUSDT: j.ethereum,
    SOLUSDT: j.solana,
    PIUSDT: j["pi-network"]
  };

  const out = {};
  for (const [sym, row] of Object.entries(map)) {
    if (!row) continue;
    out[sym] = { last: Number(row.usd) || null, change24hPct: Number(row.usd_24h_change) || null };
  }
  return { ok: true, data: out, reason: "ok" };
}

module.exports = { fetchBitgetSpot, fetchCoinGeckoSpot };

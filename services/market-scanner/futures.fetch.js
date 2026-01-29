const BASE = process.env.BITGET_BASE_URL || "https://api.bitget.com";
const PRODUCT_TYPE = process.env.BITGET_PRODUCT_TYPE || "usdt-futures";

function toV2Symbol(sym) {
  if (!sym) return sym;
  if (sym.includes("_")) sym = sym.split("_")[0];
  if (!sym.endsWith("USDT")) sym = `${sym}USDT`;
  return sym;
}

async function getJson(path, params) {
  const url = new URL(BASE + path);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { method: "GET", headers: { "Content-Type": "application/json" } });

  let data = null;
  try { data = await res.json(); } catch (_) {}

  if (!res.ok) {
    const code = data?.code || data?.data?.code || res.status;
    const msg = data?.msg || data?.message || data?.data?.msg || "http_error";
    return { ok: false, status: res.status, code, msg };
  }

  if (data && data.code && data.code !== "00000") {
    return { ok: false, status: 200, code: data.code, msg: data.msg || "api_error" };
  }

  return { ok: true, data: data?.data };
}

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function fetchFundingRateV2(symbolV2) {
  const r = await getJson("/api/v2/mix/market/current-fund-rate", {
    symbol: symbolV2,
    productType: PRODUCT_TYPE
  });
  if (!r.ok) return { fundingRate: null, _err: r };
  const payload = Array.isArray(r.data) ? r.data[0] : r.data;
  return { fundingRate: toNum(payload?.fundingRate), _err: null };
}

async function fetchOpenInterestV2(symbolV2) {
  const r = await getJson("/api/v2/mix/market/open-interest", {
    symbol: symbolV2,
    productType: PRODUCT_TYPE
  });
  if (!r.ok) return { openInterest: null, _err: r };
  const payload = Array.isArray(r.data) ? r.data[0] : r.data;
  const oi = payload?.openInterest ?? payload?.openInterestAmount ?? payload?.amount ?? payload?.openInterestValue ?? null;
  return { openInterest: toNum(oi), _err: null };
}

async function fetchMarkPriceV2(symbolV2) {
  const r = await getJson("/api/v2/mix/market/mark-price", {
    symbol: symbolV2,
    productType: PRODUCT_TYPE
  });
  if (!r.ok) return { markPrice: null, _err: r };
  const payload = Array.isArray(r.data) ? r.data[0] : r.data;
  return { markPrice: toNum(payload?.markPrice), _err: null };
}

async function fetchFuturesEdge(symbols) {
  const out = {};
  const errors = [];
  const ts = Date.now();

  for (const s of symbols || []) {
    const symbolV2 = toV2Symbol(s);

    const [fr, oi, mp] = await Promise.all([
      fetchFundingRateV2(symbolV2),
      fetchOpenInterestV2(symbolV2),
      fetchMarkPriceV2(symbolV2)
    ]);

    if (fr._err) errors.push({ symbol: symbolV2, what: "funding", ...fr._err });
    if (oi._err) errors.push({ symbol: symbolV2, what: "openInterest", ...oi._err });
    if (mp._err) errors.push({ symbol: symbolV2, what: "markPrice", ...mp._err });

    out[symbolV2] = {
      symbol: symbolV2,
      fundingRate: fr.fundingRate,
      openInterest: oi.openInterest,
      markPrice: mp.markPrice,
      ts
    };
  }

  return { symbols: out, errors };
}

module.exports = { fetchFuturesEdge, toV2Symbol };

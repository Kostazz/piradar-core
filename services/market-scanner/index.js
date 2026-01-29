require("dotenv").config();

const { fetchFuturesEdge } = require("./futures.fetch");
const { fetchBitgetSpot, fetchCoinGeckoSpot } = require("./spot.fetch");
const { notify } = require("./notifier");

const INTERVAL = Number(process.env.SCAN_INTERVAL_MS || 30000);
const EXTREME = Number(process.env.ALERT_EXTREME_24H_PCT || 6);

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "PIUSDT"];
const FUTURES_SYMBOLS = ["BTCUSDT", "SOLUSDT"];

function iso() { return new Date().toISOString(); }
function fmtPct(x) { return x == null ? "n/a" : `${x.toFixed(2)}%`; }
function fmtNum(x, d = 2) { return x == null ? "n/a" : Number(x).toFixed(d); }

async function tick() {
  // SPOT
  const spot1 = await fetchBitgetSpot(SYMBOLS);
  let spot = spot1;
  if (!spot1.ok) {
    console.log("[piradar-market-scanner]", iso(), "spot source switched → coingecko (data quality)", spot1.reason);
    spot = await fetchCoinGeckoSpot();
  }

  // FUTURES EDGE
  const futures = await fetchFuturesEdge(FUTURES_SYMBOLS);

  // Log snapshot
  const snap = {
    type: "market_snapshot",
    ts: Date.now(),
    iso: iso(),
    intervalMs: INTERVAL,
    spotSource: spot1.ok ? "bitget" : "coingecko",
    spotOk: !!spot.ok,
    spotReason: spot.reason,
    symbols: spot.data || {},
    futures: futures || {}
  };

  console.log("[piradar-market-scanner]", JSON.stringify(snap));

  // Simple signal: extreme 24h move
  const signals = [];
  for (const s of ["BTCUSDT", "ETHUSDT", "SOLUSDT", "PIUSDT"]) {
    const ch = spot.data?.[s]?.change24hPct;
    if (ch != null && Math.abs(ch) >= EXTREME) {
      signals.push(`${s.replace("USDT","")}: ${fmtPct(ch)}`);
    }
  }

  if (signals.length) {
    const btcF = futures.symbols?.BTCUSDT?.fundingRate;
    const solF = futures.symbols?.SOLUSDT?.fundingRate;
    const msg =
`PiRadar Signal ⚡ ${iso()}
Extreme 24h move: ${signals.join(" | ")}
Futures: BTC funding=${fmtNum(btcF, 6)} | SOL funding=${fmtNum(solF, 6)}`;
    await notify(msg);
  }
}

async function main() {
  console.log("[piradar-market-scanner]", iso(), `boot (interval=${INTERVAL}ms)`);
  await tick().catch((e) => console.error("[piradar-market-scanner] tick_error", e));
  setInterval(() => tick().catch((e) => console.error("[piradar-market-scanner] tick_error", e)), INTERVAL);
}

main();

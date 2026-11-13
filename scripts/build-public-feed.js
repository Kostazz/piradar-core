#!/usr/bin/env node
"use strict";
// Single canonical read-only feed builder. Failure preserves last good snapshot.
const fs = require("node:fs");
const path = require("node:path");
const { fetchBitgetSpot } = require("../services/market-scanner/spot.fetch");
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "PIUSDT"];
function normalizeSnapshot(spot, at = new Date()) {
  if (!spot || !spot.ok || !spot.data || !SYMBOLS.every(s =>
      Number.isFinite(spot.data[s]?.last) && spot.data[s].last > 0)) {
    throw new Error("MARKET_FEED_DEGRADED: incomplete or unverified Bitget v3 data");
  }
  return {
    schema_version: 2, source: "bitget-v3-spot", status: "OK",
    timestamp: at.toISOString(),
    data: SYMBOLS.map(symbol => {
      const row = spot.data[symbol];
      const pct = Number.isFinite(row.change24hPct) ? row.change24hPct / 100 : null;
      return {
        symbol,
        close: String(row.last), chgUTC: pct, // legacy aliases
        lastPrice: String(row.last), price24hPcnt: pct // v3 fields
      };
    })
  };
}
function writeSnapshot(snapshot, root = path.resolve(__dirname, "..")) {
  const output = JSON.stringify(snapshot, null, 2) + "\n";
  const files = ["out/priceSnapshot.json", "public/feed/now.json", "docs/feed/now.json"];
  for (const relative of files) {
    const filename = path.resolve(root, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, output, { mode: 0o644 });
  }
  return files;
}
async function build({ fetcher = fetchBitgetSpot, root, at } = {}) {
  const spot = await fetcher(SYMBOLS);
  const snapshot = normalizeSnapshot(spot, at || new Date());
  return { snapshot, files: writeSnapshot(snapshot, root) };
}
if (require.main === module) {
  build().then(({ snapshot }) => {
    console.log("VERIFIED_FEED", snapshot.timestamp, snapshot.data.map(x => x.symbol).join(","));
  }).catch(error => {
    console.error(error.message.startsWith("MARKET_FEED_") ? error.message :
      "MARKET_FEED_DEGRADED: market data unavailable");
    process.exitCode = 1;
  });
}
module.exports = { build, normalizeSnapshot, writeSnapshot, SYMBOLS };

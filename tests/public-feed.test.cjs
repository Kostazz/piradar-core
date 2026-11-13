"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { fetchBitgetSpot, fetchCoinGeckoSpot } = require("../services/market-scanner/spot.fetch");
const { build, normalizeSnapshot, SYMBOLS } = require("../scripts/build-public-feed");

const v3 = () => ({ code: "00000", data: SYMBOLS.map((symbol, i) => ({
  symbol, lastPrice: String(10 + i), price24hPcnt: i === 0 ? "0" : "-0.025"
})) });
const fake = (body, status = 200) => async (url) => {
  assert.match(url, /\/api\/v3\/market\/tickers\?category=SPOT$/);
  return { ok: status === 200, status, json: async () => body };
};
test("Bitget v3 selects all four symbols, 24h percentage sign and zero change", async () => {
  const res = await fetchBitgetSpot(SYMBOLS, fake(v3()));
  assert.equal(res.ok, true);
  assert.equal(res.data.BTCUSDT.change24hPct, 0);
  assert.equal(res.data.ETHUSDT.change24hPct, -2.5);
  assert.equal(res.data.PIUSDT.last, 13);
});
test("Reject HTTP 200 invalid API code, malformed rows, missing pair, zero price and errors", async () => {
  for (const payload of [
    {code:"10001",data:v3().data},
    {code:"00000",data:[]},
    {code:"00000",data:v3().data.slice(0,-1)},
    {code:"00000",data:v3().data.map(x => x.symbol === "BTCUSDT" ? {...x,lastPrice:"0"} : x)},
    {code:"00000",data:null}
  ]) {
    assert.equal((await fetchBitgetSpot(SYMBOLS, fake(payload))).ok, false);
  }
  assert.equal((await fetchBitgetSpot(SYMBOLS, fake(v3(), 500))).ok, false);
  assert.equal((await fetchBitgetSpot(SYMBOLS, async () => { throw Error("timeout"); })).ok, false);
});
test("Fallback CoinGecko doesn't pretend success on empty response", async () => {
  const response = async () => ({ ok:true, json:async () => ({}) });
  const out = await fetchCoinGeckoSpot(response);
  assert.equal(out.ok, false);
  assert.deepEqual(out.data, {});
});
test("Snapshot preserves v1 close/chgUTC aliases with explicit new provenance", () => {
  const data = Object.fromEntries(SYMBOLS.map((symbol,i) => [symbol,{
    last: i+1, change24hPct: i===0 ? 0 : 12.5
  }]));
  const snap=normalizeSnapshot({ok:true,data},new Date("2026-11-13T21:00:00Z"));
  assert.equal(snap.source,"bitget-v3-spot");
  assert.equal(snap.status,"OK");
  assert.equal(snap.data[0].chgUTC,0);
  assert.equal(snap.data[1].price24hPcnt,0.125);
  assert.equal(snap.data[3].symbol,"PIUSDT");
});
test("Failed validation doesn't overwrite any existing last-good files",async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"piradar-core-feed-"));
  try {
    const files=["out/priceSnapshot.json","public/feed/now.json","docs/feed/now.json"];
    for (const f of files) {
      fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});
      fs.writeFileSync(path.join(root,f),"last-good-snapshot\n");
    }
    await assert.rejects(build({root, fetcher:async()=>({ok:false,reason:"bad_api",data:{}})}), /MARKET_FEED_DEGRADED/);
    for (const f of files) assert.equal(fs.readFileSync(path.join(root,f),"utf8"),"last-good-snapshot\n");
    const data=Object.fromEntries(SYMBOLS.map(s=>[s,{last:100,change24hPct:0}]));
    const res=await build({root,fetcher:async()=>({ok:true,data}),at:new Date("2026-11-13T21:00:00Z")});
    assert.equal(res.files.length,3);
    for (const f of files) assert.equal(JSON.parse(fs.readFileSync(path.join(root,f),"utf8")).data.length,4);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

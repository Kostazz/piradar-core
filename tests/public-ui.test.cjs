"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

test("open tab refreshes current feed and expires unrefreshed prices", async () => {
  let now = Date.parse("2026-11-13T21:00:00Z");
  const events = {}, windowEvents = {};
  const make = () => ({
    textContent: "", children: [],
    classList: {add(){},remove(){}},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; }
  });
  const headline = make(), details = make(), rates = make(), state = make();
  const fields = {headline,details,rates};
  const document = {
    visibilityState:"visible",
    getElementById(id) { return fields[id]; },
    querySelector(selector) { assert.equal(selector,".state"); return state; },
    createElement() {return make();},
    addEventListener(event,fn){events[event]=fn;}
  };
  const window = {addEventListener(event,fn){windowEvents[event]=fn;}};
  const symbol = ["BTCUSDT","ETHUSDT","SOLUSDT","PIUSDT"];
  const payload = {
    source:"bitget-v3-spot",status:"OK",timestamp:"2026-11-13T21:00:00Z",
    data:symbol.map(s=>({symbol:s,lastPrice:"10",price24hPcnt:0}))
  };
  const timers = new Map();
  let fetchCount = 0;
  class Clock extends Date { static now() {return now;} }
  const sandbox = {
    document,window,Date:Clock,
    setInterval(fn,period){ timers.set(period, fn); },
    fetch:async()=>{ fetchCount++; return {ok:true,json:async()=>payload}; }
  };
  const source=fs.readFileSync(path.resolve(__dirname,"../docs/app.js"),"utf8");
  vm.runInNewContext(source,sandbox);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(headline.textContent,"Ověřený snapshot");
  assert.equal(rates.children.length,4);
  assert.equal(timers.size, 2);
  assert.equal(fetchCount, 1);
  now += 46 * 60 * 1000;
  timers.get(60000)();
  assert.match(headline.textContent,/nejsou dostupná/);
  assert.equal(rates.children.length,0);
  // A healthy provider publishes a new snapshot; the 5-minute poll recovers without reload.
  payload.timestamp = new Date(now).toISOString();
  timers.get(300000)();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(fetchCount, 2);
  assert.equal(headline.textContent, "Ověřený snapshot");
  assert.equal(rates.children.length, 4);
  // Hidden tabs must not poll; they revalidate when visible again.
  document.visibilityState = "hidden";
  timers.get(300000)();
  assert.equal(fetchCount, 2);
  document.visibilityState = "visible";
  now += 46 * 60 * 1000;
  timers.get(60000)();
  assert.equal(rates.children.length, 0);
  events.visibilitychange();
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(headline.textContent,/nejsou dostupná/);
  assert.equal(fetchCount, 3);
  windowEvents.pageshow();
  assert.equal(rates.children.length,0);
});

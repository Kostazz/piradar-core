"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

test("public prices expire during an open browser tab and on tab return", async () => {
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
  let timer;
  class Clock extends Date { static now() {return now;} }
  const sandbox = {
    document,window,Date:Clock,
    setInterval(fn,period){ assert.equal(period,60000);timer=fn; },
    fetch:async()=>({ok:true,json:async()=>payload})
  };
  const source=fs.readFileSync(path.resolve(__dirname,"../docs/app.js"),"utf8");
  vm.runInNewContext(source,sandbox);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(headline.textContent,"Ověřený snapshot");
  assert.equal(rates.children.length,4);
  now += 46 * 60 * 1000;
  timer();
  assert.match(headline.textContent,/nejsou dostupná/);
  assert.equal(rates.children.length,0);
  events.visibilitychange();
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(headline.textContent,/nejsou dostupná/);
  windowEvents.pageshow();
  assert.equal(rates.children.length,0);
});

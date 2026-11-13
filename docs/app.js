"use strict";
const headline = document.getElementById("headline");
const details = document.getElementById("details");
const rates = document.getElementById("rates");
const state = document.querySelector(".state");
const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "PIUSDT"];
function unavailable(reason) {
  state.classList.add("stale");
  headline.textContent = "Ověřená aktuální data nejsou dostupná";
  details.textContent = reason + " Nepoužívej tento přehled k obchodnímu rozhodnutí.";
  rates.replaceChildren();
}
async function load() {
  let response, data;
  try {
    response = await fetch("./feed/now.json", { cache:"no-store" });
    if (!response.ok) throw Error("HTTP status " + response.status);
    data = await response.json();
  } catch (_) {
    unavailable("Snapshot není dostupný.");
    return;
  }
  const time = Date.parse(data?.timestamp || "");
  const age = Date.now() - time;
  const items = new Map(Array.isArray(data?.data) ? data.data.map(x => [x?.symbol,x]) : []);
  const valid = data?.status === "OK" && data?.source === "bitget-v3-spot" &&
    Number.isFinite(time) && age >= -120000 && age <= 45 * 60000 &&
    symbols.every(s => {
      const n = Number(items.get(s)?.lastPrice);
      return items.has(s) && Number.isFinite(n) && n > 0;
    });
  if (!valid) {
    unavailable("Snapshot je zastaralý, neúplný nebo má neověřený zdroj.");
    return;
  }
  headline.textContent = "Ověřený snapshot";
  details.textContent = "Bitget Spot · UTC: " + new Date(time).toISOString() +
    " · Stáří: " + Math.round(age / 60000) + " min.";
  rates.replaceChildren(...symbols.map(symbol => {
    const row=items.get(symbol), li=document.createElement("li");
    const title=document.createElement("strong"), value=document.createElement("span");
    const meta=document.createElement("small");
    title.textContent=symbol.replace("USDT","/USDT");
    value.textContent="Poslední cena: " + String(row.lastPrice) + " USDT";
    const change = Number(row.price24hPcnt);
    meta.textContent = Number.isFinite(change) && row.price24hPcnt !== null ?
      "Změna 24 h: " + (change*100).toFixed(2) + " %" : "Změna 24 h: nedostupná";
    li.append(title,value,document.createElement("br"),meta);
    return li;
  }));
}
load();

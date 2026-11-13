"use strict";
const headline = document.getElementById("headline");
const details = document.getElementById("details");
const rates = document.getElementById("rates");
const state = document.querySelector(".state");
const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "PIUSDT"];
const MAX_AGE_MS = 45 * 60 * 1000;
let verifiedAt = null;
function unavailable(reason) {
  verifiedAt = null;
  state.classList.add("stale");
  headline.textContent = "Ověřená aktuální data nejsou dostupná";
  details.textContent = reason + " Nepoužívej tento přehled k obchodnímu rozhodnutí.";
  rates.replaceChildren();
}
function enforceFreshness() {
  if (verifiedAt === null) return;
  const elapsed = Date.now() - verifiedAt;
  if (elapsed < -120000 || elapsed > MAX_AGE_MS) {
    unavailable("Platnost dat vypršela.");
    return;
  }
  details.textContent = "Bitget Spot · UTC: " + new Date(verifiedAt).toISOString() +
    " · Stáří: " + Math.max(0,Math.round(elapsed / 60000)) + " min.";
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
    Number.isFinite(time) && age >= -120000 && age <= MAX_AGE_MS &&
    symbols.every(s => {
      const n = Number(items.get(s)?.lastPrice);
      return items.has(s) && Number.isFinite(n) && n > 0;
    });
  if (!valid) {
    unavailable("Snapshot je zastaralý, neúplný nebo má neověřený zdroj.");
    return;
  }
  verifiedAt = time;
  state.classList.remove("stale");
  headline.textContent = "Ověřený snapshot";
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
  enforceFreshness();
}
setInterval(enforceFreshness, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { enforceFreshness(); void load(); }
});
window.addEventListener("pageshow", () => { enforceFreshness(); });
window.addEventListener("focus", () => { enforceFreshness(); void load(); });
void load();

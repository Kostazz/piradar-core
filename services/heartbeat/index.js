const os = require("os");

function nowIso() {
  return new Date().toISOString();
}

setInterval(() => {
  const mem = process.memoryUsage();
  const info = {
    type: "heartbeat",
    ts: nowIso(),
    host: os.hostname(),
    uptimeSec: Math.floor(process.uptime()),
    rssMb: Math.round(mem.rss / 1024 / 1024),
    heapMb: Math.round(mem.heapUsed / 1024 / 1024)
  };
  console.log("[piradar-heartbeat]", JSON.stringify(info));
}, 60_000);

console.log("[piradar-heartbeat] boot", nowIso());

module.exports = {
  apps: [
    {
      name: "piradar-heartbeat",
      script: "services/heartbeat/index.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "250M",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "piradar-market-scanner",
      script: "services/market-scanner/index.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "450M",
      env: {
        NODE_ENV: "production",
        SCAN_INTERVAL_MS: "30000",
        PREFERRED_SPOT_SOURCE: "bitget",
        BITGET_BASE_URL: "https://api.bitget.com",
        BITGET_PRODUCT_TYPE: "usdt-futures",
        COINGECKO_BASE_URL: "https://api.coingecko.com/api/v3"
      }
    }
  ]
};

# PiRadar Core (VM Runtime)

Repo contains:
- GitHub Actions feed publisher (cron snapshot → `public/feed/now.json`)
- VM runtime for 24/7 market scanner + heartbeat (PM2)

## VM Setup (Ubuntu)
```bash
sudo apt-get update
sudo apt-get install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -g pm2

git clone <REPO_URL> piradar
cd piradar
cp .env.example .env
npm i

pm2 start ecosystem.config.cjs --update-env
pm2 save
pm2 status

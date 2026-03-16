# Competitor Monitor - Docker Deployment

## Quick Start

```bash
# 1. Create .env.production from template
cp .env.production.example .env.production

# 2. Edit .env.production and paste your VPN config:
#    - OPENVPN_CONFIG (paste entire .ovpn content)
#    - OPENVPN_USERNAME (from Proton VPN settings)
#    - OPENVPN_PASSWORD (from Proton VPN settings)

# 3. Build and run
docker-compose up -d

# 4. Check logs
docker-compose logs -f
```

## Environment Variables

Create `.env.production` file with:

### Required
```bash
RESEND_API_KEY=re_xxx
PUBLIC_URL=https://your-domain.com
```

### VPN (Optional)
```bash
# Option 1: Paste raw OpenVPN config
OPENVPN_CONFIG="
[paste entire .ovpn file content here]
"

# Option 2: Base64 encoded (easier)
OPENVPN_CONFIG_BASE64=[base64 encoded .ovpn]

# Credentials (from Proton VPN Settings > OpenVPN/IKEv2)
OPENVPN_USERNAME=your_username
OPENVPN_PASSWORD=your_password
```

## How to Get VPN Config

1. Log in to [account.protonvpn.com](https://account.protonvpn.com)
2. Go to **Downloads** → **OpenVPN configuration**
3. Choose server (free: US, NL, JP)
4. Download `.ovpn` file
5. Open file, copy ALL content
6. Paste into `OPENVPN_CONFIG` in `.env.production`
7. Get credentials from **Settings** → **OpenVPN / IKEv2**

## Deployment

### With VPN
```bash
# .env.production has OPENVPN_* vars
docker-compose up -d
```

### Without VPN
```bash
# .env.production has no OPENVPN_* vars
docker-compose up -d
```

## Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up -d --build

# Shell
docker-compose exec app /bin/bash

# Check VPN IP
docker-compose exec app curl https://api.ipify.org
```

## Security

- ✅ VPN credentials in `.env.production` (not committed to git)
- ✅ `.env*` in `.gitignore`
- ✅ Auth file deleted after VPN starts
- ✅ Config stored in temp (cleared on restart)

## Troubleshooting

**VPN won't connect:**
```bash
docker-compose exec app cat /var/log/openvpn.log
```

**Invalid config:**
```bash
# Test base64 encoding
cat protonvpn.ovpn | base64 -w 0
```

**Permission denied:**
```bash
# Ensure Docker has NET_ADMIN capability
docker-compose down
docker-compose up -d
```

## Example .env.production

```bash
# App
PORT=3000
NODE_ENV=production
DATABASE_PATH=/app/data/competitor-monitor.db

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx

# Public URL
PUBLIC_URL=https://competitors.yourdomain.com

# VPN - Option 1 (base64, recommended)
OPENVPN_CONFIG_BASE64=Y2xpZW50CmRldiB0dW4KcHJvdG8gdWRw...
OPENVPN_USERNAME=abc123
OPENVPN_PASSWORD=xyz789

# VPN - Option 2 (raw config)
# OPENVPN_CONFIG="
# client
# dev tun
# proto udp
# remote us-free-01.protonvpn.com 1194
# ...
# "
```

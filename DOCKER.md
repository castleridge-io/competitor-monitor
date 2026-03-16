# Competitor Monitor - Docker Deployment

## Quick Start

```bash
# 1. Add VPN config
cp ~/Downloads/protonvpn.ovpn vpn/protonvpn.ovpn
cat > vpn/protonvpn-auth.txt << EOF
YOUR_OPENVPN_USERNAME
YOUR_OPENVPN_PASSWORD
EOF

# 2. Set environment
cp .env.example .env
# Edit .env with your values

# 3. Build and run
docker-compose up -d

# 4. Check logs
docker-compose logs -f
```

## How It Works

- Docker container runs OpenVPN + Node.js app
- Only scraper traffic goes through VPN
- API accessible on port 3000 (no VPN)
- VPN config mounted as read-only

## Environment Variables

Create `.env` file:

```bash
RESEND_API_KEY=re_xxx
PUBLIC_URL=https://your-domain.com
```

## Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build

# Shell into container
docker-compose exec app /bin/bash

# Check VPN status
docker-compose exec app curl https://api.ipify.org
```

## VPN Configuration

Required files:
- `vpn/protonvpn.ovpn` - OpenVPN config (from Proton VPN)
- `vpn/protonvpn-auth.txt` - Credentials (2 lines: username, password)

These are mounted read-only into container.

## Without VPN

If you don't want VPN:

```bash
# Remove VPN files
rm vpn/protonvpn.ovpn vpn/protonvpn-auth.txt

# Container will start without VPN
docker-compose up -d
```

## Troubleshooting

**VPN won't connect:**
```bash
# Check VPN logs
docker-compose exec app cat /var/log/openvpn.log
```

**Container won't start:**
```bash
# Check logs
docker-compose logs app

# Test manually
docker-compose run --rm app /bin/bash
```

**Permission denied (NET_ADMIN):**
- Ensure Docker has CAP_NET_ADMIN capability
- On some systems, may need: `sudo setcap cap_net_admin=+ep /usr/sbin/openvpn`

## Production Deployment

```bash
# Build image
docker build -t competitor-monitor .

# Run with VPN
docker run -d \
  --name competitor-monitor \
  -p 3000:3000 \
  --cap-add NET_ADMIN \
  --device /dev/net/tun \
  -v $(pwd)/vpn/protonvpn.ovpn:/vpn/protonvpn.ovpn:ro \
  -v $(pwd)/vpn/protonvpn-auth.txt:/vpn/protonvpn-auth.txt:ro \
  -v $(pwd)/data:/app/data \
  -e RESEND_API_KEY=re_xxx \
  -e PUBLIC_URL=https://your-domain.com \
  competitor-monitor
```

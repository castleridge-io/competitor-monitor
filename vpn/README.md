# Proton VPN Setup for Competitor Monitor

This directory contains VPN configuration for secure scraping.

## Files

| File | Purpose |
|------|---------|
| `protonvpn.ovpn.example` | Template OpenVPN config |
| `protonvpn-auth.txt.example` | Template credentials file |
| `setup-vpn.sh` | Install and configure VPN |
| `auto-reconnect-vpn.sh` | Keep VPN alive |

## Setup Instructions

### 1. Get Proton VPN Config

1. Log in to [account.protonvpn.com](https://account.protonvpn.com)
2. Go to **Downloads** > **OpenVPN configuration**
3. Choose a server (free tier: US, Netherlands, Japan)
4. Download `.ovpn` file

### 2. Get OpenVPN Credentials

1. Go to **Settings** > **OpenVPN / IKEv2 credentials**
2. View your credentials (different from account login!)
3. Note the **username** and **password**

### 3. Configure VPS

**Option A: Copy files to VPS**

```bash
# Copy config
scp protonvpn.ovpn root@YOUR_VPS_IP:/etc/openvpn/protonvpn.ovpn

# Create auth file
ssh root@YOUR_VPS_IP
cat > /etc/openvpn/protonvpn-auth.txt << EOF
YOUR_OPENVPN_USERNAME
YOUR_OPENVPN_PASSWORD
EOF
chmod 600 /etc/openvpn/protonvpn-auth.txt

# Run setup
./setup-vpn.sh
```

**Option B: Paste directly**

```bash
ssh root@YOUR_VPS_IP

# Paste config
nano /etc/openvpn/protonvpn.ovpn
# (paste content from downloaded .ovpn file)

# Create auth
nano /etc/openvpn/protonvpn-auth.txt
# Line 1: username
# Line 2: password

chmod 600 /etc/openvpn/protonvpn-auth.txt
```

### 4. Run Setup

```bash
chmod +x setup-vpn.sh
sudo ./setup-vpn.sh
```

### 5. Enable Auto-Reconnect

```bash
# Add to crontab (check every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * /root/auto-reconnect-vpn.sh >> /var/log/vpn-watchdog.log 2>&1
```

## Usage

```bash
# Start VPN
systemctl start openvpn@protonvpn

# Stop VPN
systemctl stop openvpn@protonvpn

# Check status
systemctl status openvpn@protonvpn

# Verify IP
curl https://api.ipify.org
```

## Security Notes

- ✅ Auth file is chmod 600 (only root can read)
- ✅ VPN starts on boot
- ✅ Auto-reconnect if connection drops
- ⚠️ Never commit `protonvpn-auth.txt` to git

## Troubleshooting

**VPN won't connect:**
```bash
# Check logs
tail -f /var/log/syslog | grep openvpn

# Test manually
openvpn --config /etc/openvpn/protonvpn.ovpn
```

**DNS leaks:**
```bash
# Test at: https://dnsleaktest.com
# Or use:
curl https://api.dnsleaktest.com/v1/dnsleak
```

**Slow speeds:**
- Try different Proton VPN servers
- Use UDP protocol (faster than TCP)
- Check server load at protonvpn.com

## Free Tier Limits

- 3 server locations (US, NL, JP)
- 1 device
- No P2P
- Medium speed

For production, consider:
- Proton VPN Plus ($5/mo)
- Residential proxies ($75+/mo)

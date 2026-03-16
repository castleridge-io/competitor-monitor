#!/bin/bash
# setup-vpn.sh - Install and configure Proton VPN via OpenVPN
# 
# Usage: sudo ./setup-vpn.sh

set -e

echo "🔐 Setting up Proton VPN (OpenVPN)..."

# Install OpenVPN
apt-get update
apt-get install -y openvpn

# Create directories
mkdir -p /etc/openvpn

# Copy config files (you need to provide these)
if [ ! -f "/etc/openvpn/protonvpn.ovpn" ]; then
  echo "⚠️  Please copy your Proton VPN OpenVPN config:"
  echo "   scp protonvpn.ovpn root@vps:/etc/openvpn/protonvpn.ovpn"
  echo ""
  echo "Or paste the .ovpn content directly to /etc/openvpn/protonvpn.ovpn"
  exit 1
fi

# Copy auth file
if [ ! -f "/etc/openvpn/protonvpn-auth.txt" ]; then
  echo "⚠️  Please create /etc/openvpn/protonvpn-auth.txt with:"
  echo "   Line 1: Your OpenVPN username"
  echo "   Line 2: Your OpenVPN password"
  echo ""
  echo "Get credentials from: account.protonvpn.com > Settings > OpenVPN / IKEv2"
  exit 1
fi

# Secure auth file
chmod 600 /etc/openvpn/protonvpn-auth.txt

# Test connection
echo "🔌 Testing VPN connection..."
openvpn --config /etc/openvpn/protonvpn.ovpn --daemon

sleep 5

# Verify connection
if curl -s --max-time 10 https://api.protonvpn.ch/vpn/location | grep -q "IP"; then
  echo "✅ VPN connected successfully!"
  echo ""
  echo "Your new IP:"
  curl -s https://api.ipify.org
else
  echo "❌ VPN connection failed"
  echo "Check logs: tail -f /var/log/syslog | grep openvpn"
  exit 1
fi

# Enable auto-start on boot
systemctl enable openvpn@protonvpn

echo ""
echo "✅ Proton VPN setup complete!"
echo ""
echo "Commands:"
echo "  Start:   systemctl start openvpn@protonvpn"
echo "  Stop:    systemctl stop openvpn@protonvpn"
echo "  Status:  systemctl status openvpn@protonvpn"
echo "  Restart: systemctl restart openvpn@protonvpn"

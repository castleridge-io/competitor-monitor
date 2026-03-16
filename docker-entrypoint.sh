#!/bin/bash
# Docker entrypoint - starts VPN then app

set -e

# Check if VPN config exists
if [ -f "/vpn/protonvpn.ovpn" ] && [ -f "/vpn/protonvpn-auth.txt" ]; then
  echo "🔐 Starting VPN..."
  
  # Start OpenVPN in background
  openvpn --config /vpn/protonvpn.ovpn \
          --auth-user-pass /vpn/protonvpn-auth.txt \
          --daemon \
          --log /var/log/openvpn.log
  
  # Wait for VPN connection
  echo "⏳ Waiting for VPN connection..."
  for i in {1..30}; do
    if ip link show tun0 &> /dev/null; then
      echo "✅ VPN connected"
      break
    fi
    sleep 1
  done
  
  # Verify VPN
  VPN_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "unknown")
  echo "🌐 VPN IP: $VPN_IP"
else
  echo "⚠️  No VPN config found, running without VPN"
fi

# Start the app
exec "$@"

#!/bin/bash
# docker-entrypoint.sh - Starts VPN from env vars, then app

set -e

# Check if VPN config provided via env
if [ -n "$OPENVPN_CONFIG_BASE64" ]; then
  echo "🔐 Starting VPN (from base64 env)..."
  echo "$OPENVPN_CONFIG_BASE64" | base64 -d > /tmp/vpn-config.ovpn
  
elif [ -n "$OPENVPN_CONFIG" ]; then
  echo "🔐 Starting VPN (from env)..."
  echo "$OPENVPN_CONFIG" > /tmp/vpn-config.ovpn
  
else
  echo "⚠️  No VPN config in env, running without VPN"
  exec "$@"
fi

# Add auth to config
if [ -n "$OPENVPN_USERNAME" ] && [ -n "$OPENVPN_PASSWORD" ]; then
  echo "auth-user-pass /tmp/vpn-auth.txt" >> /tmp/vpn-config.ovpn
  echo "$OPENVPN_USERNAME" > /tmp/vpn-auth.txt
  echo "$OPENVPN_PASSWORD" >> /tmp/vpn-auth.txt
  chmod 600 /tmp/vpn-auth.txt
fi

# Start OpenVPN
openvpn --config /tmp/vpn-config.ovpn \
        --daemon \
        --log /var/log/openvpn.log \
        --auth-nocache

# Wait for VPN
echo "⏳ Waiting for VPN connection..."
for i in {1..30}; do
  if ip link show tun0 &> /dev/null; then
    echo "✅ VPN connected"
    VPN_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "unknown")
    echo "🌐 VPN IP: $VPN_IP"
    break
  fi
  sleep 1
done

# Cleanup sensitive files
rm -f /tmp/vpn-auth.txt

# Start the app
exec "$@"

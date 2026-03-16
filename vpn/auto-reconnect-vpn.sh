#!/bin/bash
# auto-reconnect-vpn.sh - Keep VPN alive with auto-reconnect
# 
# Add to crontab:
# */5 * * * * /root/auto-reconnect-vpn.sh >> /var/log/vpn-watchdog.log 2>&1

VPN_INTERFACE="tun0"
MAX_PING_FAILURES=3

# Check if VPN interface exists
if ! ip link show "$VPN_INTERFACE" &> /dev/null; then
  echo "$(date) - VPN interface not found, reconnecting..."
  systemctl restart openvpn@protonvpn
  exit 0
fi

# Check internet connectivity through VPN
FAILURES=0
for i in {1..3}; do
  if ! ping -c 1 -W 5 8.8.8.8 &> /dev/null; then
    FAILURES=$((FAILURES + 1))
  fi
done

if [ $FAILURES -ge $MAX_PING_FAILURES ]; then
  echo "$(date) - Connection unstable ($FAILURES/3 failures), reconnecting..."
  systemctl restart openvpn@protonvpn
else
  echo "$(date) - VPN OK"
fi

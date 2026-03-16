FROM node:20-slim

# Install OpenVPN
RUN apt-get update && apt-get install -y \
    openvpn \
    iptables \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy app
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Copy VPN config
COPY vpn/ /vpn/

# Startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["pnpm", "start"]

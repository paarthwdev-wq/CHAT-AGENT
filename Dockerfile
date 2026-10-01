FROM node:20-slim

# Install system dependencies including Python for ReportLab PDF generation
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install ReportLab with break-system-packages flag for Debian/Ubuntu
RUN pip3 install --no-cache-dir reportlab --break-system-packages

WORKDIR /usr/src/app

COPY package*.json ./
# Use --omit=dev to ensure smooth, lightweight install
RUN npm install --omit=dev --no-audit

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

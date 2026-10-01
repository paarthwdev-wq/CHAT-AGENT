FROM node:20-slim

# Install system dependencies including Python, ReportLab & TrueType fonts
RUN apt-get update && apt-get install -y \
    python3 \
    python3-reportlab \
    fonts-dejavu-core \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
# Use --omit=dev to ensure smooth, lightweight install
RUN npm install --omit=dev --no-audit

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]

# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD node -e "process.exit(0)"
CMD ["node", "dist/bot.js"]

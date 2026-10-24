# Cloud Run -kuva. Cloud Run asettaa PORT-muuttujan (oletus 8080).
# Palvelin kuuntelee osoitetta 0.0.0.0. Salaisuuksia ei kopioida kuvaan.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js lukee tietokantamoduulin buildin aikana. Tämä ei ole tuotannon osoite,
# eikä muuttujaa kopioida ajoajan kuvaan. Cloud Run saa DATABASE_URL:n secretistä.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
# Cloud Run ja Docker voivat asettaa HOSTNAME-muuttujan kontin nimeksi.
# Next.js kuuntelee sitä, joten osoite pakotetaan tässä prosessissa.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]

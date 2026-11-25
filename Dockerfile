# Stage 1: Install all dependencies
FROM node:22.23.2-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

# Stage 2: Development (hot-reload)
FROM node:22.23.2-alpine AS development

WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD ["yarn", "start:dev"]

# Stage 3: Build
FROM node:22.23.2-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Un seul fichier (dist/bundle/main.js) : voir scripts/bundle.mjs.
RUN yarn build:bundle

# Stage 4: Production
FROM node:22.23.2-alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Le bundle, plus les seuls paquets laissés hors du bundle (scripts/bundle.mjs) : bcrypt (natif,
# avec node-gyp-build qui charge son binaire) et swagger-ui-dist (fichiers statiques de /api/docs).
COPY --from=build /app/dist/bundle ./dist
COPY --from=build /app/node_modules/bcrypt ./node_modules/bcrypt
COPY --from=build /app/node_modules/node-gyp-build ./node_modules/node-gyp-build
COPY --from=build /app/node_modules/swagger-ui-dist ./node_modules/swagger-ui-dist
COPY --from=build /app/package.json ./

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]

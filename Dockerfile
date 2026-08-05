# Stage 1: Install all dependencies
FROM node:22.15.0-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

# Stage 2: Development (hot-reload)
FROM node:22.15.0-alpine AS development

WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD ["yarn", "start:dev"]

# Stage 3: Build
FROM node:22.15.0-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

RUN yarn install --production --frozen-lockfile

# Stage 4: Production
FROM node:22.15.0-alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]

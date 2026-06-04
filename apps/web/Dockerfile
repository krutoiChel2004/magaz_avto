FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@9

# workspace files
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./

# app package
COPY apps/web/package.json ./apps/web/package.json

# install deps
RUN pnpm install --frozen-lockfile

# copy source
COPY . .

# build only web app
RUN pnpm --filter web build

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "start"]
FROM node:20.19-alpine3.22
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY ./src .
ENTRYPOINT [ "node", "--disable-wasm-trap-handler", "/app/app.js" ]

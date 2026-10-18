FROM node:20-alpine

WORKDIR /myapp

COPY package.json package-lock.json ./

RUN npm install

COPY . .

EXPOSE 5001

CMD ["node", "server.js"]
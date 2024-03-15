FROM node:16.20.2-bullseye as builder

WORKDIR /usr/src/app

COPY . .

RUN npm install

RUN npm ci

RUN npm run build

CMD ["npm", "start"]
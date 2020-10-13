FROM node:12

RUN mkdir -p /app
COPY package.json /app/package.json
COPY service.js /app/service.js

WORKDIR /app
RUN npm install

CMD ["node", "/app/service.js"]
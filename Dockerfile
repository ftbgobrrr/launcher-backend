FROM node:12

RUN mkdir /app
RUN mkdir -p /app/src/public
RUN chmod 755 -R /app/src/public

WORKDIR /app
COPY . .

RUN npm config set unsafe-perm true
RUN npm install

CMD ["npm", "run", "watch"]

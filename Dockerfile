FROM node:22 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run ng build -- --configuration=production --base-href /

FROM nginx:alpine
COPY --from=builder /app/dist/invflorestal /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

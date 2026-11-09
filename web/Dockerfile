FROM nginx:1.27-alpine
# The official nginx image runs envsubst on /etc/nginx/templates/*.template at startup.
ENV API_UPSTREAM=app:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80

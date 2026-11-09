FROM nginx:1.27-alpine
# The official nginx image runs envsubst on /etc/nginx/templates/*.template at startup.
ENV API_UPSTREAM=app:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/index.html
# The pipeline passes the short commit SHA so the page footer shows which release is live.
ARG APP_VERSION=dev
RUN sed -i "s/__APP_VERSION__/${APP_VERSION}/g" /usr/share/nginx/html/index.html
EXPOSE 80

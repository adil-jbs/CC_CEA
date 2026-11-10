FROM nginx:1.27-alpine
# The official nginx image runs envsubst on /etc/nginx/templates/*.template at startup.
ENV API_UPSTREAM=app:3000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY index.html style.css app.js /usr/share/nginx/html/
# The pipeline passes the commit SHA: it is shown in the page footer and added to the
# style.css / app.js links (?v=SHA) so browsers fetch fresh files after every release.
ARG APP_VERSION=dev
RUN sed -i "s/__APP_VERSION__/${APP_VERSION}/g" /usr/share/nginx/html/index.html
EXPOSE 80

FROM nginx:alpine

# openssl n'est pas installé par défaut sur l'image nginx:alpine minimale
RUN apk add --no-cache openssl

# Génère le certificat auto-signé directement dans l'image, au moment du build
# Aucune étape manuelle nécessaire côté développeur
RUN mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 \
      -newkey rsa:2048 \
      -keyout /etc/nginx/certs/selfsigned.key \
      -out /etc/nginx/certs/selfsigned.crt \
      -subj "/C=FR/ST=IDF/L=Paris/O=transcendence/CN=localhost"

# La config nginx est copiée dans l'image (pas montée en volume)
# cohérent avec le certificat, tout est autonome dans l'image
COPY nginx.conf /etc/nginx/conf.d/default.conf
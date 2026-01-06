FROM registry.access.redhat.com/ubi9/ubi-minimal:latest as builder
ENV UPSTREAM="https://github.com/linkstackorg/linkstack/releases/latest/download/linkstack.zip"
RUN 1>/dev/null \
    dnf install \
    -y \
    --disableplugin subscription-manager \
    httpd \
    mod_ssl \
    bsdtar \
    libarchive
RUN mkdir /htdocs \
 && curl -L \
         --compressed \
         --http2 \
         --tcp-fastopen \
         --buffer \
         --keepalive-time 60 ${UPSTREAM} \
  | bsdtar -C /var/www/html --strip-components 1 -xf-

FROM quay.io/sclorg/php-83-c9s
COPY --from=builder /var/www/html /var/www/html


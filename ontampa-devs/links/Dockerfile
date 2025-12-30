FROM alpine:3.23.2

ENV TZ="UTC"
ENV SERVER_ADMIN="cloud@ontampa.dev"
ENV HTTP_SERVER_NAME="localhost.localdomain"
ENV HTTPS_SERVER_NAME="${HTTP_SERVER_NAME}"
ENV HTTP_SERVER_PORT="8080"
ENV HTTPS_SERVER_PORT="8443"
EXPOSE $HTTP_SERVER_PORT $HTTPS_SERVER_PORT

ENV LOG_LEVEL="debug"
ENV PHP_MEMORY_LIMIT="512M"
ENV UPLOAD_MAX_FILESIZE="8M"

RUN apk --no-cache --update \
    add apache2 \
    apache2-ctl \
    apache2-ssl \
    curl \
    php83-apache2 \
    php83-bcmath \
    php83-bz2 \
    php83-calendar \
    php83-common \
    php83-ctype \
    php83-curl \
    php83-dom \
    php83-fileinfo \
    php83-gd \
    php83-iconv \
    php83-json \
    php83-mbstring \
    php83-mysqli \
    php83-mysqlnd \
    php83-openssl \
    php83-pdo_mysql \
    php83-pdo_pgsql \
    php83-pdo_sqlite \
    php83-phar \
    php83-session \
    php83-xml \
    php83-tokenizer \
    php83-zip \
    php83-xmlwriter \
    php83-redis \
    tzdata \
    libarchive-tools \
    && mkdir /htdocs


COPY --chown=apache:apache conf/apache2/httpd.conf /etc/apache2/httpd.conf
COPY --chown=apache:apache conf/apache2/conf.d/ssl.conf   /etc/apache2/conf.d/ssl.conf

COPY --chown=apache:apache conf/php/php.ini        /etc/php83/conf.d/40-custom.ini
COPY --chown=apache:apache conf/ssl/openssl.cnf    /etc/ssl/openssl.cnf

COPY --chown=apache:apache src /htdocs
COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/

RUN chown -R apache:apache /etc/php83
RUN chown -R apache:apache /etc/ssl/openssl.cnf
RUN chown -R apache:apache /etc/apache2
RUN chmod -R +rwX /etc/apache2
RUN chmod -R 755 /etc/php83

RUN curl -sSL https://github.com/linkstackorg/linkstack/releases/latest/download/linkstack.zip \
    | bsdtar -xvf- -C /htdocs

RUN apachectl configtest
USER apache:apache

WORKDIR /htdocs
CMD ["docker-entrypoint.sh"]
 

FROM registry.access.redhat.com/ubi9/ubi-minimal:latest

ENV SERVER_ADMIN="cloud@ontampa.dev"
ENV LOG_LEVEL="debug"
ENV PHP_MEMORY_LIMIT="512M"
ENV UPLOAD_MAX_FILESIZE="8M"

ENV HTTP_SERVER_NAME="localhost"
ENV HTTPS_SERVER_NAME="${HTTP_SERVER_NAME}"
ENV HTTP_SERVER_PORT="8080"
ENV HTTPS_SERVER_PORT="8443"

EXPOSE $HTTP_SERVER_PORT $HTTPS_SERVER_PORT

# dnf optimization
RUN echo 'max_parallel_downloads=20' >> /etc/dnf/dnf.conf
RUN echo 'fastestmirror=True' >> /etc/dnf/dnf.conf

# disable rhsm warnings
RUN printf "[rhsm]\nauto_enable_yum_plugins = 0\n" > rhsm.conf
RUN printf "[main]\nenabled=0\n" > /etc/dnf/plugins/subscription-manager.conf

RUN microdnf install -y dnf \
 && dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm \
 && dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm

RUN dnf config-manager --set-enabled remi-modular
RUN dnf module reset php -y \
 && dnf module enable php:remi-8.3 -y

RUN microdnf install -y \
    httpd mod_ssl libarchive \
    php php-common php-bcmath php-gd \
    php-mbstring php-mysqlnd php-pgsql \
    php-xml php-pecl-zip php-pecl-redis \
    libarchive bsdtar openssl \
 && microdnf clean all \
 && mkdir /htdocs

RUN curl -L --compressed --http2 --tcp-fastopen --buffer --keepalive-time 60 \
 https://github.com/linkstackorg/linkstack/releases/latest/download/linkstack.zip \
 | bsdtar -C /htdocs --strip-components 1 -xf-


COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/

COPY --chmod=0750 --chown=apache:apache conf/httpd/conf.d/ssl.conf /etc/httpd/conf.d/ssl.conf
COPY --chmod=0750 --chown=apache:apache conf/php/php.ini /etc/php.d/40-custom.ini
COPY --chmod=0750 --chown=apache:apache conf/httpd/httpd.conf /etc/httpd/httpd.conf
COPY --chmod=0750 --chown=apache:apache conf/ssl/openssl.cnf /etc/ssl/openssl.cnf
COPY --chmod=0750 --chown=apache:apache src /htdocs

RUN mkdir /etc/httpd/conf.d/$HTTP_SERVER_NAME \
 && chown apache:apache /etc/httpd/conf.d/$HTTP_SERVER_NAME 

RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -config /etc/ssl/openssl.cnf \
                -keyout /etc/httpd/conf.d/${HTTP_SERVER_NAME}/key-${HTTP_SERVER_NAME} \
                -out /etc/httpd/conf.d/${HTTP_SERVER_NAME}/cert-${HTTP_SERVER_NAME} &> /dev/null
RUN httpd -t
USER apache 

WORKDIR /htdocs
CMD ["docker-entrypoint.sh"]

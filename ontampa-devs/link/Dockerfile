FROM registry.access.redhat.com/ubi9/ubi-minimal:latest

ENV SERVER_ADMIN="cloud@ontampa.dev"
ENV LOG_LEVEL="debug"

ENV HTTP_SERVER_NAME="localhost"
ENV HTTP_SERVER_PORT="8080"

EXPOSE $HTTP_SERVER_PORT

# dnf optimization
RUN echo 'max_parallel_downloads=20' >> /etc/dnf/dnf.conf
RUN echo 'fastestmirror=True' >> /etc/dnf/dnf.conf

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

# generate default cert for ssl.conf
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/pki/tls/private/localhost.key \
    -out /etc/pki/tls/certs/localhost.crt \
    -subj "/C=US/ST=FL/L=Tampa/O=TampaDevs/CN=localhost"

RUN curl -L --compressed --http2 --tcp-fastopen --buffer --keepalive-time 60 \
 https://github.com/linkstackorg/linkstack/releases/latest/download/linkstack.zip \
 | bsdtar -C /htdocs --strip-components 1 -xf-

COPY --chown=apache:apache conf/php/php.ini /etc/php.d/40-custom.ini
COPY --chown=apache:apache conf/httpd/conf/httpd.conf /etc/httpd/conf/httpd.conf
COPY --chown=apache:apache conf/httpd/conf.d/host-linkstack.conf  /etc/httpd/conf.d/host-linkstack.conf
RUN chown -R apache:apache /run/httpd

COPY --chmod=0755 entrypoint.sh /usr/local/bin/

RUN httpd -t
USER apache 

WORKDIR /htdocs
CMD ["entrypoint.sh"]

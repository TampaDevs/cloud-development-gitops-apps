#!/bin/sh

set -eu
#- 
export LOG_LEVEL="${LOG_LEVEL:-info}"
export TZ="${TZ:-UTC}"

export SERVER_ADMIN="${SERVER_ADMIN:-you@example.com}"

#- 
export HTTP_SERVER_PORT="${HTTP_SERVER_PORT:-80}"
export HTTP_SERVER_NAME="${HTTP_SERVER_NAME:-localhost}"

#- 
export HTTPS_SERVER_PORT="${HTTPS_SERVER_PORT:-443}"
export HTTPS_SERVER_NAME="${HTTP_SERVER_NAME:-localhost}"

#- 
export PHP_MEMORY_LIMIT="${PHP_MEMORY_LIMIT:-512M}"
export UPLOAD_MAX_FILESIZE="${UPLOAD_MAX_FILESIZE:-8M}"
	
v="$(cat /htdocs/version.json | tr -d '\r\n')"
vlen="$((27-${#v}))"

echo '+ ------------------------------------------------------------------ +'
printf '|   LINKSTACK v%s%*s|\n' "${v}" "$vlen" | tr ' ' " "

# + ---------------- + #
# | -- HTTPD.CONF -- | #
# + ---------------- + #

echo '+ ------------------------------------------------------------------ +'
echo '| Updating Configuration: Apache Base (/etc/httpd/httpd.conf)      |'
echo '| Updating Configuration: Apache SSL  (/etc/httpd/conf.d/ssl.conf) |'

#openssl req -x509 -nodes -days 365 -newkey rsa:2048 -config /etc/ssl/openssl.cnf -keyout /etc/httpd/conf.d/${HTTP_SERVER_NAME}/key-${HTTP_SERVER_NAME} -out /etc/httpd/conf.d/server.pem

echo '| Updating Configuration: PHP         (/etc/php.d/40-custom.ini)     |'
echo "| Setting PHP Configuration:                                         |"
echo "| upload_max_filesize = ${UPLOAD_MAX_FILESIZE}                       |"
echo "| memory_limit = ${PHP_MEMORY_LIMIT}                                 |"
echo "| date.timezone = ${TZ}                                              |"

echo "upload_max_filesize = ${UPLOAD_MAX_FILESIZE}" >> /etc/php.d/40-custom.ini
echo "memory_limit = ${PHP_MEMORY_LIMIT}" >> /etc/php.d/40-custom.ini
echo "date.timezone = ${TZ}" >> /etc/php.d/40-custom.ini

rm -f /htdocs/httpd.pid

echo '| Updating Configuration: Complete                                   |'
echo '| ------------------------------------------------------------------ |'
echo '| Running Apache                                                     |'
echo '+ ------------------------------------------------------------------ +'

httpd -D FOREGROUND

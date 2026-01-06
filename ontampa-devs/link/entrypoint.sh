#!/bin/sh

set -eu
#- 
export LOG_LEVEL="${LOG_LEVEL:-info}"
export TZ="${TZ:-UTC}"

#- 
export HTTP_SERVER_PORT="${HTTP_SERVER_PORT:-8080}"
export HTTP_SERVER_NAME="${HTTP_SERVER_NAME:-localhost}"

#- 
export PHP_MEMORY_LIMIT="${PHP_MEMORY_LIMIT:-512M}"
export UPLOAD_MAX_FILESIZE="${UPLOAD_MAX_FILESIZE:-8M}"
	
v="$(cat /htdocs/version.json | tr -d '\r\n')"
vlen="$((27-${#v}))"

echo   '+ -------------------------------------------------------------- +'
printf '|   LINKSTACK v%s%*s|\n' "${v}" "$vlen" | tr ' ' " "

echo   '| Current configuration                                          |'
echo   '| HTTP Port: ${HTTP_SERVER_PORT}                                 |'
echo   '| Updating Configuration: PHP         (/etc/php.d/40-custom.ini) |'
echo   '+ ---------------------------------------------------------------+'
echo   '| Setting PHP Configuration:                                     |'
echo   "| upload_max_filesize = ${UPLOAD_MAX_FILESIZE}                   |"
echo   "| memory_limit = ${PHP_MEMORY_LIMIT}                             |"
echo   "| date.timezone = ${TZ}                                          |" 

httpd -DFOREGROUND

FROM docker.io/ctfd/ctfd:latest
USER root
RUN apt-get update && apt-get install -y --no-install-recommends git wget curl\
    && rm -rf /var/lib/apt/lists/*
 
WORKDIR /opt/CTFd/CTFd/plugins
RUN git clone --depth 1 https://github.com/r00tstici/CTFd-SSO-plugin.git CTFd-SSO-plugin \
    && pip install --no-cache-dir -r CTFd-SSO-plugin/requirements.txt

COPY ctfd-sso-fixes/__init__.py CTFd-SSO-plugin/__init__.py
COPY ctfd-sso-fixes/blueprint.py CTFd-SSO-plugin/blueprint.py
COPY ctfd-sso-fixes/models.py CTFd-SSO-plugin/models.py
COPY ctfd-sso-fixes/templates/login_oauth.html CTFd-SSO-plugin/templates/login_oauth.html
COPY ctfd-sso-fixes/templates/create.html CTFd-SSO-plugin/templates/create.html
COPY ctfd-sso-fixes/templates/edit.html CTFd-SSO-plugin/templates/edit.html
COPY ctfd-sso-fixes/templates/list.html CTFd-SSO-plugin/templates/list.html

RUN pip install --no-cache-dir boto3 psycopg2-binary
 
RUN chgrp -R 0 /opt/CTFd \
    && chmod -R g=u /opt/CTFd \
    && chgrp -R 0 /var/log \
    && chmod -R g=u /var/log
 
USER 1001
WORKDIR /opt/CTFd
EXPOSE 8000

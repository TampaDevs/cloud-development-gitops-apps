# =====================================================================
# BUILDER STAGE: Download and extract Factorio
# =====================================================================
# Use a global ARG so it's available in all stages
ARG FACTORIO_VERSION_ARG=latest

FROM ubuntu:22.04 AS builder

#    This value is passed in from GitHub Action (--build-arg FACTORIO_VERSION_ARG=...).
#    A default is set for manual builds without the argument.
ARG FACTORIO_VERSION_ARG=latest

# Set an environment variable from the build-time argument.
ENV FACTORIO_VERSION=${FACTORIO_VERSION_ARG}

# Set non-interactive mode for package installation
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /tmp

# 3. Update, install dependencies, download, and extract Factorio in a single RUN layer. 
#    Changes for better speed.
RUN \
  echo "--- Building with Factorio version: ${FACTORIO_VERSION} ---" && \
  apt-get update && \
  apt-get install -y --no-install-recommends wget tar xz-utils ca-certificates && \
  \
  wget -O factorio.tar.xz "https://www.factorio.com/get-download/${FACTORIO_VERSION}/headless/linux64" && \
  tar -xJf factorio.tar.xz && \
  rm -rf /var/lib/apt/lists/*

# =====================================================================
# FINAL IMAGE: The actual runtime container
# =====================================================================
FROM ubuntu:22.04

ENV SERVER_PORT=34197

ARG FACTORIO_VERSION
LABEL maintainer="Bryan Benway <bryan@nonstopdev.com>" \
      version="${FACTORIO_VERSION}" \
      description="Factorio Headless Server (Ubuntu base) with no mods built for OKD/OpenShift"

ENV FACTORIO_DIR=/opt/factorio \
    DATA_DIR=/factorio

ENV ENABLE_RCON=false
ENV RCON_PORT=27015
ENV RCON_PASSWORD=rconpassword

RUN apt-get update && \
    apt-get install -y --no-install-recommends adduser libsdl2-2.0-0 nano jq && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p ${FACTORIO_DIR} ${DATA_DIR} && \
    groupadd -g 1001 factorio && \
    useradd --shell /bin/false -u 1001 -g 1001 -d ${DATA_DIR} factorio

COPY --from=builder --chown=1001:1001 /tmp/factorio/. ${FACTORIO_DIR}/

# --- We will now manage configs from Helm, but this can remain as a fallback for non-Helm usage ---
COPY helm/factorio/files/ /opt/factorio/config-defaults/

RUN mkdir -p ${DATA_DIR}/saves ${DATA_DIR}/mods ${DATA_DIR}/config ${DATA_DIR}/logs

RUN chown -R 1001:0 ${FACTORIO_DIR} ${DATA_DIR} && \
    chmod -R g+rwx ${FACTORIO_DIR} ${DATA_DIR}

# --- Delete default mods, they never sync correctly ---
RUN rm -rf /opt/factorio/data/elevated-rails
RUN rm -rf /opt/factorio/data/quality
RUN rm -rf /opt/factorio/data/space-age

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER 1001
WORKDIR ${DATA_DIR}
EXPOSE ${SERVER_PORT}/udp
VOLUME ${DATA_DIR}

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# The CMD is empty because the entrypoint script constructs the full command.
CMD []

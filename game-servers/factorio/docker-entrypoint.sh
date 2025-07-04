#!/bin/bash
set -eo pipefail

# --- Environment Variable Defaults ---
SAVE_NAME="${SAVE_NAME:-_my_factorio_save_}"

# --- Paths ---
FACTORIO_BIN="/opt/factorio/bin/x64/factorio"
DATA_DIR="/factorio"
CONFIG_DIR="${DATA_DIR}/config"
SAVES_DIR="${DATA_DIR}/saves"

# Paths for configs mounted from Helm
HELM_CONFIG_DIR="/etc/factorio/config"
HELM_SECRETS_DIR="/etc/factorio/secrets"

# Final config file paths in the persistent volume
CONFIG_INI_PATH="${CONFIG_DIR}/config.ini"
SERVER_SETTINGS_PATH="${CONFIG_DIR}/server-settings.json"
MAP_GEN_SETTINGS_PATH="${CONFIG_DIR}/map-gen-settings.json"
MAP_SETTINGS_PATH="${CONFIG_DIR}/map-settings.json"
SAVE_PATH="${SAVES_DIR}/${SAVE_NAME}.zip"
SERVER_ADMINS_PATH="${CONFIG_DIR}/server-admins.json"

echo "--- Factorio Entrypoint ---"
echo "Running as user: $(whoami) (UID: $(id -u), GID: $(id -g))"
echo "Save Name: ${SAVE_NAME}"
echo "---------------------------"

# Create necessary directories in the persistent volume
mkdir -p "${CONFIG_DIR}" "${SAVES_DIR}"

# Check if the helm-provided config directory exists and is not empty
if [ -d "${HELM_CONFIG_DIR}" ] && [ "$(ls -A ${HELM_CONFIG_DIR})" ]; then
  echo "Found Helm configuration at ${HELM_CONFIG_DIR}. Applying it now..."

  # Copy non-sensitive configs directly, ensuring they are always up to date
  cp "${HELM_CONFIG_DIR}/config.ini" "${CONFIG_INI_PATH}"
  cp "${HELM_CONFIG_DIR}/map-gen-settings.json" "${MAP_GEN_SETTINGS_PATH}"
  cp "${HELM_CONFIG_DIR}/map-settings.json" "${MAP_SETTINGS_PATH}"
  cp "${HELM_CONFIG_DIR}/server-admins.json" "${SERVER_ADMINS_PATH}"
  echo "Copied base config files to ${CONFIG_DIR}"

  # --- Construct the final server-settings.json ---
  echo "Constructing server-settings.json from base config and secrets..."
  BASE_SETTINGS_FILE="${HELM_CONFIG_DIR}/server-settings.json"

  # Start with the base settings from the ConfigMap
  TEMP_SETTINGS=$(cat "${BASE_SETTINGS_FILE}")

  # Layer on secrets one by one if the corresponding secret file exists and is not empty
  if [ -s "${HELM_SECRETS_DIR}/username" ]; then
    echo "Applying username from secret..."
    TEMP_SETTINGS=$(echo "${TEMP_SETTINGS}" | jq --arg user "$(cat ${HELM_SECRETS_DIR}/username)" '.username = $user')
  fi
  if [ -s "${HELM_SECRETS_DIR}/password" ]; then
    echo "Applying password from secret..."
    TEMP_SETTINGS=$(echo "${TEMP_SETTINGS}" | jq --arg pass "$(cat ${HELM_SECRETS_DIR}/password)" '.password = $pass')
  fi
  if [ -s "${HELM_SECRETS_DIR}/token" ]; then
    echo "Applying token from secret..."
    TEMP_SETTINGS=$(echo "${TEMP_SETTINGS}" | jq --arg token "$(cat ${HELM_SECRETS_DIR}/token)" '.token = $token')
  fi
  
  # Write the final, merged JSON to the persistent volume
  echo "${TEMP_SETTINGS}" > "${SERVER_SETTINGS_PATH}"

  echo "Final server-settings.json created in ${SERVER_SETTINGS_PATH}"
  echo "--- (Censoring sensitive fields for log) ---"
  jq '.username="<redacted>" | .password="<redacted>" | .token="<redacted>"' "${SERVER_SETTINGS_PATH}"
  echo "----------------------------------------------"

else
  # Fallback for running the container outside of Kubernetes/Helm.
  echo "WARN: No Helm configuration found at ${HELM_CONFIG_DIR}. Falling back to image defaults."
  cp /opt/factorio/config-defaults/* "${CONFIG_DIR}/"
fi

# --- Prepare Server Command ---
COMMAND_ARGS=(
  "${FACTORIO_BIN}"
  --config "${CONFIG_INI_PATH}"
  --server-settings "${SERVER_SETTINGS_PATH}"
)

if [[ -f "${SAVE_PATH}" ]]; then
  echo "Save file found at '${SAVE_PATH}'. Loading existing game."
  COMMAND_ARGS+=(--start-server "${SAVE_PATH}")
else
  echo "No save file found at '${SAVE_PATH}'. Creating a new game."
  COMMAND_ARGS+=(
    --create "${SAVE_PATH}"
    --map-gen-settings "${MAP_GEN_SETTINGS_PATH}"
    --map-settings "${MAP_SETTINGS_PATH}"  )
fi

# -- Quick edit test --
echo "Quick edit test"

# --- Start the server ---
echo "Executing: exec ${COMMAND_ARGS[@]}"
exec "${COMMAND_ARGS[@]}"

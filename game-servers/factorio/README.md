# Factorio

## Overview

This is a base server to run Factorio (https://www.factorio.com/) headless. This includes the Dockerfile to build the container and the Helm chart to deploy it to the OKD cluster.

This runs the default headless server image and removes all default mods (quality, space-age, elevated-rails). There is some sync issues with the server mods and user mods so they are disabled. Also, I don't own space-age so I can't test it 🤷🏻‍♂️.

## Deployment

To deploy the Factorio server, clone the repo and create your own values.yaml file. You need at a minimum to set a username/password or username/token to host online. The config is pushed into the ConfigMap and the secrets are mounted into the container and used by the Factorio server. When the server is running, you can modify the ConfigMap to change settings which should get copied down into the /factorio server folder.

You can also use the helm upgrade command to update the server settings and uninstall to remove the deployment. Alternativley, you can go into the server and modify files in the /factorio folder yourself and restart the server to apply the changes including adding mods.

```bash
 helm install factorio ./helm/factorio -f values.yaml
```

```bash
helm upgrade factorio-base ./helm/factorio --set factorio.serverSettings.name="Awesome Tampa Factorio" --set factorio.serverSettings.description="Awesome Tampa Factorio Server On OpenShift."
```

```bash
 helm uninstall factorio
```




















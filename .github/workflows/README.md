# Action Overview
#### Push a change to the main branch:

The action will build and push the tags:
```
ghcr.io/tampadevs/factorio:2.0.55-base
ghcr.io/tampadevs/factorio:latest
ghcr.io/tampadevs/factorio:2.0.55-<githash>
```
#### Push a change to a branch named develop:
The action will build and push the tags:
```
ghcr.io/tampadevs/factorio:2.0.55-dev
ghcr.io/tampadevs/factorio:2.0.55-<githash>
```
#### Run the workflow manually:
Go to your repo's Actions tab.
Select Build and Push Factorio Docker Image from the list.
Click the Run workflow dropdown.
You will see a text box labeled "Optional tag suffix".
If you type testing in the box and click the green "Run workflow" button, it will build and push the tags:
```
ghcr.io/tampadevs/factorio:2.0.55-testing
ghcr.io/tampadevs/factorio:2.0.55-<githash>
```
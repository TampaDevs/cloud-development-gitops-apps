# TampaDevs Cloud Apps

Repository non-infrastructure applications that can be deployed to OKD.

### Structure
The structure of this repository can evolve but for now, the structure follows the category at the top level and then each named application will include the Dockerfile, chart, and files needed.

```
category/
├── app-name/
    |-- README.md
    |-- Dockerfile
    |-- Chart.yaml
    |-- values.yaml
    |-- files/
    │   ├── config.ini
    └── templates/
        ├── deployment.yaml
        ├── secret.yaml
        └── service.yaml
```
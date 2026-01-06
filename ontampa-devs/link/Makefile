TAG=localhost/linkstack-ontampa-dev:latest

default: build

build:
	podman rmi -f $(TAG) && podman build --no-cache --squash-all . -t $(TAG)

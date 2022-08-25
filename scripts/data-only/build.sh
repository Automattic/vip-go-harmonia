#!/bin/bash

set -ex;

# Tag images with the current commit SHA.
COMMIT="$(git rev-parse HEAD)"
IMAGE_TAG="vip-harmonia:$COMMIT"

docker build \
  --build-arg NODE_IMAGE_TAG="$NODE_VERSION" \
  --build-arg DATAONLY_IMAGE \
  -t "$IMAGE_TAG" - < "$(dirname "$0")/Dockerfile"

# Clean up
# docker rmi -f "$IMAGE_TAG" || :


#!/bin/bash

set -ex;

# Tag images with the current commit SHA.
COMMIT="$(git rev-parse HEAD)"
IMAGE_TAG="vip-harmonia:$COMMIT"

# Create .dockerignore to prevent .git and scripts from being baked into image.
# Note that this will overwrite any .dockerignore already in the repo. However,
# that .dockerignore will have been written for a Dockerfile that we are also
# overwriting.
#
# Additionally ignore .npm and node_modules that may have been committed to the
# repo, accidentally or otherwise. We install dependencies inside the build
# container.
cat << EOF > .dockerignore
.dockerignore
.git
.npm
Dockerfile
build.sh
node_modules
EOF

# If the customer has not committed an .npmrc file *and* supplies an NPM_TOKEN
# environment variable, then create an .npmrc file that references that the
# variable, pointing to the official NPM registry. This is a support and
# documented workflow.
#
# It's important to escape this variable reference here so that it is
# not expanded immediately. NPM will expand the reference at install time.
if [ ! -f .npmrc ] && [ -n "$NPM_TOKEN" ]; then
  echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc
fi

# Inject provided environment variables into the build container as a list of
# exported shell variables that can be eval'd when running the build. We must do
# it this way for two reasons:
#
# 1. Docker build RUN commands are not run in a login shell, so we have no
#    ability to use profiles or any other auto-sourced start-up files.
# 2. Each RUN command runs in a container resulting from the previous command, so
#    while we have access to the same filesystem and resources, anything that was
#    previously sourced or exported is no longer available.
#
# Exports must be provided via the NODE_BUILD_DOCKER_ENV environment variable and
# the format must match a Linux variable definition, e.g.:
#
# export var1="value1"
# export var2=value2
#
# This environment variable is provided by vip-go-api and properly escaped.

docker build \
  --build-arg NODE_BUILD_DOCKER_ENV \
  --build-arg NODE_VERSION \
  --progress plain \
  -f "$(dirname "$0")/Dockerfile" \
  -t "$IMAGE_TAG" \
  .

# Clean up
# docker rmi -f "$IMAGE_TAG" || :
rm -f .dockerignore

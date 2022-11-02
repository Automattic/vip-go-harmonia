ARG NODE_VERSION

# Create a build stage to perform our build steps using Node.js. The result of
# this build stage can be copied into the final "site code" image, which does
# not need Node.js and can therefore be an extremely lightweight Alpine image.
FROM node:$NODE_VERSION AS build

# The default shell is provided by the upstream image and traditionally it has
# always been set to /bin/sh, which is symlinked to /bin/dash (Debian Dash).
#
# However, for safety, explicitly set it to /bin/dash here. Having the correct
# shell is important because it affects how the exported environment variables
# are interpreted. Shells like Bash provide additional notations for expansion
# within variables that we are not escaping. Using any shell besides a regular
# Bourne shell will likely lead to build failures, mangled environment
# variables, or unwanted command execution.
SHELL ["/bin/dash", "-c"]

WORKDIR /app

# Disable npm colorized output
ENV NO_COLOR 1

# Helper script /export-env.sh
#
# Print the content of the NODE_BUILD_DOCKER_ENV build arg so that it can be
# sourced. This can be used in a multipart RUN command to ensure that this build
# arg is not echoed or cached in image layers.
RUN echo 'printf "%b" "$NODE_BUILD_DOCKER_ENV"' > /export-env.sh

# Standalone comments are not echoed in build output, but comments on the same
# line as commands are. "RUN true" with comment allows us to inject a "build
# marker" that can used to extract only a portion of the build output.

RUN true # ====== START: VIP NODE BUILD ======

# Copy dependency manifests and configuration so that we can run "npm install"
# before copying in the rest of the application code. This increases the
# cacheability of the build layers.
COPY package*.json npm-shrinkwrap*.json .npmrc* /app/

# Copy the "packages" subfolder, if it exists, which may contain npm workspaces
# needed at install time.
COPY packages/ /app/packages/

# Do not introduce the build arguments until they are needed. This allows the
# layers above to remain cached even when this build argument changes.
ARG NODE_BUILD_DOCKER_ENV

# Provide environment variables to install step.
RUN eval "$(sh /export-env.sh)" && \
    npm install --production

# Copy all of the application code -- except files matched by .dockerignore
# (which is generated in "build.sh").
COPY . .

# Provide environment variables to build step.
RUN eval "$(sh /export-env.sh)" && \
    npm run build

RUN true # ====== END: VIP NODE BUILD ======

CMD [ "npm", "start" ]

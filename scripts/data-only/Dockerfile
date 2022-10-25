ARG DATAONLY_IMAGE
ARG NODE_VERSION

FROM ${DATAONLY_IMAGE} as dataImage

FROM node:${NODE_VERSION}

WORKDIR /app

# Copy the application data from the data-only image
COPY --from=dataImage /app /app

# Execute the application
CMD [ "npm", "start" ]

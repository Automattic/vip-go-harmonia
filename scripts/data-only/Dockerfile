ARG DATAONLY_IMAGE
ARG NODE_IMAGE_TAG

FROM ${DATAONLY_IMAGE} as dataImage

FROM node:${NODE_IMAGE_TAG}

WORKDIR /app

# Copy the application data from the data-only image
COPY --from=dataImage /app /app

# Execute the application
CMD [ "npm", "start" ]

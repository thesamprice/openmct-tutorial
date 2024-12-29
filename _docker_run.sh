#!/bin/bash


# Name of the Docker image
IMAGE_NAME="openmct-builder"

# Build the Docker image if it doesn't already exist
docker build -t $IMAGE_NAME .


# docker run -it --rm \
#   -v "$(pwd):/usr/src/app/src" \
#   -w /usr/src/app/src \
#   -p 5000:5000 \
#   $IMAGE_NAME sh

# Run the Docker container to compile TypeScript
docker run -it --rm \
  -v "$(pwd):/usr/src/app/src" \
  -w /usr/src/app/src \
  $IMAGE_NAME sh -c "npm run build"
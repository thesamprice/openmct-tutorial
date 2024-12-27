#!/bin/bash


# Name of the Docker image
IMAGE_NAME="openmct-builder"

# Build the Docker image if it doesn't already exist
docker build -t $IMAGE_NAME .

# Run the Docker container
docker run -it --rm \
  -v "$(pwd):/usr/src/app" \
  -w /usr/src/app \
  -p 8080:8080 \
  $IMAGE_NAME sh
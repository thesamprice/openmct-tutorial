# Stage 1: Build the Open MCT project
FROM node:20-alpine3.20 AS build

# Set environment variables for NVM
ENV NVM_DIR=/root/.nvm
# ENV NODE_VERSION=18.17.1

# Install required dependencies
# RUN apt-get update && apt-get install -y curl nvm

# Set the working directory
WORKDIR /usr/src/openmct-tutorial

# Copy project files
COPY package*.json ./
RUN npm install
RUN npm install -g parcel
# COPY . .

# Build the project
# RUN npm run build
# RUN npm install

# Stage 2: Copy build artifacts to a clean image
# FROM alpine:3.18

# # Install required tools
# RUN apk add --no-cache tar

# Set the output directory
#WORKDIR /output

# Copy build artifacts from the build stage
#COPY --from=build /usr/src/openmct-tutorial/dist ./dist

# # Add an entrypoint for copying files out
# CMD ["tar", "-czf", "/output/openmct-dist.tar.gz", "-C", "./dist", "."]

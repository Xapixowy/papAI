# Use the official Node.js image as the base image
FROM node:22

# Install pnpm
RUN npm install -g pnpm

# Set the working directory inside the container
WORKDIR /usr/src/app

# Set the application version argument
ARG APP_VERSION_ARG="0.0.0-docker"

# Set the application version environment variable
ENV APP_VERSION=$APP_VERSION_ARG

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./pnpm-lock.yaml ./

# Install the application dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN pnpm run build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]
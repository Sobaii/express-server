# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install OpenSSL 1.1
RUN apk add --no-cache openssl1.1

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Generate the Prisma client
RUN npx prisma generate --schema=./src/prisma/schema.prisma

# Expose the port your app runs on
EXPOSE 3000

# Command to run your app
CMD ["npm", "start"]

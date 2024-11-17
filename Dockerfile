FROM node:18-alpine

WORKDIR /app

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
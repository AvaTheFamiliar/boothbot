FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Run the app directly
CMD ["bun", "run", "src/index.ts"]

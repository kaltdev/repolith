FROM node:22-slim

# System deps for native modules (node-gyp, etc.)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack so pnpm/yarn are available instantly
RUN corepack enable && corepack prepare pnpm@latest --activate

# Also install bun for bun-based projects
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Pre-warm pnpm global store so first install is faster
RUN pnpm config set store-dir /root/.local/share/pnpm/store

# Set git defaults
RUN git config --global init.defaultBranch main

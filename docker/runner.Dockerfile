# Ephemeral Sandboxed Test Runner for Antigravity Assessment Platform
FROM node:20-alpine

# Set non-root sandbox user
RUN addgroup -S sandboxgroup && adduser -S sandboxuser -G sandboxgroup

WORKDIR /sandbox

# Pre-install Jest, babel, react testing libraries for instant zero-latency runs
RUN npm init -y && \
    npm install --save-dev jest@29.7.0 \
    @testing-library/react@14.2.1 \
    @testing-library/jest-dom@6.4.2 \
    jsdom@24.0.0

COPY docker/jest.config.js /sandbox/jest.config.js

USER sandboxuser

ENTRYPOINT ["npx", "jest", "--config=/sandbox/jest.config.js", "--json", "--forceExit"]


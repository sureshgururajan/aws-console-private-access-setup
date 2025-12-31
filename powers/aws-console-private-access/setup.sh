#!/bin/bash
set -e

echo "Setting up AWS Console Private Access power..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install MCP server dependencies
echo "Installing MCP server dependencies..."
npm run install:mcp

# Build MCP server
echo "Building MCP server..."
npm run build:mcp

echo "Setup complete! The power is ready to use."

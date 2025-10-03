#!/bin/bash

# Start the frontend development server
echo "Starting Zugzwang Frontend Development Server..."
echo "Make sure you have set up your Privy App ID in .env.local"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    cp env.example .env.local
    echo "📝 Please edit .env.local and add your Privy App ID"
    echo "   Get your App ID from: https://dashboard.privy.io/"
    echo ""
fi

# Start the development server
npm start

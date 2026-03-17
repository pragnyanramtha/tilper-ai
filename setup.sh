#!/bin/bash

echo "🔧 Setting up Tilper-AI for local development..."
echo ""

# Check if .env exists and has the API key set
if [ -f .env ]; then
    if grep -q "your_gemini_api_key_here" .env; then
        echo "⚠️  WARNING: Please update your .env file with your actual Gemini API key!"
        echo "   1. Get your API key from: https://aistudio.google.com/app/apikey"
        echo "   2. Replace 'your_gemini_api_key_here' in the .env file with your actual key"
        echo ""
        read -p "Press Enter once you've updated your API key to continue..."
    fi
else
    echo "❌ ERROR: .env file not found!"
    echo "   Please create a .env file based on .env.example"
    exit 1
fi

echo ""
echo "📦 Removing old node_modules and lock files..."
rm -rf node_modules pnpm-lock.yaml package-lock.json

echo ""
echo "📥 Installing dependencies (this may take a few minutes)..."
pnpm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server, run:"
echo "   pnpm dev"
echo ""
echo "📝 Notes:"
echo "   - The app will run on http://localhost:5000"
echo "   - Data will be stored in-memory (lost on restart) unless you configure DATABASE_URL"
echo "   - To use persistent storage, set up PostgreSQL and update DATABASE_URL in .env"
echo ""

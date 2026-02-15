@echo off
echo.
echo 🔧 Setting up Tilper-AI for local development...
echo.

REM Check if .env exists and has the API key set
if exist .env (
    findstr /C:"your_claude_api_key_here" .env > nul
    if not errorlevel 1 (
        echo ⚠️  WARNING: Please update your .env file with your actual Claude API key!
        echo    1. Get your API key from: https://console.anthropic.com/
        echo    2. Replace 'your_claude_api_key_here' in the .env file with your actual key
        echo.
        pause
    )
) else (
    echo ❌ ERROR: .env file not found!
    echo    Please create a .env file based on .env.example
    pause
    exit /b 1
)

echo.
echo 📦 Removing old node_modules and lock files...
if exist node_modules rmdir /s /q node_modules
if exist pnpm-lock.yaml del /q pnpm-lock.yaml
if exist package-lock.json del /q package-lock.json

echo.
echo 📥 Installing dependencies (this may take a few minutes)...
call pnpm install

echo.
echo ✅ Setup complete!
echo.
echo 🚀 To start the development server, run:
echo    pnpm dev
echo.
echo 📝 Notes:
echo    - The app will run on http://localhost:5000
echo    - Data will be stored in-memory (lost on restart) unless you configure DATABASE_URL
echo    - To use persistent storage, set up PostgreSQL and update DATABASE_URL in .env
echo.
pause

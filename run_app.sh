#!/bin/bash

# AccidentLens - Single Command Startup Script
echo "🚀 Starting AccidentLens Platform..."

# 1. Check if Docker is running
if docker info >/dev/null 2>&1; then
    echo "📦 Docker detected. Building and starting containers..."
    docker-compose up --build -d
    echo ""
    echo "✅ AccidentLens is running in Docker!"
    echo "🌐 Frontend: http://localhost:3001"
    echo "⚙️  Backend:  http://localhost:5001"
else
    echo "⚠️  Docker is not running. Falling back to local execution..."
    
    # 2. Check for Conda environment
    if [ -d "./conda_env" ]; then
        echo "🐍 Using local conda_env..."
        
        # Start Backend
        echo "📡 Starting Backend (Port 5001)..."
        ./conda_env/bin/python python-analysis/app.py > backend.log 2>&1 &
        BACKEND_PID=$!
        
        # Start Frontend
        echo "💻 Starting Frontend (Port 3001)..."
        cd frontend && npm install && npm run dev -- --port 3001 > ../frontend.log 2>&1 &
        FRONTEND_PID=$!
        
        echo ""
        echo "✅ AccidentLens is running locally!"
        echo "🌐 Frontend: http://localhost:3001"
        echo "⚙️  Backend:  http://localhost:5001"
        echo "📝 Logs saved to backend.log and frontend.log"
        echo ""
        echo "To stop, run: kill $BACKEND_PID $FRONTEND_PID"
    else
        echo "❌ Error: Neither Docker nor ./conda_env found."
        echo "Please start Docker Desktop or setup the environment."
        exit 1
    fi
fi

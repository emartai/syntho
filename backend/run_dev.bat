@echo off
REM Development server startup script for Syntho Backend (Windows)

echo Starting Syntho Backend Development Server...
echo.

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Created .env file. Please update it with your credentials.
    echo.
)

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Setup complete!
echo.
echo Starting server at http://localhost:8000
echo API docs available at http://localhost:8000/api/docs
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

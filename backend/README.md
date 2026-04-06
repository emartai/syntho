# Syntho Backend API

FastAPI backend for the Syntho Synthetic Data Marketplace.

## Features

- **Authentication**: JWT-based authentication using Supabase
- **File Upload**: Multipart file upload with validation
- **Storage**: Supabase Storage integration
- **Schema Detection**: Automatic schema detection for CSV, JSON, Parquet, XLSX
- **API Versioning**: All routes under `/api/v1`
- **CORS**: Configured for Vercel frontend
- **Error Handling**: Comprehensive error handling and validation

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the backend directory (see `.env.production.example` for production-safe defaults):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
FLUTTERWAVE_WEBHOOK_HASH=your_flutterwave_webhook_hash
MODAL_API_URL=https://your-username--syntho-ml-run-job.modal.run
MODAL_API_SECRET=your_modal_shared_secret
REDIS_URL=your_render_redis_url
FRONTEND_URL=https://your-syntho-app.vercel.app
```

### 3. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app and configuration
│   ├── config.py            # Settings and environment variables
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py          # JWT authentication middleware
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic models
│   ├── routers/
│   │   ├── __init__.py
│   │   └── datasets.py      # Dataset endpoints
│   └── services/
│       ├── __init__.py
│       ├── supabase.py      # Supabase client
│       └── storage.py       # Storage service
├── requirements.txt
├── Procfile                 # Render deployment config
└── .env.example
```

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint (no auth required)

### Datasets
- `POST /api/v1/datasets` - Upload dataset (requires auth)
- `GET /api/v1/datasets` - List user's datasets (requires auth)
- `GET /api/v1/datasets/{id}` - Get dataset details (requires auth)
- `DELETE /api/v1/datasets/{id}` - Delete dataset (requires auth)

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

The token is verified using the Supabase JWT secret and must contain a valid `sub` (user_id) claim.

## File Upload

### Supported File Types
- CSV (`.csv`)
- JSON (`.json`)
- Parquet (`.parquet`)
- Excel (`.xlsx`)

### File Size Limit
- Maximum: 100MB

### Upload Process
1. Client sends multipart/form-data with file, name, and optional description
2. Server validates file type and size
3. File is uploaded to Supabase Storage at `datasets/{user_id}/{dataset_id}/{filename}`
4. Schema is automatically detected using pandas
5. Dataset record is created in database
6. Response includes dataset info and detected schema

## Schema Detection

The backend automatically detects:
- Column names
- Data types (integer, float, categorical, datetime, boolean, text)
- Null percentages
- Sample values (first 3 unique values per column)

## Error Handling

All errors return JSON responses with appropriate HTTP status codes:

```json
{
  "detail": "Error message"
}
```

Common status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `413` - Payload Too Large (file size exceeded)
- `500` - Internal Server Error

## Deployment

### Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Deploy using the Procfile

The Procfile is already configured:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT --no-server-header
```

## Security

- JWT tokens verified on every protected request
- File type validation using magic bytes
- File size limits enforced
- User ownership verified for all operations
- CORS restricted to allowed origins
- No sensitive data in error messages
- Service role key never exposed to frontend

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black app/
```

### Type Checking
```bash
mypy app/
```

## License

Proprietary - Syntho Platform

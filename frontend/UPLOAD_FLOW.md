# Dataset Upload Flow

## Overview
The upload feature allows users to upload datasets (CSV, JSON, Parquet, XLSX) with drag-and-drop functionality, automatic schema detection, and progress tracking.

## Components

### 1. Dropzone Component (`components/upload/Dropzone.tsx`)
- **Features:**
  - Drag-and-drop file upload using `react-dropzone`
  - File type validation (CSV, JSON, Parquet, XLSX only)
  - File size validation (max 100MB)
  - Visual feedback for drag states
  - Upload progress bar with percentage
  - Error handling and display
  - Success state indication

- **Props:**
  - `onFileSelect`: Callback when file is selected
  - `uploadProgress`: Current upload progress (0-100)
  - `isUploading`: Boolean indicating upload in progress
  - `error`: Error message to display
  - `success`: Boolean indicating successful upload

### 2. SchemaPreview Component (`components/upload/SchemaPreview.tsx`)
- **Features:**
  - Displays detected schema in a table format
  - Shows column name, type, null percentage, and sample values
  - Color-coded type badges:
    - Numeric/Integer/Float: Cyan
    - Categorical/String: Purple
    - Datetime/Date: Green
    - Boolean: Yellow
    - Text/Object: Gray
  - Summary cards showing total rows and columns
  - "Generate Synthetic Data" button to proceed

- **Props:**
  - `datasetId`: ID of the uploaded dataset
  - `datasetName`: Name of the dataset
  - `schema`: Array of column schema objects
  - `rowCount`: Total number of rows
  - `columnCount`: Total number of columns

### 3. Upload Page (`app/(dashboard)/upload/page.tsx`)
- **Features:**
  - Complete upload workflow
  - Dataset name input (auto-filled from filename)
  - Optional description textarea
  - TanStack React Query for upload mutation
  - Toast notifications for success/error
  - Loading states and error handling
  - Reset functionality to upload another file

## Upload Flow

```
1. User selects/drops file
   ↓
2. File validation (type, size)
   ↓
3. Dataset name auto-filled from filename
   ↓
4. User can edit name and add description
   ↓
5. Click "Upload & Process"
   ↓
6. POST /api/v1/datasets with multipart/form-data
   ↓
7. Progress bar shows upload progress
   ↓
8. Backend processes file and detects schema
   ↓
9. Success: Show SchemaPreview component
   ↓
10. User reviews schema
    ↓
11. Click "Generate Synthetic Data"
    ↓
12. Navigate to /generate/[datasetId]
```

## API Integration

### Upload Endpoint
```typescript
POST /api/v1/datasets
Content-Type: multipart/form-data

FormData:
- file: File (required)
- name: string (required)
- description: string (optional)

Response:
{
  dataset_id: string,
  name: string,
  schema: Array<{
    name: string,
    type: string,
    null_percentage?: number,
    sample_values?: any[]
  }>,
  row_count: number,
  column_count: number,
  file_size: number,
  file_type: string
}
```

## Error Handling

### Client-side Validation
- File type must be CSV, JSON, Parquet, or XLSX
- File size must not exceed 100MB
- Dataset name is required

### Server-side Errors
- Authentication errors (401)
- File processing errors
- Schema detection failures
- Storage errors

All errors are displayed via toast notifications with descriptive messages.

## State Management

Uses TanStack React Query `useMutation` for:
- Upload state management
- Progress tracking
- Error handling
- Success callbacks
- Automatic retry logic

## Security

- All uploads require authentication (JWT token)
- File type validation on both client and server
- File size limits enforced
- Middleware protects upload route
- Files stored with UUID-based paths in Supabase Storage

## User Experience

### Loading States
- Dropzone disabled during upload
- Progress bar with percentage
- Loading spinner on upload button
- Disabled form inputs during upload

### Success States
- Green success banner
- Schema preview with formatted data
- Clear call-to-action button
- Option to upload another dataset

### Error States
- Red error banner with icon
- Descriptive error messages
- Ability to retry upload
- Form remains editable

## Next Steps

After successful upload, users can:
1. Review the detected schema
2. Navigate to generate page to create synthetic data
3. Upload another dataset
4. View dataset in "My Datasets" page

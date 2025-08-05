# Contacts API Documentation

## Overview
The Contacts API has been restructured to follow RESTful conventions and consolidate all contact-related operations under `/api/contacts`.

## Previous Structure (❌ Inconsistent)
```
/api/dashboard/contacts     # CRUD operations (GET, POST, PUT, DELETE)
/api/contacts/import-csv    # CSV import
/api/contacts/export-csv    # CSV export
```

## Current Structure (✅ RESTful)
```
/api/contacts               # Main CRUD operations
/api/contacts/import-csv    # CSV import  
/api/contacts/export-csv    # CSV export
```

## API Endpoints

### 1. Get All Contacts
**Endpoint:** `GET /api/contacts`
**Description:** Retrieve all contacts for the authenticated user with optional filtering, searching, and pagination.

**Query Parameters:**
- `search` (string): Search across name, email, company, phone, notes
- `tag` (string): Filter by tag name
- `sortBy` (string): Field to sort by (default: "createdAt")
- `sortOrder` (string): "asc" or "desc" (default: "desc")
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Number of contacts per page (default: 50)

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "_id": "contact_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "company": "Acme Corp",
      "tags": [
        {
          "_id": "tag_id",
          "tagName": "VIP",
          "color": "#FF0000"
        }
      ],
      "notes": "Important client",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "lastInteraction": "2024-01-01T00:00:00.000Z"
    }
  ],
  "availableTags": [
    {
      "_id": "tag_id",
      "tagName": "VIP",
      "color": "#FF0000",
      "usageCount": 5
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 150,
    "hasMore": true
  }
}
```

### 2. Create Contact
**Endpoint:** `POST /api/contacts`
**Description:** Create a new contact.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "tags": ["VIP", "Client"],
  "notes": "Important client"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact created successfully",
  "contact": {
    "_id": "contact_id",
    "name": "John Doe",
    "email": "john@example.com",
    // ... other fields
  }
}
```

### 3. Update Contact
**Endpoint:** `PUT /api/contacts/:id`
**Description:** Update an existing contact.

**Request Body:** Same as create contact
**Response:** Same as create contact

### 4. Delete Contact
**Endpoint:** `DELETE /api/contacts/:id`
**Description:** Delete a contact.

**Response:**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

### 5. Import Contacts from CSV
**Endpoint:** `POST /api/contacts/import-csv`
**Description:** Import contacts from a CSV file.

**Request:** 
- Content-Type: `multipart/form-data`
- Field: `file` (CSV file)

**CSV Format:**
```csv
name,email,phone,company,tags,notes
John Doe,john@example.com,+1234567890,Acme Corp,"VIP,Client",Important client
Jane Smith,jane@example.com,+0987654321,Beta Corp,Client,Regular customer
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully imported 2 contacts",
  "details": {
    "totalProcessed": 2,
    "successCount": 2,
    "errorCount": 0,
    "errors": []
  }
}
```

### 6. Export Contacts to CSV
**Endpoint:** `GET /api/contacts/export-csv`
**Description:** Export all contacts to a CSV file.

**Response:** 
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="contacts-YYYY-MM-DD.csv"`

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Activity Logging
All contact operations (create, update, delete, import, export) automatically log activities to the user's activity feed.

## Tag Management
- Tags are automatically created when used in contact operations
- Tag usage counts are automatically incremented
- Tags can be filtered and searched
- Default tag color is "#3B82F6" (blue)

## Breaking Changes
**Frontend Updates Required:**
If your frontend was previously calling `/api/dashboard/contacts`, update to `/api/contacts`:

```javascript
// OLD (❌)
const response = await api.get('/dashboard/contacts');

// NEW (✅) 
const response = await api.get('/contacts');
```

## Database Models
Contacts reference the following models:
- **Contact**: Main contact document
- **Tag**: Referenced by contacts for categorization
- **Activity**: Logs all contact-related actions
- **User**: Contact ownership and authentication

## Features
- ✅ Full CRUD operations
- ✅ Search and filtering
- ✅ Pagination
- ✅ Tag management
- ✅ CSV import/export
- ✅ Activity logging
- ✅ Population of related data
- ✅ Error handling
- ✅ Authentication protection
- ✅ Data validation

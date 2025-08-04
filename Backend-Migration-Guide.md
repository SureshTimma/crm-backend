# CRM Backend Migration Guide: Next.js to Express

## Overview
This guide will help you migrate your complete backend from the Next.js monolithic CRM system to a dedicated Express.js backend server.

## Current Architecture Analysis

### Next.js Project Structure (crm-system)
```
src/
├── app/api/              # Next.js API routes (TO BE MIGRATED)
├── DB/                   # Database configuration and schemas (MIGRATE)
├── lib/                  # Utility libraries (MIGRATE)
├── firebase.ts           # Firebase configuration (MIGRATE)
└── contexts/             # React contexts (KEEP IN FRONTEND)
```

### Express Project Structure (crm-backend)
```
src/
└── index.ts              # Basic Express server (EXTEND)
```

## Migration Plan

### Phase 1: Environment Setup

#### 1.1 Update Express Backend Dependencies
Update your `crm-backend/package.json` with all backend-related dependencies:

```json
{
  "name": "crm-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^5.1.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.1",
    "mongoose": "^8.17.0",
    "socket.io": "^4.8.1",
    "firebase-admin": "^13.4.0",
    "openai": "^5.11.0",
    "cloudinary": "^2.7.0",
    "csv-parser": "^3.2.0",
    "formidable": "^3.5.4",
    "multer": "^1.4.5-lts.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/node": "^20.0.0",
    "@types/cors": "^2.8.17",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^1.4.12",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
```

#### 1.2 Create Environment Configuration
Create `.env` file in `crm-backend/`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/crm-system
# OR MongoDB Atlas URI
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm-system

# Firebase Admin SDK
FIREBASE_PROJECT_ID=prodgain-crm-system
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT
JWT_SECRET=your-jwt-secret-key

# Server
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000
```

### Phase 2: Directory Structure Setup

#### 2.1 Create Backend Directory Structure
Create the following folders in `crm-backend/src/`:

```
src/
├── config/              # Configuration files
├── controllers/         # Route controllers
├── middleware/          # Custom middleware
├── models/             # Database models/schemas
├── routes/             # Express routes
├── services/           # Business logic services
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── index.ts            # Main server file
```

Commands to create directories:
```powershell
# Navigate to crm-backend
cd "D:\My Projects\crm-backend\src"

# Create directory structure
New-Item -ItemType Directory -Path "config", "controllers", "middleware", "models", "routes", "services", "utils", "types" -Force
```

### Phase 3: Database Migration

#### 3.1 Copy Database Configuration
Copy these files from `crm-system/src/DB/` to `crm-backend/src/config/`:

1. **MongoDB Connection** (`MongoConnect.ts` → `database.ts`)
2. **Database Schemas** (`MongoSchema.ts` → `../models/index.ts`)

#### 3.2 Adapt MongoDB Connection for Express
Transform the Next.js MongoDB connection to Express-compatible version:

**File: `crm-backend/src/config/database.ts`**
```typescript
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env file");
}

export const connectDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState >= 1) {
      console.log("Already connected to MongoDB");
      return;
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
  }
};
```

#### 3.3 Copy and Adapt Database Models
Copy the schemas from `MongoSchema.ts` to `crm-backend/src/models/`:

**File: `crm-backend/src/models/index.ts`** (Copy the entire MongoSchema.ts content and adapt export structure)

### Phase 4: Service Layer Migration

#### 4.1 Copy Utility Services
Copy these files and adapt them:

1. **AI Service**: `crm-system/src/lib/aiService.ts` → `crm-backend/src/services/aiService.ts`
2. **AI Context**: `crm-system/src/lib/aiContext.ts` → `crm-backend/src/services/aiContext.ts`
3. **Cloudinary**: `crm-system/src/lib/cloudinary.ts` → `crm-backend/src/services/cloudinary.ts`

#### 4.2 Create Authentication Service
Create `crm-backend/src/services/authService.ts` based on Firebase admin logic from Next.js routes.

#### 4.3 Firebase Admin Setup
Create `crm-backend/src/config/firebase.ts`:

```typescript
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App;

export const initializeFirebase = (): App => {
  if (!getApps().length) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return app;
};

export const verifyFirebaseToken = async (idToken: string) => {
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error("Invalid Firebase token");
  }
};
```

### Phase 5: API Routes Migration

#### 5.1 Authentication Routes
Create `crm-backend/src/routes/auth.ts`:

Transform these Next.js API routes:
- `api/auth/login/route.ts` → `/auth/login` (POST)
- `api/auth/register/route.ts` → `/auth/register` (POST)
- `api/auth/logout/route.ts` → `/auth/logout` (POST)
- `api/auth/profile/route.ts` → `/auth/profile` (GET, PUT)
- `api/auth/user/[uid]/route.ts` → `/auth/user/:uid` (GET)
- `api/auth/settings/password/route.ts` → `/auth/settings/password` (PUT)

#### 5.2 Dashboard Routes
Create `crm-backend/src/routes/dashboard.ts`:

Transform these routes:
- `api/(dashboard)/contacts/route.ts` → `/dashboard/contacts` (GET, POST, PUT, DELETE)
- `api/(dashboard)/activities/route.ts` → `/dashboard/activities` (GET, POST)
- `api/(dashboard)/tags/route.ts` → `/dashboard/tags` (GET, POST, PUT, DELETE)
- `api/(dashboard)/dashboard/route.ts` → `/dashboard/stats` (GET)

#### 5.3 Chat Routes
Create `crm-backend/src/routes/chat.ts`:

Transform these routes:
- `api/chat/route.ts` → `/chat` (POST)
- `api/conversations/route.ts` → `/conversations` (GET, POST)
- `api/conversations/[conversationId]/route.ts` → `/conversations/:id` (GET, DELETE)

#### 5.4 Additional Routes
Create additional route files:
- `crm-backend/src/routes/contacts.ts` → `/contacts/*`
- `crm-backend/src/routes/ai.ts` → `/ai-insights` (POST)
- `crm-backend/src/routes/socket.ts` → WebSocket handling

### Phase 6: Middleware Migration

#### 6.1 Authentication Middleware
Create `crm-backend/src/middleware/auth.ts`:

Transform the `requireAuth` function from `crm-system/src/lib/auth.ts` to Express middleware.

#### 6.2 Error Handling Middleware
Create `crm-backend/src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", error);

  const status = (error as any).status || 500;
  const message = error.message || "Internal Server Error";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};
```

#### 6.3 CORS Middleware
Configure CORS for frontend communication.

### Phase 7: Socket.IO Migration

#### 7.1 Setup Socket.IO Server
Modify `crm-backend/src/index.ts` to include Socket.IO:

```typescript
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database";
import { initializeFirebase } from "./config/firebase";

// Import routes
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import chatRoutes from "./routes/chat";
import contactRoutes from "./routes/contacts";
import aiRoutes from "./routes/ai";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize services
initializeFirebase();
connectDatabase();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/ai-insights", aiRoutes);

// Socket.IO handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

### Phase 8: File Upload Handling

#### 8.1 Setup Multer for File Uploads
Create `crm-backend/src/middleware/upload.ts`:

```typescript
import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".csv", ".xlsx", ".xls"];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});
```

### Phase 9: Frontend Updates

#### 9.1 Update API Base URL
In your Next.js frontend, update all API calls to point to the Express backend:

**Before:**
```typescript
// Frontend API calls
fetch("/api/auth/login", { ... })
```

**After:**
```typescript
// Frontend API calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
fetch(`${API_BASE_URL}/api/auth/login`, { ... })
```

#### 9.2 Update Environment Variables
Add to `crm-system/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

#### 9.3 Remove Backend Code from Frontend
After migration is complete, remove these directories from `crm-system`:
- `src/app/api/` (all API routes)
- `src/DB/` (database configuration)
- `src/lib/aiService.ts` and `src/lib/aiContext.ts`
- `src/lib/auth.ts` (server-side auth functions)

### Phase 10: Testing & Validation

#### 10.1 Testing Checklist
1. **Database Connection**: Verify MongoDB connects successfully
2. **Authentication**: Test login, register, logout endpoints
3. **CRUD Operations**: Test all contact, tag, activity operations
4. **File Upload**: Test CSV contact import
5. **AI Integration**: Test chat and AI insights
6. **Socket.IO**: Test real-time features
7. **Error Handling**: Test error scenarios

#### 10.2 Development Workflow
1. Start MongoDB (if local)
2. Start Express backend: `cd crm-backend && npm run dev`
3. Start Next.js frontend: `cd crm-system && npm run dev`
4. Test all functionality

### Phase 11: Deployment Considerations

#### 11.1 Backend Deployment
- Use PM2 for process management
- Set up environment variables in production
- Configure reverse proxy (Nginx)
- Set up SSL certificates

#### 11.2 Database Migration
- Export data from development MongoDB
- Import to production MongoDB
- Update connection strings

#### 11.3 Frontend Deployment
- Update `NEXT_PUBLIC_API_URL` for production
- Build and deploy frontend separately

## Migration Steps Summary

1. **Setup Express Dependencies** (30 minutes)
2. **Create Directory Structure** (15 minutes)
3. **Copy Database Configuration** (45 minutes)
4. **Migrate Services and Utilities** (1-2 hours)
5. **Convert API Routes** (3-4 hours)
6. **Setup Middleware** (1 hour)
7. **Configure Socket.IO** (1 hour)
8. **Update Frontend API calls** (1-2 hours)
9. **Testing and Debugging** (2-3 hours)
10. **Clean up Frontend** (30 minutes)

**Total Estimated Time: 10-15 hours**

## Post-Migration Benefits

1. **Separation of Concerns**: Clear distinction between frontend and backend
2. **Scalability**: Independent scaling of frontend and backend
3. **Technology Flexibility**: Can use different technologies for each layer
4. **Team Collaboration**: Frontend and backend teams can work independently
5. **Deployment Flexibility**: Deploy to different servers/services
6. **Performance**: Optimized for each layer's specific needs

## Notes & Recommendations

1. **Version Control**: Create a new branch before starting migration
2. **Backup**: Backup your database before migration
3. **Incremental Migration**: Migrate one module at a time
4. **Testing**: Test each migrated module thoroughly
5. **Documentation**: Update API documentation after migration
6. **Monitoring**: Set up logging and monitoring for the new backend

This guide provides a comprehensive roadmap for migrating your backend. Follow each phase carefully and test thoroughly at each step.

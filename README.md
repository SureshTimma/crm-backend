# CRM Backend

Express.js backend server for the CRM system, migrated from Next.js.

## Features

- **Authentication**: JWT + Firebase Admin SDK
- **Contact Management**: CRUD operations with tags
- **AI Chat**: OpenAI-powered CRM assistant
- **File Upload**: CSV import/export for contacts
- **Real-time Communication**: Socket.IO for live updates
- **Activity Tracking**: Comprehensive audit logs
- **Database**: MongoDB with Mongoose ODM

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Required Environment Variables**
   - `MONGODB_URI`: MongoDB connection string
   - `FIREBASE_PROJECT_ID`: Firebase project ID
   - `FIREBASE_CLIENT_EMAIL`: Firebase service account email
   - `FIREBASE_PRIVATE_KEY`: Firebase private key
   - `OPENAI_API_KEY`: OpenAI API key
   - `JWT_SECRET`: Secret for JWT tokens
   - `FRONTEND_URL`: Frontend URL for CORS

4. **Development**
   ```bash
   npm run dev
   ```

5. **Production**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Dashboard
- `GET /api/dashboard/contacts` - Get contacts with filtering
- `POST /api/dashboard/contacts` - Create new contact
- `PUT /api/dashboard/contacts/:id` - Update contact
- `DELETE /api/dashboard/contacts/:id` - Delete contact
- `GET /api/dashboard/activities` - Get user activities
- `GET /api/dashboard/tags` - Get user tags
- `GET /api/dashboard/stats` - Get dashboard statistics

### Chat & AI
- `POST /api/chat` - Send chat message to AI
- `GET /api/conversations` - Get user conversations
- `GET /api/conversations/:id` - Get conversation details
- `POST /api/ai-insights` - Generate AI insights

### File Operations
- `POST /api/contacts/import-csv` - Import contacts from CSV
- `GET /api/contacts/export-csv` - Export contacts to CSV

## Architecture

```
src/
├── config/          # Configuration files
│   ├── database.ts  # MongoDB connection
│   └── firebase.ts  # Firebase Admin setup
├── controllers/     # Route controllers (future)
├── middleware/      # Custom middleware
│   ├── auth.ts      # Authentication middleware
│   ├── errorHandler.ts
│   └── upload.ts    # File upload middleware
├── models/          # Database models
│   ├── User.ts
│   ├── Contact.ts
│   ├── Tag.ts
│   ├── Activity.ts
│   ├── Chat.ts
│   ├── Conversation.ts
│   └── index.ts     # Model exports
├── routes/          # Express routes
│   ├── auth.ts
│   ├── dashboard.ts
│   ├── chat.ts
│   ├── conversations.ts
│   ├── contacts.ts
│   └── ai.ts
├── services/        # Business logic
│   ├── aiService.ts
│   ├── aiContext.ts
│   └── cloudinary.ts
├── utils/           # Utility functions
└── index.ts         # Main server file
```

## Database Models

- **User**: User accounts with Firebase integration
- **Contact**: Customer contact information
- **Tag**: Contact categorization tags
- **Activity**: User action audit logs
- **Chat**: AI chat messages
- **Conversation**: Chat conversation groupings

## Security

- JWT token authentication
- Firebase Admin SDK for token verification
- CORS configuration for frontend communication
- Input validation and sanitization
- Error handling and logging

## Socket.IO Events

- `connection` - User connects
- `join-user-room` - Join user-specific room
- `send-message` - Real-time chat
- `activity-update` - Live activity updates
- `disconnect` - User disconnects

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests (if configured)
npm test
```

## Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Start with PM2: `pm2 start dist/index.js --name crm-backend`
4. Configure Nginx reverse proxy
5. Set up SSL certificates

## Migration Status

✅ **Completed Components:**
- Database models and connections
- Authentication system
- Contact management (CRUD)
- Tag management
- Activity tracking
- AI chat integration
- File upload/CSV handling
- Real-time Socket.IO
- Error handling
- Route organization

⚠️ **Known Issues:**
- Some dependencies need type definitions
- AI service methods may need adjustment
- Firebase admin setup requires actual credentials

## Contributing

1. Follow TypeScript best practices
2. Use proper error handling
3. Add appropriate logging
4. Test all endpoints
5. Update documentation

## License

MIT

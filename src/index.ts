import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database";
import { initializeFirebase } from "./config/firebase";
import { errorHandler } from "./middleware/errorHandler";

// Import routes
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import chatRoutes from "./routes/chat";
import conversationRoutes from "./routes/conversations";
import contactRoutes from "./routes/contacts";
import aiRoutes from "./routes/ai";

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
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

// Health check route
app.get("/", (req, res) => {
  res.json({ 
    message: "CRM Backend Server is running",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/ai-insights", aiRoutes);

// Socket.IO handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  // Join user-specific room
  socket.on("join-user-room", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Handle real-time chat
  socket.on("send-message", (data) => {
    // Broadcast to user's room
    io.to(`user-${data.userId}`).emit("new-message", data);
  });

  // Handle activity updates
  socket.on("activity-update", (data) => {
    // Broadcast to user's room
    io.to(`user-${data.userId}`).emit("activity-updated", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize Firebase Admin
    initializeFirebase();
    console.log("🔥 Firebase Admin initialized");

    // Connect to database
    await connectDatabase();
    console.log("🗄️ Database connected");

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌍 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Start the server
startServer();

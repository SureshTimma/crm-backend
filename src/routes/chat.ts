import express from "express";
import { ChatModel } from "../models/Chat";
import { ConversationModel } from "../models/Conversation";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { EnhancedAIService } from "../services/aiService";
import mongoose from "mongoose";

const router = express.Router();

// Apply authentication to all chat routes
router.use(authenticateToken);

// POST /chat - Send a message and get AI response (matches Next.js /api/chat)
router.post("/", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const { message, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    let currentConversationId = conversationId;

    // If no conversationId provided, create a new conversation
    if (!currentConversationId) {
      const newConversation = await ConversationModel.create({
        user: userObjectId,
        title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        createdAt: new Date(),
        lastUpdated: new Date(),
      });
      currentConversationId = newConversation._id.toString();
    } else {
      // Update the lastUpdated timestamp of existing conversation
      await ConversationModel.findByIdAndUpdate(
        new mongoose.Types.ObjectId(currentConversationId),
        { lastUpdated: new Date() }
      );
    }

    const conversationObjectId = new mongoose.Types.ObjectId(currentConversationId);

    // Save user message to database
    await ChatModel.create({
      user: userObjectId,
      message: message.trim(),
      sender: "user",
      timestamp: new Date(),
      conversationId: conversationObjectId,
    });

    // Generate AI response with CRM context
    let aiResponse: string;

    try {
      aiResponse = await EnhancedAIService.processWithCRMContext(
        message,
        req.user!._id,
        currentConversationId
      );
    } catch (error) {
      console.error("Enhanced AI service error:", error);
      // Use fallback response if AI fails
      aiResponse = "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.";
    }

    // Save AI response to database
    await ChatModel.create({
      user: userObjectId,
      message: aiResponse,
      sender: "ai",
      timestamp: new Date(),
      conversationId: conversationObjectId,
    });

    return res.json({
      message: aiResponse,
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId,
      sender: "ai",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

// GET /chat - Info endpoint
router.get("/", async (req: AuthRequest, res) => {
  return res.json({
    message: "Chat API is running",
    endpoints: {
      POST: "/api/chat - Send a message and get AI response",
    },
  });
});

export default router;

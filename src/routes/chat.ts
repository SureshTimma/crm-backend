import express from "express";
import { ChatModel } from "../models/Chat";
import { ConversationModel } from "../models/Conversation";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { EnhancedAIService } from "../services/aiService";
import mongoose from "mongoose";

const router = express.Router();

// Apply authentication to all chat routes
router.use(authenticateToken);

// POST /chat
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { message, conversationId } = req.body;
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    let conversationObjectId: mongoose.Types.ObjectId;

    // Create or get conversation
    if (conversationId) {
      conversationObjectId = new mongoose.Types.ObjectId(conversationId);
      
      // Verify conversation belongs to user
      const conversation = await ConversationModel.findOne({
        _id: conversationObjectId,
        user: userObjectId,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      // Update last updated timestamp
      await ConversationModel.findByIdAndUpdate(conversationObjectId, {
        lastUpdated: new Date(),
      });
    } else {
      // Create new conversation
      const newConversation = await ConversationModel.create({
        user: userObjectId,
        title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        createdAt: new Date(),
        lastUpdated: new Date(),
      });
      conversationObjectId = newConversation._id;
    }

    // Save user message
    const userChat = await ChatModel.create({
      user: userObjectId,
      message,
      sender: "user",
      conversationId: conversationObjectId,
      timestamp: new Date(),
    });

    // Get AI response
    try {
      const aiResponse = await EnhancedAIService.processWithCRMContext(
        message,
        req.user!._id,
        conversationObjectId.toString()
      );

      // Save AI response
      const aiChat = await ChatModel.create({
        user: userObjectId,
        message: aiResponse,
        sender: "ai",
        conversationId: conversationObjectId,
        timestamp: new Date(),
      });

      return res.json({
        success: true,
        userMessage: userChat,
        aiResponse: aiChat,
        conversationId: conversationObjectId.toString(),
      });
    } catch (aiError) {
      console.error("AI service error:", aiError);
      
      // Save fallback AI response
      const fallbackResponse = "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
      const aiChat = await ChatModel.create({
        user: userObjectId,
        message: fallbackResponse,
        sender: "ai",
        conversationId: conversationObjectId,
        timestamp: new Date(),
      });

      return res.json({
        success: true,
        userMessage: userChat,
        aiResponse: aiChat,
        conversationId: conversationObjectId.toString(),
        warning: "AI service temporarily unavailable",
      });
    }
  } catch (error) {
    console.error("Error in chat:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process chat message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

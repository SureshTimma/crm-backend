import express from "express";
import { ChatModel } from "../models/Chat";
import { ConversationModel } from "../models/Conversation";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

const router = express.Router();

// Apply authentication to all conversation routes
router.use(authenticateToken);

// GET /conversations
router.get("/", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const { page = "1", limit = "20" } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const totalCount = await ConversationModel.countDocuments({ user: userObjectId });

    const conversations = await ConversationModel.find({ user: userObjectId })
      .sort({ lastUpdated: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    return res.json({
      success: true,
      conversations,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        totalCount,
        hasMore: skip + conversations.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /conversations
router.post("/", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const { title = "New Conversation" } = req.body;

    const newConversation = await ConversationModel.create({
      user: userObjectId,
      title,
      createdAt: new Date(),
      lastUpdated: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      conversation: newConversation,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create conversation",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /conversations/:id
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const conversationId = req.params.id;

    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      user: userObjectId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Get chat messages for this conversation
    const messages = await ChatModel.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      user: userObjectId,
    })
      .sort({ timestamp: 1 })
      .lean();

    return res.json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversation",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /conversations/:id
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const conversationId = req.params.id;

    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      user: userObjectId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Delete all messages in this conversation
    await ChatModel.deleteMany({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      user: userObjectId,
    });

    // Delete the conversation
    await ConversationModel.findByIdAndDelete(conversationId);

    return res.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete conversation",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

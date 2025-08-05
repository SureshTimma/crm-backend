import express from "express";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { EnhancedAIService } from "../services/aiService";

const router = express.Router();

// Apply authentication to all AI routes
router.use(authenticateToken);

// POST /ai-insights
router.post("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!._id;

    // Generate AI insights for the user's CRM data
    const insights = await EnhancedAIService.generateInsights(userId);

    return res.json({
      success: true,
      insights,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate AI insights",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /ai-insights/suggest-tags
router.post("/suggest-tags", async (req: AuthRequest, res) => {
  try {
    const { contactData } = req.body;

    if (!contactData) {
      return res.status(400).json({
        success: false,
        message: "Contact data is required",
      });
    }

    const suggestedTags = await EnhancedAIService.suggestTags(contactData);

    return res.json({
      success: true,
      suggestedTags,
    });
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to suggest tags",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

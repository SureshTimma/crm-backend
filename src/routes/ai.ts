import express from "express";
import mongoose from "mongoose";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { EnhancedAIService } from "../services/aiService";

const router = express.Router();

// Apply authentication to all AI routes
router.use(authenticateToken);

// POST /ai-insights - AI Insights endpoint that matches Next.js /api/ai-insights
router.post("/", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!._id;
    const { type, contactName } = req.body;

    let response: string;

    switch (type) {
      case 'insights':
        response = await EnhancedAIService.generateCRMInsights(userId);
        break;
        
      case 'actions':
        response = await EnhancedAIService.suggestNextActions(userId);
        break;
        
      case 'engagement':
        response = await EnhancedAIService.analyzeContactEngagement(userId, contactName);
        break;
        
      default:
        return res.status(400).json({
          error: "Invalid insight type. Use 'insights', 'actions', or 'engagement'"
        });
    }

    return res.json({
      insight: response,
      type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("AI Insights API error:", error);
    return res.status(500).json({
      error: "Failed to generate insights"
    });
  }
});

// GET /ai-insights - Info endpoint
router.get("/", async (req: AuthRequest, res) => {
  return res.json({
    message: "AI Insights API is running",
    endpoints: {
      POST: "/api/ai-insights - Generate CRM insights",
    },
    supportedTypes: [
      "insights - General CRM data insights",
      "actions - Suggested next actions", 
      "engagement - Contact engagement analysis"
    ]
  });
});

export default router;

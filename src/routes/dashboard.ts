import express from "express";
import { ContactModel } from "../models/Contact";
import { TagModel } from "../models/Tag";
import { ActivityModel } from "../models/Activity";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

const router = express.Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

// GET /dashboard - Main dashboard endpoint that returns all data
router.get("/", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    
    // Fetch all dashboard data in parallel
    const [contacts, activities, tags] = await Promise.all([
      // Get recent contacts
      ContactModel.find({ createdBy: userObjectId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('tags', 'tagName color')
        .lean(),
      
      // Get recent activities
      ActivityModel.find({ user: userObjectId })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
      
      // Get tags
      TagModel.find({ createdBy: userObjectId })
        .sort({ usageCount: -1 })
        .lean()
    ]);

    // Calculate stats
    const totalContacts = await ContactModel.countDocuments({ createdBy: userObjectId });
    const totalActivities = await ActivityModel.countDocuments({ user: userObjectId });
    const totalTags = await TagModel.countDocuments({ createdBy: userObjectId });

    // Transform data to match frontend expectations
    // Generate contactsByCompany distribution (exactly 5 companies)
    const companyAggregation = await ContactModel.aggregate([
      { $match: { createdBy: userObjectId } },
      { 
        $group: { 
          _id: { $ifNull: ["$company", "No Company"] }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 5 } // Exactly 5 companies as requested
    ]);

    // Ensure we always have data - if less than 5 companies, fill with sample data
    const contactsByCompany = [];
    companyAggregation.forEach(item => {
      contactsByCompany.push({
        company: item._id || "No Company",
        contacts: item.count
      });
    });

    // If we have less than 5 companies, pad with zeros for better chart display
    while (contactsByCompany.length < 5) {
      contactsByCompany.push({
        company: `Company ${contactsByCompany.length + 1}`,
        contacts: 0
      });
    }

    // Transform activities for timeline (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activityTimelineData = await ActivityModel.aggregate([
      { 
        $match: { 
          user: userObjectId,
          timestamp: { $gte: sevenDaysAgo } // Only last 7 days
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } } // Ascending order for timeline
    ]);

    // Create a complete 7-day timeline (even if some days have 0 activities)
    const activityTimeline = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const existingData = activityTimelineData.find(item => item._id === dateString);
      activityTimeline.push({
        date: dateString,
        day: 7 - i, // Day number 1-7
        activities: existingData ? existingData.count : 0
      });
    }

    // Transform tags for distribution with better color handling
    const tagDistribution = tags.map((tag: any, index: number) => ({
      name: tag.tagName,
      value: tag.usageCount || 0,
      color: tag.color || [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
      ][index % 10] // Cycle through predefined colors
    }));

    const dashboardData = {
      stats: {
        totalContacts,
        totalActivities,
        totalTags,
        recentActivityCount: activities.length
      },
      contactsByCompany: contactsByCompany,
      activityTimeline: activityTimeline,
      tagDistribution: tagDistribution,
      // Additional data for dashboard components
      recentContacts: contacts.slice(0, 5), // Last 5 contacts
      recentActivities: activities.slice(0, 10), // Last 10 activities
      topTags: tags.slice(0, 5) // Top 5 most used tags
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch dashboard data" 
    });
  }
});

// GET /dashboard/activities
router.get("/activities", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const { 
      page = "0", 
      limit = "20", 
      dateRange = "all",
      activityType = "all",
      userId = "all"
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = Math.max(0, pageNum * limitNum); // Ensure skip is never negative
    
    // Build filter query
    const filter: any = { user: userObjectId };

    // Date range filter
    if (dateRange !== "all") {
      const days = parseInt(dateRange.toString().replace('d', ''));
      if (!isNaN(days)) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        filter.timestamp = { $gte: dateThreshold };
      }
    }

    // Activity type filter
    if (activityType !== "all") {
      filter.action = activityType;
    }

    // User filter (if different user is selected - though typically this would be the logged-in user)
    if (userId !== "all" && userId !== req.user!._id) {
      filter.user = new mongoose.Types.ObjectId(userId as string);
    }

    const totalCount = await ActivityModel.countDocuments(filter);

    const activities = await ActivityModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', '_id name email')
      .lean();

    return res.json({
      success: true,
      activities,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        hasMore: skip + activities.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /dashboard/tags
router.get("/tags", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);

    const tags = await TagModel.find({ createdBy: userObjectId })
      .sort({ usageCount: -1 })
      .lean();

    return res.json({
      success: true,
      tags,
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tags",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /dashboard/tags
router.post("/tags", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const { tagName, color = "#3B82F6" } = req.body;

    if (!tagName) {
      return res.status(400).json({
        success: false,
        message: "Tag name is required",
      });
    }

    const existingTag = await TagModel.findOne({
      tagName,
      createdBy: userObjectId,
    });

    if (existingTag) {
      return res.status(409).json({
        success: false,
        message: "Tag already exists",
      });
    }

    const newTag = await TagModel.create({
      tagName,
      color,
      createdBy: userObjectId,
      usageCount: 0,
    });

    return res.status(201).json({
      success: true,
      message: "Tag created successfully",
      tag: newTag,
    });
  } catch (error) {
    console.error("Error creating tag:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create tag",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /dashboard/tags/:id - Update a tag
router.put("/tags/:id", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const tagId = req.params.id;
    const { tagName, color } = req.body;

    const updatedTag = await TagModel.findOneAndUpdate(
      { _id: tagId, createdBy: userObjectId },
      {
        tagName,
        color,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedTag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found or access denied",
      });
    }

    return res.json({
      success: true,
      message: "Tag updated successfully",
      tag: updatedTag,
    });
  } catch (error) {
    console.error("Error updating tag:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update tag",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /dashboard/tags/:id - Delete a tag
router.delete("/tags/:id", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const tagId = req.params.id;

    const deletedTag = await TagModel.findOneAndDelete({
      _id: tagId,
      createdBy: userObjectId,
    });

    if (!deletedTag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found or access denied",
      });
    }

    return res.json({
      success: true,
      message: "Tag deleted successfully",
      tag: deletedTag,
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete tag",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /dashboard/stats
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);

    const [contactsCount, activitiesCount, tagsCount] = await Promise.all([
      ContactModel.countDocuments({ createdBy: userObjectId }),
      ActivityModel.countDocuments({ user: userObjectId }),
      TagModel.countDocuments({ createdBy: userObjectId }),
    ]);

    // Get recent activities
    const recentActivities = await ActivityModel.find({ user: userObjectId })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    // Get contact distribution by company
    const companyStats = await ContactModel.aggregate([
      { $match: { createdBy: userObjectId } },
      { $group: { _id: "$company", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return res.json({
      success: true,
      stats: {
        contactsCount,
        activitiesCount,
        tagsCount,
        recentActivities,
        companyStats,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

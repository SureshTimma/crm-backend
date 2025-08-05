import express from "express";
import { ContactModel } from "../models/Contact";
import { TagModel } from "../models/Tag";
import { ActivityModel } from "../models/Activity";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

const router = express.Router();

// Apply authentication to all dashboard routes
router.use(authenticateToken);

// Helper function to safely get tag ObjectIds from tag names
async function getTagObjectIds(
  tagNames: string[],
  userObjectId: mongoose.Types.ObjectId
) {
  if (!tagNames || tagNames.length === 0) return [];

  try {
    const tagIds = [];
    for (const tagName of tagNames) {
      const tag = await TagModel.findOne({
        tagName,
        createdBy: userObjectId,
      });
      if (tag) {
        tagIds.push(tag._id);
      }
    }
    return tagIds;
  } catch (error) {
    console.error("Error fetching/creating tag ObjectIds:", error);
    return [];
  }
}

// Helper function to transform tags for frontend
function transformTagsForFrontend(tags: any[]): any[] {
  if (!tags || !Array.isArray(tags)) return [];

  return tags
    .map((tag) => {
      if (typeof tag === "string") {
        return tag;
      } else if (tag && typeof tag === "object" && "tagName" in tag) {
        return {
          _id: tag._id,
          tagName: tag.tagName,
          color: tag.color,
        };
      } else {
        return String(tag || "");
      }
    })
    .filter(Boolean);
}

// GET /dashboard/contacts
router.get("/contacts", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const { search, tag, sortBy = "createdAt", sortOrder = "desc", page = "1", limit = "50" } = req.query;

    const filter: any = { createdBy: userObjectId };

    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    // Tag filter
    if (tag) {
      const tagDoc = await TagModel.findOne({
        tagName: tag,
        createdBy: userObjectId,
      });
      if (tagDoc) {
        filter.tags = { $in: [tagDoc._id] };
      }
    }

    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === "asc" ? 1 : -1;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const totalCount = await ContactModel.countDocuments(filter);

    let contactsData;
    try {
      contactsData = await ContactModel.find(filter)
        .populate("tags", "tagName color")
        .populate("createdBy", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean();
    } catch (populateError) {
      console.warn("Population failed, falling back to basic query:", populateError);
      contactsData = await ContactModel.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean();
    }

    const transformedContacts = contactsData.map((contact) => ({
      ...contact,
      tags: transformTagsForFrontend(contact.tags || []),
    }));

    const availableTags = await TagModel.find({ createdBy: userObjectId })
      .sort({ tagName: 1 })
      .lean();

    return res.json({
      success: true,
      contacts: transformedContacts,
      availableTags,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string)),
        totalCount,
        hasMore: skip + contactsData.length < totalCount,
      }
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /dashboard/contacts
router.post("/contacts", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);

    // Handle tag creation/updating
    if (req.body.tags && req.body.tags.length > 0) {
      for (const tagName of req.body.tags) {
        await TagModel.findOneAndUpdate(
          { tagName },
          {
            $inc: { usageCount: 1 },
            $setOnInsert: {
              color: "#3B82F6",
              createdBy: userObjectId,
              createdAt: new Date(),
            },
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }
    }

    const tagIds = await getTagObjectIds(req.body.tags || [], userObjectId);

    const newContact = await ContactModel.create({
      ...req.body,
      tags: tagIds,
      createdBy: userObjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastInteraction: new Date(),
    });

    const populatedContact = await ContactModel.findById(newContact._id)
      .populate("tags", "tagName color")
      .populate("createdBy", "name email")
      .lean();

    // Log activity
    await ActivityModel.create({
      user: userObjectId,
      action: "Created contact",
      entityType: "Contact",
      entityId: newContact._id,
      entityName: newContact.name,
      timestamp: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Contact created successfully",
      contact: populatedContact,
    });
  } catch (error) {
    console.error("Error creating contact:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create contact",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PUT /dashboard/contacts/:id
router.put("/contacts/:id", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const contactId = req.params.id;

    const contact = await ContactModel.findOne({
      _id: contactId,
      createdBy: userObjectId,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    // Handle tag updates
    if (req.body.tags && req.body.tags.length > 0) {
      for (const tagName of req.body.tags) {
        await TagModel.findOneAndUpdate(
          { tagName },
          {
            $inc: { usageCount: 1 },
            $setOnInsert: {
              color: "#3B82F6",
              createdBy: userObjectId,
              createdAt: new Date(),
            },
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }
    }

    const tagIds = await getTagObjectIds(req.body.tags || [], userObjectId);

    const updatedContact = await ContactModel.findByIdAndUpdate(
      contactId,
      {
        ...req.body,
        tags: tagIds,
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate("tags", "tagName color")
      .populate("createdBy", "name email");

    // Log activity
    await ActivityModel.create({
      user: userObjectId,
      action: "Updated contact",
      entityType: "Contact",
      entityId: contact._id,
      entityName: contact.name,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      message: "Contact updated successfully",
      contact: updatedContact,
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update contact",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /dashboard/contacts/:id
router.delete("/contacts/:id", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const contactId = req.params.id;

    const contact = await ContactModel.findOne({
      _id: contactId,
      createdBy: userObjectId,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    await ContactModel.findByIdAndDelete(contactId);

    // Log activity
    await ActivityModel.create({
      user: userObjectId,
      action: "Deleted contact",
      entityType: "Contact",
      entityId: contact._id,
      entityName: contact.name,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete contact",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /dashboard/activities
router.get("/activities", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const { page = "1", limit = "20" } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const totalCount = await ActivityModel.countDocuments({ user: userObjectId });

    const activities = await ActivityModel.find({ user: userObjectId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    return res.json({
      success: true,
      activities,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string)),
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

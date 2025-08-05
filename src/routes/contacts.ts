import express from "express";
import { ContactModel } from "../models/Contact";
import { TagModel } from "../models/Tag";
import { ActivityModel } from "../models/Activity";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { upload } from "../middleware/upload";
import mongoose from "mongoose";
import csv from "csv-parser";
import { Readable } from "stream";

const router = express.Router();

// Apply authentication to all contact routes
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

// GET /contacts - Get all contacts for the authenticated user
router.get("/", async (req: AuthRequest, res) => {
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

    const transformedContacts = contactsData.map((contact: any) => ({
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

// POST /contacts - Create a new contact
router.post("/", async (req: AuthRequest, res) => {
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

// PUT /contacts/:id - Update a contact
router.put("/:id", async (req: AuthRequest, res) => {
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

// DELETE /contacts/:id - Delete a contact
router.delete("/:id", async (req: AuthRequest, res) => {
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

// POST /contacts/import-csv - Import contacts from CSV
router.post("/import-csv", upload.single("file"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);
    const results: any[] = [];
    const errors: string[] = [];
    let successCount = 0;

    // Parse CSV from buffer
    const stream = Readable.from(req.file.buffer);
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", resolve)
        .on("error", reject);
    });

    // Process each row
    for (const [index, row] of results.entries()) {
      try {
        const { name, email, phone, company, tags, notes } = row;

        if (!name || !email) {
          errors.push(`Row ${index + 1}: Name and email are required`);
          continue;
        }

        // Check if contact already exists
        const existingContact = await ContactModel.findOne({
          email,
          createdBy: userObjectId,
        });

        if (existingContact) {
          errors.push(`Row ${index + 1}: Contact with email ${email} already exists`);
          continue;
        }

        // Process tags if provided
        let tagIds: mongoose.Types.ObjectId[] = [];
        if (tags) {
          const tagNames = tags.split(",").map((tag: string) => tag.trim());
          for (const tagName of tagNames) {
            if (tagName) {
              const tag = await TagModel.findOneAndUpdate(
                { tagName, createdBy: userObjectId },
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
              tagIds.push(tag._id);
            }
          }
        }

        // Create contact
        await ContactModel.create({
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim() || undefined,
          company: company?.trim() || undefined,
          notes: notes?.trim() || undefined,
          tags: tagIds,
          createdBy: userObjectId,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastInteraction: new Date(),
        });

        successCount++;
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Log import activity
    await ActivityModel.create({
      user: userObjectId,
      action: "Imported contacts",
      entityType: "Contact",
      entityId: new mongoose.Types.ObjectId(),
      entityName: `${successCount} contacts from CSV`,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      message: `Successfully imported ${successCount} contacts`,
      details: {
        totalProcessed: results.length,
        successCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Limit error messages
      },
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to import CSV",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /contacts/export-csv
router.get("/export-csv", async (req: AuthRequest, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user!._id);

    const contacts = await ContactModel.find({ createdBy: userObjectId })
      .populate("tags", "tagName")
      .lean();

    // Convert to CSV format
    const csvHeaders = ["Name", "Email", "Phone", "Company", "Tags", "Notes", "Created At"];
    let csvContent = csvHeaders.join(",") + "\n";

    for (const contact of contacts) {
      const tags = Array.isArray(contact.tags) 
        ? contact.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.tagName).join(";")
        : "";
      
      const row = [
        `"${contact.name || ""}"`,
        `"${contact.email || ""}"`,
        `"${contact.phone || ""}"`,
        `"${contact.company || ""}"`,
        `"${tags}"`,
        `"${contact.notes || ""}"`,
        `"${new Date(contact.createdAt).toLocaleDateString()}"`,
      ];
      csvContent += row.join(",") + "\n";
    }

    // Log export activity
    await ActivityModel.create({
      user: userObjectId,
      action: "Exported contacts",
      entityType: "Contact",
      entityId: new mongoose.Types.ObjectId(),
      entityName: `${contacts.length} contacts to CSV`,
      timestamp: new Date(),
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.csv"`);
    
    return res.send(csvContent);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export CSV",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

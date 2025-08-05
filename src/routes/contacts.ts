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

// POST /contacts/import-csv
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

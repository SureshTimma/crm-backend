import mongoose, { Document, Types, Schema } from "mongoose";

export interface IContact extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tags: Types.ObjectId[];
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastInteraction: Date;
}

const ContactSchema = new Schema<IContact>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  company: String,
  tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastInteraction: { type: Date, default: Date.now },
});

export const ContactModel =
  mongoose.models.Contact || mongoose.model<IContact>("Contact", ContactSchema);

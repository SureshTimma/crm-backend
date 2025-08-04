import mongoose, { Document, Types, Schema } from "mongoose";

export interface ITag extends Document {
  _id: Types.ObjectId;
  tagName: string;
  color: string;
  usageCount: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>({
  tagName: { type: String, required: true, unique: true },
  color: { type: String, required: true, default: "#3B82F6" },
  usageCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const TagModel =
  mongoose.models.Tag || mongoose.model<ITag>("Tag", TagSchema);

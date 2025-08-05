import mongoose, { Document, Types, Schema } from "mongoose";

export interface IActivity extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  entityName: string;
  details?: {
    before?: Record<string, string>;
    after?: Record<string, string>;
    metadata?: Record<string, string>;
  };
  timestamp: Date;
}

const ActivitySchema = new Schema<IActivity>({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  entityName: { type: String, required: true },
  details: {
    type: {
      before: { type: Map, of: String },
      after: { type: Map, of: String },
      metadata: { type: Map, of: String }
    },
    required: false
  },
  timestamp: { type: Date, default: Date.now },
});

export const ActivityModel =
  mongoose.models.Activity ||
  mongoose.model<IActivity>("Activity", ActivitySchema);

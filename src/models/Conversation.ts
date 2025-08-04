import mongoose, { Document, Types, Schema } from "mongoose";

export interface IConversation extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  createdAt: Date;
  lastUpdated: Date;
}

const ConversationSchema = new Schema<IConversation>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, default: "Untitled Conversation" },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
});

export const ConversationModel =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

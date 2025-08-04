import mongoose, { Document, Types, Schema } from "mongoose";

export interface IChat extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  message: string;
  sender: "user" | "ai";
  timestamp: Date;
  conversationId: Types.ObjectId;
}

const ChatSchema = new Schema<IChat>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  sender: { type: String, enum: ["user", "ai"], required: true },
  timestamp: { type: Date, default: Date.now },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  },
});

export const ChatModel =
  mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);

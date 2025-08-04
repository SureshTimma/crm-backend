import mongoose, { Document, Types, Schema } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  firebaseUid: string;
  name: string;
  email: string;
  password: string;
  profileImage?: string;
  profileImagePublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  firebaseUid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: { type: String },
  profileImagePublicId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

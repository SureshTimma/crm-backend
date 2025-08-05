import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";

export interface AuthenticatedUser {
  _id: string;
  firebaseUid: string;
  name: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await UserModel.findById(decoded.userId).lean();

    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = {
      _id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

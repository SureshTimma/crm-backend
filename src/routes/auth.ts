import express from "express";
import { UserModel } from "../models/User";
import { initializeFirebase, verifyFirebaseToken } from "../config/firebase";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { idToken, email, password } = req.body;

    // Firebase login (idToken)
    if (idToken) {
      const decoded = await verifyFirebaseToken(idToken);
      let user = await UserModel.findOne({ firebaseUid: decoded.uid });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Issue JWT for session
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
      return res.json({ user, token });
    }

    // Local login (email/password)
    if (email && password) {
      const user = await UserModel.findOne({ email });
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
      return res.json({ user, token });
    }

    return res.status(400).json({ error: "Missing login credentials" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, firebaseUid } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      firebaseUid,
    });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    return res.status(201).json({ user, token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /auth/logout
router.post("/logout", (req, res) => {
  // For JWT, logout is handled client-side by deleting the token
  return res.json({ message: "Logged out" });
});

// GET /auth/profile
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await UserModel.findById((decoded as any).userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// PUT /auth/profile
router.put("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await UserModel.findById((decoded as any).userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { name, profileImage } = req.body;
    if (name) user.name = name;
    if (profileImage) user.profileImage = profileImage;
    await user.save();
    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// GET /auth/user/:uid
router.get("/user/:uid", async (req, res) => {
  try {
    const user = await UserModel.findOne({ firebaseUid: req.params.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /auth/settings/password
router.put("/settings/password", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await UserModel.findById((decoded as any).userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { oldPassword, newPassword } = req.body;
    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(401).json({ error: "Old password incorrect" });
    }
    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();
    return res.json({ message: "Password updated" });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token or password" });
  }
});

export default router;

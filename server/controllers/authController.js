import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const issueToken = (user) => {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.username,
      image: user.image,
      role: user.role,
    },
  };
};

// POST /api/auth/signup   body: { name, email, password }
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      _id: crypto.randomUUID(),
      email,
      username: name,
      password: hashedPassword,
    });

    res.json({ success: true, ...issueToken(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login   body: { email, password }
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    // user.password won't exist for accounts created via Google only
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    res.json({ success: true, ...issueToken(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/google   body: { credential }  (the ID token from Google Sign-In)
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: "Missing Google credential" });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        _id: googleId,
        email,
        username: name || email.split("@")[0],
        image: picture || "",
      });
    } else {
      // Update only the changed fields directly in the DB instead of
      // user.save(), which would re-validate the whole document
      // (including any legacy/stale field values already stored, e.g.
      // an old "role" value from a previous version of this schema).
      user = await User.findByIdAndUpdate(
        user._id,
        { $set: { username: name || user.username, image: picture || user.image } },
        { new: true }
      );
    }

    res.json({ success: true, ...issueToken(user) });
  } catch (error) {
    console.log(error.message);
    res.status(401).json({ success: false, message: "Google authentication failed" });
  }
};
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// middleware to check if user is authenticated - verifies our own JWT,
// issued after login/signup or Google sign-in
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "not authenticated" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "not authenticated" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "not authenticated" });
  }
};

// Like `protect`, but for public routes (e.g. guest booking) that should
// still work for someone NOT logged in - it never blocks the request for
// missing/invalid tokens, it just attaches req.user when there IS a valid
// one, so a logged-in visitor's booking gets linked to their account.
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user) req.user = user;
    }
  } catch (error) {
    // invalid/expired token on a public route - just continue as a guest
  }
  next();
};

// middleware to restrict a route to admin only (must run after protect)
export const isAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access only" });
  }
  next();
};

// middleware to restrict a route to any hotel staff member - admin,
// receptionist, or cashier (must run after protect)
export const isStaff = async (req, res, next) => {
  if (!req.user || !["admin", "receptionist", "cashier"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Staff access only" });
  }
  next();
};

// middleware to restrict a route to whoever can verify guest payments -
// admin or cashier (must run after protect)
export const isPaymentStaff = async (req, res, next) => {
  if (!req.user || !["admin", "cashier"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Payments access only" });
  }
  next();
};

// middleware to restrict a route to whoever manages bookings and rooms day
// to day - admin or receptionist. A cashier's job is verifying payments,
// not creating walk-ins, changing booking status, or toggling room
// availability, so they're deliberately excluded here (must run after protect).
export const isBookingStaff = async (req, res, next) => {
  if (!req.user || !["admin", "receptionist"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Front-desk access only" });
  }
  next();
};
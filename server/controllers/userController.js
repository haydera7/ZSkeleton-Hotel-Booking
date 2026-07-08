import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

//get /api/user/

export const getUserData = async (req,res)=>{
    try {
        const role = req.user.role;

        res.json({success:true,role})
    } catch (error) {
        res.json({success:false,message:error.message})
    }
}

// Admin only: list all registered users, so the admin can promote someone
// to "receptionist" or "cashier" after they've signed up.
// GET /api/user/admin/all
export const getAllUsers = async (req,res) => {
    try {
        const users = await User.find({}).sort({createdAt: -1});
        res.json({success:true, users});
    } catch (error) {
        res.json({success:false, message: error.message});
    }
}

// Admin only: update a staff/user's details and role.
// PUT /api/user/admin/role   body: { userId, username, email, password, role }
export const updateUserRole = async (req,res) => {
    try {
        const {userId, username, email, password, role} = req.body;

        if(role && !["guest","receptionist","cashier","admin"].includes(role)){
            return res.json({success:false, message:"Invalid role value"});
        }

        const updates = {};
        if (role) updates.role = role;

        if (username !== undefined) {
            const cleanUsername = String(username || '').trim();
            if (!cleanUsername) {
                return res.json({success:false, message:"Full name is required"});
            }
            updates.username = cleanUsername;
        }

        if (email !== undefined) {
            const normalizedEmail = String(email || '').trim().toLowerCase();
            if (!normalizedEmail) {
                return res.json({success:false, message:"Email is required"});
            }
            const existing = await User.findOne({email: normalizedEmail, _id: {$ne: userId}});
            if(existing){
                return res.json({success:false, message:"An account with this email already exists"});
            }
            updates.email = normalizedEmail;
        }

        if (password) {
            if(password.length < 8){
                return res.json({success:false, message:"Password must be at least 8 characters"});
            }
            updates.password = await bcrypt.hash(password, 10);
        }

        const user = await User.findByIdAndUpdate(userId, updates, {new:true});
        if(!user){
            return res.json({success:false, message:"User not found"});
        }

        res.json({success:true, message:`Staff member updated successfully`, user});
    } catch (error) {
        res.json({success:false, message: error.message});
    }
}

// Admin only: create a new staff account directly from the dashboard.
// POST /api/user/admin/staff   body: { username, email, password, role }
export const createStaffUser = async (req,res) => {
    try {
        const {username, email, password, role} = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const cleanUsername = String(username || '').trim();

        if(!cleanUsername || !normalizedEmail || !password || !role){
            return res.json({success:false, message:"Username, email, password, and role are required"});
        }
        if(!["receptionist","cashier","admin"].includes(role)){
            return res.json({success:false, message:"Choose a staff role"});
        }
        if(password.length < 8){
            return res.json({success:false, message:"Password must be at least 8 characters"});
        }

        const existing = await User.findOne({email: normalizedEmail});
        if(existing){
            return res.json({success:false, message:"An account with this email already exists"});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            _id: crypto.randomUUID(),
            username: cleanUsername,
            email: normalizedEmail,
            password: hashedPassword,
            role,
        });

        res.json({success:true, message:`${user.username} added as ${role}`, user});
    } catch (error) {
        res.json({success:false, message:error.message});
    }
}

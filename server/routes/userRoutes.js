import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import { getAllUsers, getUserData, updateUserRole, createStaffUser } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get('/', protect,getUserData);
userRouter.get('/admin/all', protect, isAdmin, getAllUsers);
userRouter.put('/admin/role', protect, isAdmin, updateUserRole);
userRouter.post('/admin/staff', protect, isAdmin, createStaffUser);



export default userRouter;
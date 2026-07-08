import express from "express";
import { googleLogin, signup, login } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/google", googleLogin);
authRouter.post("/signup", signup);
authRouter.post("/login", login);

export default authRouter;
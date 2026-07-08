import express from "express";
import { submitInquiry } from "../controllers/inquiryController.js";

const inquiryRouter = express.Router();

inquiryRouter.post('/', submitInquiry);

export default inquiryRouter;
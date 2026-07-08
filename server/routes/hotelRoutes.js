import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import { getHotelSettings, refreshExchangeRateNow, updateHotelSettings } from "../controllers/hotelController.js";

const hotelRouter = express.Router();

hotelRouter.get('/', getHotelSettings);
hotelRouter.put('/', protect, isAdmin, updateHotelSettings);
hotelRouter.post('/refresh-exchange-rate', protect, isAdmin, refreshExchangeRateNow);

export default hotelRouter;
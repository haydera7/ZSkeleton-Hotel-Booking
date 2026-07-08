import dotenv from "dotenv";
dotenv.config();

import express from "express"
import cors from "cors"
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import hotelRouter from "./routes/hotelRoutes.js";
import roomRouter from "./routes/roomRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import { stripeWebhooks } from "./controllers/stripeWebHooks.js";
import inquiryRouter from "./routes/inquiryRoutes.js";

connectDB();

const app = express();

app.use(cors())

// API to Stripe webhook
app.post('/api/stripe', express.raw({type: "application/json"}), stripeWebhooks)

//middleware
app.use(express.json())

app.get('/', (req,res)=> res.send("API is working "))
app.use('/api/auth', authRouter)
app.use('/api/user', userRouter)
app.use('/api/hotel', hotelRouter)
app.use('/api/rooms', roomRouter)
app.use('/api/bookings', bookingRouter)
app.use('/api/inquiries', inquiryRouter)

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
})
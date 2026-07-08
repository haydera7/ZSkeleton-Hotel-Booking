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

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o))) {
            return callback(null, true);
        }
        return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}))

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

    // Keep Render free-tier server awake by pinging itself every 14 minutes.
    // Render puts free services to sleep after 15 min of inactivity.
    // This only runs when a RENDER_EXTERNAL_URL env var is set (i.e. on Render).
    if (process.env.RENDER_EXTERNAL_URL) {
        setInterval(async () => {
            try {
                const res = await fetch(`${process.env.RENDER_EXTERNAL_URL}/`);
                console.log(`[keep-alive] ping → ${res.status}`);
            } catch (err) {
                console.warn('[keep-alive] ping failed:', err.message);
            }
        }, 14 * 60 * 1000); // every 14 minutes
    }
})
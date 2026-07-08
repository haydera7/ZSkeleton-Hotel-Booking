import mongoose from "mongoose";

// Cache the connection at global scope so it survives across
// Vercel serverless function invocations (warm containers).
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn; // reuse existing connection
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(`${process.env.MONGODB_URI}/hotel-booking`, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 1,
        });
    }

    try {
        cached.conn = await cached.promise;
        console.log("Database connected");
    } catch (error) {
        cached.promise = null; // reset so next call retries
        console.error("Database connection error:", error.message);
    }

    return cached.conn;
}

export default connectDB;
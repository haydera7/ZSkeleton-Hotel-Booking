import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        return; // reuse existing connection — avoids reconnecting on every request
    }

    try {
        const db = await mongoose.connect(`${process.env.MONGODB_URI}/hotel-booking`, {
            serverSelectionTimeoutMS: 10000, // fail fast if Atlas unreachable
            socketTimeoutMS: 45000,          // close idle sockets after 45s
            maxPoolSize: 10,                 // keep up to 10 connections in pool
            minPoolSize: 1,                  // always keep 1 ready
        });

        isConnected = db.connections[0].readyState === 1;
        console.log("Database connected");
    } catch (error) {
        console.error("Database connection error:", error.message);
    }
}

export default connectDB;
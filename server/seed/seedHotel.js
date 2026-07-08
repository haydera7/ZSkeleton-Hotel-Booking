// One-time / re-runnable script to create or update the single Hotel
// settings document. Run with: npm run seed  (from the /server folder)
//
// Safe to re-run: it upserts (updates the existing doc if one exists,
// creates it if not) rather than duplicating rows.

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";

const defaultHotelData = {
  name: "Awetu Grand Hotel",
  address: "Jimma, Oromia, Ethiopia",
  city: "Jimma",
  contact: "+251 900 000 000",
  email: "info@example.com",
  description:
    "A comfortable, modern hotel in the heart of Jimma, offering easy access to the city center and warm Ethiopian hospitality.",
  amenities: ["Free WiFi", "Free Breakfast", "Parking", "Room Service", "Pool"],
  photos: [],
  policies: {
    checkInTime: "14:00",
    checkOutTime: "12:00",
    cancellationPolicy: "Free cancellation up to 24 hours before check-in.",
  },
  // Placeholder - go to Admin > Settings and replace with your hotel's
  // actual bank account before accepting real bank-transfer payments.
  bankDetails: {
    bankName: "REPLACE_ME - e.g. Commercial Bank of Ethiopia",
    accountName: "REPLACE_ME - hotel's registered account name",
    accountNumber: "REPLACE_ME",
  },
  currency: "ETB",
  // Approximate ETB/USD rate as of writing - update this in Admin > Settings
  // to whatever the current rate actually is before accepting real Stripe payments.
  usdExchangeRate: 140,
};

const run = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/hotel-booking`);
    console.log("Database connected");

    const existing = await Hotel.findOne({});

    if (existing) {
      // Update the existing singleton with the defaults above.
      // Comment out any fields you don't want to overwrite.
      Object.assign(existing, defaultHotelData);
      await existing.save();
      console.log("Existing hotel settings updated:", existing._id.toString());
    } else {
      const created = await Hotel.create(defaultHotelData);
      console.log("Hotel settings created:", created._id.toString());
    }
  } catch (error) {
    console.error("Seed failed:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
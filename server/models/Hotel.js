import mongoose from "mongoose";

// This collection is a SINGLETON - there should only ever be one Hotel
// document in the database, representing the one hotel this deployment
// is built for. Use server/seed/seedHotel.js to create/update it.
const hotelSchema = new mongoose.Schema({
    name:{type: String, required: true},
    address:{type: String, required: true},
    city:{type: String, required: true},
    contact:{type: String, required: true},
    email:{type: String},
    description:{type: String, default: ""},
    amenities:{type: [String], default: []},
    photos:{type: [String], default: []},
    policies:{
        checkInTime:{type: String, default: "14:00"},
        checkOutTime:{type: String, default: "12:00"},
        cancellationPolicy:{type: String, default: ""},
    },
    // Shown to Ethiopian guests on the bank-transfer payment step.
    // Editable from the admin Settings page - never hardcode this in the
    // frontend, it needs to reflect the actual hotel's account.
    bankDetails:{
        bankName:{type: String, default: ""},
        accountName:{type: String, default: ""},
        accountNumber:{type: String, default: ""},
    },
    currency:{type: String, default: "ETB"},
    // How many units of `currency` equal 1 USD. Used ONLY to convert an
    // ETB-priced room into a USD amount for Stripe, since Stripe checkout
    // charges foreign guests in USD but room prices are stored in ETB.
    usdExchangeRate:{type: Number, default: 140},
    // When usdExchangeRate was last refreshed, and how (auto from a live
    // rate API, or manually typed in by an admin). Lets the site
    // auto-refresh a stale rate instead of silently drifting out of date.
    usdExchangeRateUpdatedAt:{type: Date},
    usdExchangeRateSource:{type: String, enum: ["manual","auto"], default: "manual"},
},{timestamps: true});

const Hotel = mongoose.model("Hotel", hotelSchema);

export default Hotel;
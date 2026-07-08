import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
       // user is optional - most bookings now come from the public,
       // no-login guest booking flow. If the visitor happened to be
       // logged in, this links back to their account; otherwise the
       // booking is identified purely by the guest fields below.
       user: {type: String , ref: "User"},
       room: {type: String , ref: "Room", required:true},
       hotel: {type: String , ref: "Hotel", required:true},
       checkInDate: {type: Date , required:true},
       checkOutDate: {type: Date , required:true},
       totalPrice:{type:Number,required: true},
       guests:{type:Number,required: true},
       status: {
         type:String,
         enum: ["pending","confirmed","checked-in","checked-out","cancelled","no-show"],
         default:"pending",
       },
       paymentMethod:{
        type:String,
        default:"Pay At Hotel",
       },
       isPaid:{type:Boolean, default: false},

       // --- Guest details (collected on the public booking form, and also
       // used for walk-in bookings created by front-desk staff) ---
       guestName: {type: String},
       guestGender: {type: String, enum: ["male","female","other"]},
       guestPhone: {type: String},
       guestEmail: {type: String},

       // "ethiopian" or "foreign" - drives which ID fields are relevant and
       // which payment method the guest is offered.
       nationality: {type: String, enum: ["ethiopian","foreign"]},

       // National ID number (Ethiopian guests) or Passport number (foreign
       // guests) - same field, meaning depends on `nationality`.
       idNumber: {type: String},

       region: {type: String},              // Ethiopian guests, optional
       countryOfResidence: {type: String},   // foreign guests, required
       visaNumber: {type: String},           // foreign guests, optional
       specialRequests: {type: String},

       // --- Bank-transfer payment proof (Ethiopian guests) ---
       paymentProof: {type: String},                     // Cloudinary URL of the uploaded screenshot
       paymentVerifiedBy: {type: String, ref: "User"},    // which cashier/admin approved (or rejected) it
       paymentVerifiedAt: {type: Date},
       paymentRejected: {type: Boolean, default: false},  // cashier/admin rejected the submitted proof
       paymentRejectionReason: {type: String},            // shown to the guest so they know what to fix
       paymentConfirmationEmailSentAt: {type: Date},

       // Guest review after a completed stay. A review is only accepted by
       // the API once the booking has reached "checked-out".
       review: {
         rating: {type: Number, min: 1, max: 5},
         comment: {type: String, trim: true, maxlength: 600},
         reviewedAt: {type: Date},
         isVisible: {type: Boolean, default: true},
         moderatedAt: {type: Date},
         moderatedBy: {type: String, ref: "User"},
       },

       // which staff member (User._id) created this booking, if it was a
       // walk-in created from the admin dashboard rather than online
       createdBy: {type: String, ref: "User"},
},{timestamps: true});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;

import transporter from "../config/nodemailer.js";
import Booking from "../models/Booking.js"
import Room from "../models/Room.js";
import Hotel from "../models/Hotel.js";
import cloudinary from "../config/cloudinary.js";
import Stripe from "stripe";
import fs from "fs";
import { sendPaymentConfirmationEmail } from "../utils/paymentEmail.js";
import { escapeHtml } from "../utils/escapeHtml.js";

// How long an unpaid "pending" booking is allowed to sit before it's
// considered abandoned and auto-cancelled, freeing the room back up.
// Stripe sessions can expire quickly; bank transfers need a practical
// same-day window so guests can leave and return with proof.
const STRIPE_PENDING_EXPIRY_HOURS = 2;
const BANK_TRANSFER_PENDING_EXPIRY_HOURS = 24;

const formatMoneyFromEtb = (amount, hotel) => {
    const currency = hotel?.currency || "ETB";
    const value = Number(amount) || 0;
    const converted = currency === "USD" ? value / (Number(hotel?.usdExchangeRate) || 1) : value;
    return `${currency} ${converted.toLocaleString(undefined, {
        minimumFractionDigits: currency === "USD" ? 2 : 0,
        maximumFractionDigits: currency === "USD" ? 2 : 0,
    })}`;
}

// Function to check availablity of Room
const checkAvailablity = async ({checkInDate,checkOutDate,room}) => {
      try {
           // Opportunistically release rooms held by guests who started a
           // booking (bank transfer or Stripe) and never finished paying -
           // otherwise an abandoned checkout blocks the room forever.
           const stripeExpiryCutoff = new Date(Date.now() - STRIPE_PENDING_EXPIRY_HOURS * 60 * 60 * 1000);
           const bankTransferExpiryCutoff = new Date(Date.now() - BANK_TRANSFER_PENDING_EXPIRY_HOURS * 60 * 60 * 1000);
           await Booking.updateMany(
             {
               room,
               status: "pending",
               isPaid: false,
               $or: [
                 { paymentMethod: "Stripe", createdAt: { $lt: stripeExpiryCutoff } },
                 { paymentMethod: "Bank Transfer", paymentProof: { $exists: false }, createdAt: { $lt: bankTransferExpiryCutoff } },
               ],
             },
             { $set: { status: "cancelled" } }
           );

           const bookings = await Booking.find({
             room,
             // Cancelled/no-show bookings never happened as far as the
             // calendar is concerned - they shouldn't block anyone else.
             status: { $nin: ["cancelled", "no-show"] },
             checkInDate: {$lt: checkOutDate},
             checkOutDate: {$gt: checkInDate},
           });

         const isAvailable =  bookings.length === 0;
         return isAvailable;
      } catch (error) {
         console.error(error.message);
      }
}

// api to check availiblity of room
// POST /api/bookings/check-availblity
export const checkAvailablityAPI =  async(req,res) =>{
     try {
         const {room,checkInDate,checkOutDate,guests} = req.body;
          if(!room || !checkInDate || !checkOutDate){
            return res.json({success:false, message:"Room, check-in, and check-out dates are required"});
          }
          if(checkInDate >= checkOutDate){
            return res.json({success:false, message:"Check-out date must be after check-in date"});
          }
          const roomData = await Room.findById(room);
          if(!roomData){
            return res.json({success:false, message:"Room not found"});
          }
          if(guests && +guests > roomCapacity(roomData)){
            return res.json({success:true, isAvailable:false, message:`This room allows up to ${roomCapacity(roomData)} guest(s)`});
          }
          const isAvailable = await checkAvailablity({checkInDate,checkOutDate,room});
          res.json({success:true, isAvailable})
     } catch (error) {
         res.json({success:false, message:error.message})
     }
}

// Api to create a new booking from the public site - no login required.
// If the visitor happens to be logged in, `optionalAuth` will have set
// req.user and we link the booking to their account; otherwise it's a
// pure guest booking identified by the guest fields below.
// POST /api/bookings/guest-book
export const createGuestBooking = async (req,res) => {
    try {
        const {
            room, checkInDate, checkOutDate, guests,
            fullName, gender, phone, nationality,
            idNumber, region, countryOfResidence, visaNumber,
            email, specialRequests,
        } = req.body;

        if(!fullName || !gender || !phone || !nationality || !checkInDate || !checkOutDate || !guests){
            return res.json({success:false, message:"Please fill in all required fields"});
        }
        if(!["ethiopian","foreign"].includes(nationality)){
            return res.json({success:false, message:"Invalid nationality value"});
        }
        if(nationality === "foreign" && (!idNumber || !countryOfResidence)){
            return res.json({success:false, message:"Passport number and country of residence are required for foreign guests"});
        }
        if(checkInDate >= checkOutDate){
            return res.json({success:false, message:"Check-out date must be after check-in date"});
        }

        const isAvailable = await checkAvailablity({checkInDate, checkOutDate, room});
        if(!isAvailable){
            return res.json({success:false, message:"Room is not available for those dates"});
        }

        const roomData = await Room.findById(room).populate("hotel");
        const currentHotel = await Hotel.findOne({});
        if(!roomData){
            return res.json({success:false, message:"Room not found"});
        }
        if(!currentHotel){
            return res.json({success:false, message:"Hotel settings not found"});
        }
        if(+guests > roomCapacity(roomData)){
            return res.json({success:false, message:`This room allows up to ${roomCapacity(roomData)} guest(s)`});
        }

        let totalPrice = roomData.pricePerNight;
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
        if(!Number.isFinite(nights) || nights < 1){
            return res.json({success:false, message:"Booking must be for at least one night"});
        }
        totalPrice *= nights;

        const paymentMethod = nationality === "ethiopian" ? "Bank Transfer" : "Stripe";
        const bookingTotalDisplay = formatMoneyFromEtb(totalPrice, currentHotel);

        const booking = await Booking.create({
            user: req.user?._id,
            room,
            hotel: currentHotel._id,
            guests: +guests,
            checkInDate,
            checkOutDate,
            totalPrice,
            guestName: fullName,
            guestGender: gender,
            guestPhone: phone,
            guestEmail: email,
            nationality,
            idNumber,
            region,
            countryOfResidence,
            visaNumber,
            specialRequests,
            paymentMethod,
            status: "pending",
        });

        if(email){
            try {
                await transporter.sendMail({
                    from: process.env.SENDER_EMAIL,
                    to: email,
                    subject: 'Your Booking Request',
                    html: `
                        <h2>Booking Received</h2>
                        <p>Dear ${escapeHtml(fullName)},</p>
                        <p>We've received your booking request. Here are the details:</p>
                        <ul>
                            <li><strong>BOOKING ID:</strong> ${booking._id}</li>
                            <li><strong>HOTEL:</strong> ${escapeHtml(currentHotel.name)}</li>
                            <li><strong>ROOM:</strong> ${escapeHtml(roomData.roomType)}</li>
                            <li><strong>CHECK-IN:</strong> ${booking.checkInDate.toDateString()}</li>
                            <li><strong>CHECK-OUT:</strong> ${booking.checkOutDate.toDateString()}</li>
                            <li><strong>TOTAL:</strong> ${escapeHtml(bookingTotalDisplay)}</li>
                        </ul>
                        <p>${paymentMethod === "Bank Transfer"
                            ? "Please complete your bank transfer and upload proof of payment to confirm your booking."
                            : "Please complete payment to confirm your booking."}</p>
                    `
                });
            } catch (mailError) {
                console.log("Booking confirmation email failed:", mailError.message);
            }
        }

        res.json({success:true, message:"Booking created", booking});
    } catch (error) {
        console.log(error);
        res.json({success:false, message:"Failed to create booking"});
    }
}

// Guest uploads a screenshot/photo of their bank transfer as proof of
// payment. No login required, but the booking ID must match the guest phone.
// POST /api/bookings/:bookingId/payment-proof   (multipart/form-data, field "proof")
export const uploadPaymentProof = async (req,res) => {
    try {
        const {bookingId} = req.params;

        if(!req.file){
            return res.json({success:false, message:"Please attach a screenshot of the transfer"});
        }

        const booking = await Booking.findById(bookingId);
        if(!booking){
            return res.json({success:false, message:"Booking not found"});
        }
        if(!phonesMatch(booking.guestPhone, req.body.phone)){
            return res.json({success:false, message:"Phone number does not match this booking"});
        }
        if(booking.paymentMethod !== "Bank Transfer"){
            return res.json({success:false, message:"This booking does not use bank transfer payment"});
        }
        if(["cancelled","no-show","checked-out"].includes(booking.status)){
            return res.json({success:false, message:"This booking is no longer accepting payment proof"});
        }

        const result = await cloudinary.uploader.upload(req.file.path, {folder:"payment-proofs"});
        fs.unlink(req.file.path, () => {});

        booking.paymentProof = result.secure_url;
        // Resubmitting clears any previous rejection so it goes back into
        // the cashier's "awaiting review" queue instead of staying stuck
        // in "rejected".
        booking.paymentRejected = false;
        booking.paymentRejectionReason = undefined;
        await booking.save();
        await booking.populate("room hotel");

        res.json({success:true, message:"Payment proof submitted. We'll confirm your booking shortly.", booking});
    } catch (error) {
        res.json({success:false, message:error.message});
    }
}

// Cashier/admin: confirm a bank-transfer proof is legitimate and mark the
// booking as paid + confirmed.
// PATCH /api/bookings/:bookingId/verify-payment
export const verifyBankTransfer = async (req,res) => {
    try {
        const {bookingId} = req.params;
        const booking = await Booking.findById(bookingId);
        if(!booking){
            return res.json({success:false, message:"Booking not found"});
        }
        if(booking.isPaid){
            return res.json({success:false, message:"Booking is already paid"});
        }
        if(booking.paymentMethod !== "Bank Transfer"){
            return res.json({success:false, message:"This booking does not use bank transfer"});
        }
        if(!booking.paymentProof){
            return res.json({success:false, message:"No payment proof has been submitted for this booking yet"});
        }

        booking.isPaid = true;
        booking.status = "confirmed";
        booking.paymentVerifiedBy = req.user._id;
        booking.paymentVerifiedAt = new Date();
        booking.paymentRejected = false;
        booking.paymentRejectionReason = undefined;
        await booking.save();
        try {
            await sendPaymentConfirmationEmail(booking);
        } catch (mailError) {
            console.log("Payment confirmation email failed:", mailError.message);
        }

        res.json({success:true, message:"Payment verified, booking confirmed", booking});
    } catch (error) {
        res.json({success:false, message:error.message});
    }
}

// Cashier/admin: reject a submitted bank-transfer proof (wrong amount,
// unreadable screenshot, doesn't match bank records, etc). The guest can
// see the reason and re-upload a new screenshot, which clears this state.
// PATCH /api/bookings/:bookingId/reject-payment   body: { reason }
export const rejectBankTransfer = async (req,res) => {
    try {
        const {bookingId} = req.params;
        const {reason} = req.body;

        const booking = await Booking.findById(bookingId);
        if(!booking){
            return res.json({success:false, message:"Booking not found"});
        }
        if(!booking.paymentProof){
            return res.json({success:false, message:"No payment proof has been submitted for this booking yet"});
        }

        booking.paymentRejected = true;
        booking.paymentRejectionReason = reason || "The submitted payment proof could not be verified.";
        booking.paymentVerifiedBy = req.user._id;
        booking.paymentVerifiedAt = new Date();
        await booking.save();

        if(booking.guestEmail){
            try {
                await transporter.sendMail({
                    from: process.env.SENDER_EMAIL,
                    to: booking.guestEmail,
                    subject: 'Action needed: Your payment could not be verified',
                    html: `
                        <h2>We couldn't verify your payment</h2>
                        <p>Dear ${escapeHtml(booking.guestName || "Guest")},</p>
                        <p>We reviewed the payment screenshot you submitted for booking
                        <strong>${booking._id}</strong>, but we weren't able to verify it:</p>
                        <p style="color:#b91c1c"><strong>${escapeHtml(booking.paymentRejectionReason)}</strong></p>
                        <p>Please log back into your booking and upload a new screenshot of your bank transfer
                        so we can confirm your reservation.</p>
                    `
                });
            } catch (mailError) {
                console.log("Payment rejection email failed:", mailError.message);
            }
        }

        res.json({success:true, message:"Payment proof rejected", booking});
    } catch (error) {
        res.json({success:false, message:error.message});
    }
}









// Strip everything but digits so "+251 91 234 5678", "0912345678", and
// "251-91-234-5678" are all recognized as the same number.
const normalizePhone = (value = '') => String(value).replace(/\D/g, '');

const phonesMatch = (a, b) => {
    const normA = normalizePhone(a);
    const normB = normalizePhone(b);
    if(!normA || !normB || normA.length < 7 || normB.length < 7) return false;
    // Exact match, or one is the other with a country code / leading 0
    // prepended (e.g. "251912345678" vs "0912345678" vs "912345678").
    return normA === normB || normA.endsWith(normB) || normB.endsWith(normA);
};

const roomCapacity = (roomData) => Number(roomData?.maxGuests) || 2;

// Public lookup for a guest who booked without an account - identified by
// bookingId + phone number together (never bookingId alone, so a guessed ID
// can't leak someone else's booking).
// GET /api/bookings/lookup?bookingId=...&phone=...
export const lookupBooking = async (req,res) => {
    try {
        const {bookingId, phone} = req.query;
        if(!bookingId || !phone){
            return res.json({success:false, message:"Booking ID and phone number are required"});
        }

        const booking = await Booking.findById(bookingId).populate("room hotel");
        if(!booking || !phonesMatch(booking.guestPhone, phone)){
            return res.json({success:false, message:"No matching booking found. Check your Booking ID and phone number."});
        }

        res.json({success:true, booking});
    } catch (error) {
        res.json({success:false, message:"No matching booking found. Check your Booking ID and phone number."});
    }
}

// Public reviews shown on the homepage. Only checked-out bookings can
// contribute reviews, so every review is tied to a completed stay.
// GET /api/bookings/reviews
export const getPublicReviews = async (req,res) => {
    try {
        const bookings = await Booking.find({
            status: "checked-out",
            "review.rating": {$exists: true},
            "review.comment": {$exists: true, $ne: ""},
            "review.isVisible": {$ne: false},
        })
        .populate("room hotel")
        .sort({"review.reviewedAt": -1})
        .limit(6);

        const reviews = bookings.map((booking) => ({
            _id: booking._id,
            guestName: booking.guestName || "Guest",
            roomType: booking.room?.roomType || "Room",
            hotelName: booking.hotel?.name || "Hotel",
            rating: booking.review.rating,
            comment: booking.review.comment,
            reviewedAt: booking.review.reviewedAt,
            isVisible: booking.review.isVisible !== false,
        }));

        res.json({success:true, reviews});
    } catch (error) {
        res.json({success:false, message:"Failed to fetch reviews"});
    }
}

// Guest review submission. Uses the same bookingId + phone ownership check
// as lookupBooking, and only allows reviews after checkout.
// POST /api/bookings/:bookingId/review   body: { phone, rating, comment }
export const submitBookingReview = async (req,res) => {
    try {
        const {bookingId} = req.params;
        const {phone, rating, comment} = req.body;
        const numericRating = Number(rating);

        if(!phone || !numericRating || !comment?.trim()){
            return res.json({success:false, message:"Phone, rating, and review are required"});
        }
        if(numericRating < 1 || numericRating > 5){
            return res.json({success:false, message:"Rating must be between 1 and 5"});
        }

        const booking = await Booking.findById(bookingId).populate("room hotel");
        if(!booking || !phonesMatch(booking.guestPhone, phone)){
            return res.json({success:false, message:"No matching checked-out booking found"});
        }
        if(booking.status !== "checked-out"){
            return res.json({success:false, message:"Reviews can be submitted after checkout"});
        }

        booking.review = {
            rating: numericRating,
            comment: comment.trim().slice(0, 600),
            reviewedAt: new Date(),
            isVisible: true,
        };
        await booking.save();
        await booking.populate("room hotel");

        res.json({success:true, message:"Thanks for your review", booking});
    } catch (error) {
        res.json({success:false, message:"Failed to submit review"});
    }
}

// Staff/admin review moderation list. Includes hidden reviews so staff can
// restore one if it was hidden by mistake.
// GET /api/bookings/admin/reviews
export const getReviewModerationList = async (req,res) => {
    try {
        const bookings = await Booking.find({
            "review.rating": {$exists: true},
            "review.comment": {$exists: true, $ne: ""},
        })
        .populate("room hotel")
        .sort({"review.reviewedAt": -1});

        const reviews = bookings.map((booking) => ({
            _id: booking._id,
            guestName: booking.guestName || "Guest",
            guestPhone: booking.guestPhone,
            roomType: booking.room?.roomType || "Room",
            hotelName: booking.hotel?.name || "Hotel",
            rating: booking.review.rating,
            comment: booking.review.comment,
            reviewedAt: booking.review.reviewedAt,
            isVisible: booking.review.isVisible !== false,
            moderatedAt: booking.review.moderatedAt,
        }));

        res.json({success:true, reviews});
    } catch (error) {
        res.json({success:false, message:"Failed to fetch reviews"});
    }
}

// Staff/admin: hide or restore a guest review from public pages.
// PATCH /api/bookings/:bookingId/review-visibility   body: { isVisible }
export const updateReviewVisibility = async (req,res) => {
    try {
        const {bookingId} = req.params;
        const {isVisible} = req.body;

        if(typeof isVisible !== "boolean"){
            return res.json({success:false, message:"Review visibility must be true or false"});
        }

        const booking = await Booking.findById(bookingId).populate("room hotel");
        if(!booking || !booking.review?.rating){
            return res.json({success:false, message:"Review not found"});
        }

        booking.review.isVisible = isVisible;
        booking.review.moderatedAt = new Date();
        booking.review.moderatedBy = req.user._id;
        await booking.save();

        res.json({success:true, message: booking.review.isVisible ? "Review restored" : "Review hidden", booking});
    } catch (error) {
        res.json({success:false, message:"Failed to update review visibility"});
    }
}





// Api to get all bookings  for aa user 
// GET /api/bookings/user
 export const getUserBookings = async(req,res)=>{
    try {
        const user = req.user._id;
        const bookings = await Booking.find({user}).populate("room hotel").sort({createdAt: -1})
         res.json({success:true, bookings})
    } catch (error) {
         res.json({success:false, message:"Failed to fetch bookings"})
    }
 }


 // Admin dashboard: all bookings for the (single) hotel, no owner filter needed
 // Restricted to admin/receptionist/cashier via isStaff middleware in bookingRoutes.js
 export const getAllBookings = async (req,res) => {
    try {
   const bookings= await Booking.find({}).populate("room hotel user").sort({createdAt: -1});

   // Total Bookings
   const totalBookings = bookings.length;

   // Revenue - split into what's actually been collected vs what's still
   // outstanding, and exclude cancelled/no-show bookings from both (money
   // that was never, and will never be, collected on those).
   const revenueEligible = bookings.filter(b => !["cancelled","no-show"].includes(b.status));
   const totalRevenue = revenueEligible
        .filter(b => b.isPaid)
        .reduce((acc,booking) => acc + booking.totalPrice, 0);
   const pendingRevenue = revenueEligible
        .filter(b => !b.isPaid)
        .reduce((acc,booking) => acc + booking.totalPrice, 0);

   res.json({success: true, dashboardData: {totalBookings,totalRevenue,pendingRevenue, bookings}})
   } catch(error){
        res.json({success:false, message:"Failed to fetch bookings"})
   }
 }

const VALID_STATUSES = ["pending","confirmed","checked-in","checked-out","cancelled","no-show"];
const VALID_STATUS_TRANSITIONS = {
    pending: ["cancelled"],
    confirmed: ["checked-in", "cancelled", "no-show"],
    "checked-in": ["checked-out"],
    "checked-out": [],
    cancelled: [],
    "no-show": [],
};

// Staff (admin or receptionist): update a booking's status.
// PATCH /api/bookings/:bookingId/status   body: { status }
export const updateBookingStatus = async (req,res) => {
    try {
        const {bookingId} = req.params;
        const {status} = req.body;

        if(!VALID_STATUSES.includes(status)){
            return res.json({success:false, message:"Invalid status value"});
        }

        const booking = await Booking.findById(bookingId);
        if(!booking){
            return res.json({success:false, message:"Booking not found"});
        }
        if(status === booking.status){
            return res.json({success:true, message:`Booking is already ${status}`, booking});
        }
        if(!VALID_STATUS_TRANSITIONS[booking.status]?.includes(status)){
            return res.json({success:false, message:`Cannot move booking from ${booking.status} to ${status}`});
        }
        if(status === "checked-in" && !booking.isPaid){
            return res.json({success:false, message:"Payment must be verified before check-in"});
        }
        if(status === "checked-out" && !booking.isPaid){
            return res.json({success:false, message:"Payment must be settled before checkout"});
        }

        booking.status = status;
        await booking.save();

        res.json({success:true, message:`Booking marked as ${status}`, booking});
    } catch (error) {
        res.json({success:false, message: error.message});
    }
}

// Staff (admin or receptionist): create a walk-in booking for a guest who
// doesn't have (or doesn't want to create) an online account.
// POST /api/bookings/walk-in
export const createWalkInBooking = async (req,res) => {
    try {
        const {room,checkInDate,checkOutDate,guests,guestName,guestPhone,idNumber,paymentMethod,paymentCollectedNow} = req.body;
        const allowedMethods = ["Cash", "Bank Transfer", "Card", "Pay At Hotel"];
        const selectedPaymentMethod = allowedMethods.includes(paymentMethod) ? paymentMethod : "Cash";
        const isPayLater = selectedPaymentMethod === "Pay At Hotel";
        const isPaidNow = Boolean(paymentCollectedNow) && !isPayLater;

        if(!guestName || !guestPhone){
            return res.json({success:false, message:"Guest name and phone are required for a walk-in booking"});
        }

        if(checkInDate >= checkOutDate){
            return res.json({success:false, message:"Check-out date must be after check-in date"});
        }

        const isAvailable = await checkAvailablity({checkInDate,checkOutDate,room});
        if(!isAvailable){
            return res.json({success:false, message:"Room is not available for those dates"});
        }

        const roomData = await Room.findById(room).populate("hotel");
        const currentHotel = await Hotel.findOne({});
        if(!roomData){
            return res.json({success:false, message:"Room not found"});
        }
        if(!currentHotel){
            return res.json({success:false, message:"Hotel settings not found"});
        }
        if(+guests > roomCapacity(roomData)){
            return res.json({success:false, message:`This room allows up to ${roomCapacity(roomData)} guest(s)`});
        }

        let totalPrice = roomData.pricePerNight;
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
        if(!Number.isFinite(nights) || nights < 1){
            return res.json({success:false, message:"Booking must be for at least one night"});
        }
        totalPrice *= nights;

        const booking = await Booking.create({
            room,
            hotel: currentHotel._id,
            guests: +guests,
            checkInDate,
            checkOutDate,
            totalPrice,
            guestName,
            guestPhone,
            idNumber,
            // Normal walk-ins go to cashier before check-in. "Pay At Hotel"
            // means the hotel has approved an in-house balance, so the guest
            // is checked in immediately and cashier settles it later. If
            // payment was collected at creation, the guest is checked in too.
            status: (isPayLater || isPaidNow) ? "checked-in" : "pending",
            paymentMethod: selectedPaymentMethod,
            isPaid: isPaidNow,
            paymentVerifiedBy: isPaidNow ? req.user._id : undefined,
            paymentVerifiedAt: isPaidNow ? new Date() : undefined,
            createdBy: req.user._id,
        });

        res.json({
            success:true,
            message: isPaidNow
                ? "Paid walk-in booking created and checked in"
                : isPayLater
                    ? "Pay-later walk-in created and checked in with balance due"
                    : "Walk-in booking created. Send guest to cashier for payment.",
            booking
        });
    } catch (error) {
        res.json({success:false, message: error.message});
    }
}

// Payment staff: mark a booking paid manually - e.g. cash received or a
// non-bank-transfer payment reconciled outside the automated flow.
// PATCH /api/bookings/:bookingId/mark-paid   body: { paymentMethod? }
export const markBookingPaid = async (req,res) => {
    try {
        const {bookingId} = req.params;
        const {paymentMethod} = req.body;
        const allowedManualMethods = ["Cash", "Bank Transfer", "Card"];

        const booking = await Booking.findById(bookingId);
        if(!booking){
            return res.json({success:false, message:"Booking not found"});
        }
        if(booking.isPaid){
            return res.json({success:false, message:"Booking is already paid"});
        }
        if(["cancelled","no-show","checked-out"].includes(booking.status)){
            return res.json({success:false, message:"This booking can no longer be marked paid"});
        }
        if(paymentMethod && !allowedManualMethods.includes(paymentMethod)){
            return res.json({success:false, message:"Invalid payment method"});
        }

        booking.isPaid = true;
        booking.paymentVerifiedBy = req.user._id;
        booking.paymentVerifiedAt = new Date();
        if(booking.status === "pending"){
            booking.status = "confirmed";
        }
        // Only overwrite paymentMethod if the booking didn't already have a
        // specific one recorded (e.g. don't clobber "Bank Transfer"/"Stripe").
        if(paymentMethod || !booking.paymentMethod || booking.paymentMethod === "Pay At Hotel"){
            booking.paymentMethod = paymentMethod || "Cash";
        }
        await booking.save();
        try {
            await sendPaymentConfirmationEmail(booking);
        } catch (mailError) {
            console.log("Manual payment confirmation email failed:", mailError.message);
        }

        res.json({success:true, message:"Booking marked as paid", booking});
    } catch (error) {
        res.json({success:false, message: error.message});
    }
}

// Public Stripe return sync. The webhook is still the source of truth in
// production, but this fixes local/dev and slow-webhook cases where the
// guest returns to My Bookings before Stripe's webhook has updated MongoDB.
// POST /api/bookings/stripe-sync   body: { bookingId, phone, sessionId }
export const syncStripePayment = async (req,res) => {
    try {
        const {bookingId, phone, sessionId} = req.body;
        if(!bookingId || !phone || !sessionId){
            return res.json({success:false, message:"Booking ID, phone, and Stripe session are required"});
        }

        const booking = await Booking.findById(bookingId);
        if(!booking || !phonesMatch(booking.guestPhone, phone)){
            return res.json({success:false, message:"No matching booking found"});
        }
        if(booking.isPaid){
            await booking.populate("room hotel");
            return res.json({success:true, message:"Booking already paid", booking});
        }
        if(booking.paymentMethod !== "Stripe"){
            return res.json({success:false, message:"This booking does not use Stripe payment"});
        }

        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripeInstance.checkout.sessions.retrieve(sessionId);

        if(session.metadata?.bookingId !== bookingId){
            return res.json({success:false, message:"Stripe session does not match this booking"});
        }
        if(session.payment_status !== "paid"){
            return res.json({success:false, message:"Stripe payment is not completed yet"});
        }

        booking.isPaid = true;
        booking.status = "confirmed";
        booking.paymentMethod = "Stripe";
        await booking.save();
        try {
            await sendPaymentConfirmationEmail(booking);
        } catch (mailError) {
            console.log("Stripe payment confirmation email failed:", mailError.message);
        }
        await booking.populate("room hotel");

        res.json({success:true, message:"Stripe payment confirmed", booking});
    } catch (error) {
        res.json({success:false, message:"Could not confirm Stripe payment yet"});
    }
}


 export const stripePayment = async (req,res) => {
         try {
              const {bookingId} = req.body;
               const booking = await Booking.findById(bookingId);
               if(!booking){
                   return res.json({success:false, message:"Booking not found"});
               }
               if(booking.isPaid){
                   return res.json({success:false, message:"Booking is already paid"});
               }
               if(["cancelled","no-show","checked-out"].includes(booking.status)){
                   return res.json({success:false, message:"This booking is no longer payable"});
               }
               if(booking.paymentMethod !== "Stripe"){
                   return res.json({success:false, message:"This booking does not use Stripe payment"});
               }
               const roomData = await Room.findById(booking.room).populate('hotel');
               const currentHotel = await Hotel.findOne({});
               if(!currentHotel){
                   return res.json({success:false, message:"Hotel settings not found"});
               }
               const totalPrice = booking.totalPrice; // stored as ETB base amount

               // Stripe checkout charges in USD, but room prices are stored
               // as ETB base amounts - convert using the admin-set
               // exchange rate (Hotel.usdExchangeRate, e.g. "140 ETB = $1").
               // Without this, a guest would be charged the raw ETB number
               // as if it were dollars (e.g. 9000 ETB -> $9000 instead of ~$65).
               const exchangeRate = Number(currentHotel.usdExchangeRate) || 1;
               const totalPriceUSD = totalPrice / exchangeRate;

               // Stripe requires a whole number of cents.
               const unitAmountCents = Math.round(totalPriceUSD * 100);
               if(!Number.isFinite(unitAmountCents) || unitAmountCents < 50){
                   return res.json({success:false, message:"Payment amount is too low. Please check the room price and exchange rate."});
               }

               const {origin} =req.headers;

             const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

             const line_items = [
                {
                      price_data: {
                         currency: "usd", 
                         product_data: {
                             name: currentHotel.name,

                         },
                         unit_amount: unitAmountCents
                      },
                      quantity: 1,
                }
            ]

            //create checkout session
        const session = await stripeInstance.checkout.sessions.create({
    line_items,
    mode: "payment",

    success_url: `${origin}/loader/my-bookings?bookingId=${bookingId}&phone=${encodeURIComponent(booking.guestPhone || '')}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/my-bookings`,

    metadata: {
        bookingId,
    },

    payment_intent_data: {
        metadata: {
            bookingId,
        }
    }
});


     res.json({success: true, url: session.url })
         } catch (error) {
             res.json({success: false, message: "Payment Failed!" })
         }
 }

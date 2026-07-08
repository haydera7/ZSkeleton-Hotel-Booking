import express from "express";
import {
  checkAvailablityAPI, createGuestBooking, createWalkInBooking,
  getAllBookings, getPublicReviews, getReviewModerationList, getUserBookings, lookupBooking, markBookingPaid, rejectBankTransfer, stripePayment,
  submitBookingReview, syncStripePayment, updateBookingStatus, updateReviewVisibility, uploadPaymentProof, verifyBankTransfer,
} from "../controllers/bookingController.js";
import { protect, optionalAuth, isAdmin, isStaff, isBookingStaff, isPaymentStaff } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const bookingRouter = express.Router();

bookingRouter.post('/check-availability', checkAvailablityAPI);

// Public, no-login guest booking flow (links to an account automatically
// if the visitor happens to be logged in).
bookingRouter.post('/guest-book', optionalAuth, createGuestBooking);
bookingRouter.post('/:bookingId/payment-proof', upload.single('proof'), uploadPaymentProof);
bookingRouter.get('/lookup', lookupBooking);
bookingRouter.get('/reviews', getPublicReviews);
bookingRouter.post('/:bookingId/review', submitBookingReview);

bookingRouter.get('/user', protect, getUserBookings);
// Any staff role can view the bookings list (Payments.jsx also reads from
// this same endpoint for cashiers), but only front-desk staff can actually
// create/manage bookings - a cashier's job is verifying payments, not
// checking guests in/out or recording walk-ins.
bookingRouter.get('/admin', protect, isStaff, getAllBookings);
bookingRouter.get('/admin/reviews', protect, isStaff, getReviewModerationList);
bookingRouter.post('/walk-in', protect, isBookingStaff, createWalkInBooking);
bookingRouter.patch('/:bookingId/status', protect, isBookingStaff, updateBookingStatus);
bookingRouter.patch('/:bookingId/review-visibility', protect, isStaff, updateReviewVisibility);
bookingRouter.patch('/:bookingId/verify-payment', protect, isPaymentStaff, verifyBankTransfer);
bookingRouter.patch('/:bookingId/reject-payment', protect, isPaymentStaff, rejectBankTransfer);
// Manual payment marking is payment-staff work. Receptionists manage stays;
// cashiers/admins verify money.
bookingRouter.patch('/:bookingId/mark-paid', protect, isPaymentStaff, markBookingPaid);

bookingRouter.post('/stripe-payment', stripePayment);
bookingRouter.post('/stripe-sync', syncStripePayment);

export default bookingRouter;

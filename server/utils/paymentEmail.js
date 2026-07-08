import transporter from "../config/nodemailer.js";
import { escapeHtml } from "./escapeHtml.js";
import Hotel from "../models/Hotel.js";

const formatDate = (date) => date ? new Date(date).toDateString() : "-";

const formatMoneyFromEtb = (amount, hotel) => {
    const currency = hotel?.currency || "ETB";
    const value = Number(amount) || 0;
    const converted = currency === "USD" ? value / (Number(hotel?.usdExchangeRate) || 1) : value;
    return `${currency} ${converted.toLocaleString(undefined, {
        minimumFractionDigits: currency === "USD" ? 2 : 0,
        maximumFractionDigits: currency === "USD" ? 2 : 0,
    })}`;
}

export const sendPaymentConfirmationEmail = async (booking) => {
    if(!booking?.guestEmail || booking.paymentConfirmationEmailSentAt){
        return;
    }

    await booking.populate("room hotel");

    const hotel = await Hotel.findOne({}) || booking.hotel;
    const room = booking.room;
    const totalPaidDisplay = formatMoneyFromEtb(booking.totalPrice, hotel);
    const contactLine = hotel?.contact
        ? `<p>If you need help, contact us at ${escapeHtml(hotel.contact)}.</p>`
        : "";

    await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: booking.guestEmail,
        subject: "Your Booking Is Confirmed",
        html: `
            <h2>Booking Confirmed</h2>
            <p>Dear ${escapeHtml(booking.guestName || "Guest")},</p>
            <p>Your payment has been received and your booking is now confirmed.</p>
            <ul>
                <li><strong>BOOKING ID:</strong> ${booking._id}</li>
                <li><strong>HOTEL:</strong> ${escapeHtml(hotel?.name || "Hotel")}</li>
                <li><strong>ROOM:</strong> ${escapeHtml(room?.roomType || "Room")}</li>
                <li><strong>CHECK-IN:</strong> ${formatDate(booking.checkInDate)}</li>
                <li><strong>CHECK-OUT:</strong> ${formatDate(booking.checkOutDate)}</li>
                <li><strong>GUESTS:</strong> ${booking.guests}</li>
                <li><strong>TOTAL PAID:</strong> ${escapeHtml(totalPaidDisplay)}</li>
                <li><strong>PAYMENT METHOD:</strong> ${escapeHtml(booking.paymentMethod)}</li>
            </ul>
            <p>Please keep this email and your Booking ID for check-in.</p>
            ${contactLine}
        `
    });

    booking.paymentConfirmationEmailSentAt = new Date();
    await booking.save();
}

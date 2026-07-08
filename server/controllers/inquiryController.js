import transporter from "../config/nodemailer.js";
import Hotel from "../models/Hotel.js";
import { escapeHtml } from "../utils/escapeHtml.js";

// Public endpoint used by room/contact inquiry forms. No login required -
// it just emails the hotel inbox with whatever the guest submitted.
// POST /api/inquiries
export const submitInquiry = async (req, res) => {
    try {
        const { type, name, phone, email, message, eventType, eventDate, guests } = req.body;

        if (!name || !phone || !message) {
            return res.json({ success: false, message: "Please fill in all required fields" });
        }

        const subjectByType = {
            "room-service": "Room Service Request",
            "event": "Event & Banquet Inquiry",
            "general": "Contact Form Message",
        };
        const subject = subjectByType[type] || "New Inquiry";
        const hotel = await Hotel.findOne();
        const hotelName = hotel?.name || "Hotel";

        // This form is fully public and unauthenticated, so every field
        // must be escaped before it goes into the HTML email body.
        const extraRows = [];
        if (eventType) extraRows.push(`<li><strong>Event Type:</strong> ${escapeHtml(eventType)}</li>`);
        if (eventDate) extraRows.push(`<li><strong>Preferred Date:</strong> ${escapeHtml(eventDate)}</li>`);
        if (guests) extraRows.push(`<li><strong>Guests:</strong> ${escapeHtml(guests)}</li>`);

        await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: process.env.SENDER_EMAIL,
            replyTo: email || undefined,
            subject: `[${hotelName}] ${subject}`,
            html: `
                <h2>${subject}</h2>
                <ul>
                    <li><strong>Name:</strong> ${escapeHtml(name)}</li>
                    <li><strong>Phone:</strong> ${escapeHtml(phone)}</li>
                    ${email ? `<li><strong>Email:</strong> ${escapeHtml(email)}</li>` : ""}
                    ${extraRows.join("\n")}
                </ul>
                <p><strong>Message:</strong></p>
                <p>${escapeHtml(message)}</p>
            `,
        });

        res.json({ success: true, message: "Thanks! We'll be in touch shortly." });
    } catch (error) {
        res.json({ success: false, message: "Failed to send your request. Please try again." });
    }
};
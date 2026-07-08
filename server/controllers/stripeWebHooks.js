import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { sendPaymentConfirmationEmail } from "../utils/paymentEmail.js";

export const stripeWebhooks = async (req,res) => {

    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if(event.type === "checkout.session.completed"){

        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;
        if(!bookingId){
            return res.status(400).json({ received: false, message: "Missing bookingId metadata" });
        }

        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            {
                isPaid: true,
                paymentMethod: "Stripe",
                status: "confirmed"
            },
            {new: true}
        );

        if(booking){
            try {
                await sendPaymentConfirmationEmail(booking);
            } catch (mailError) {
                console.log("Stripe payment confirmation email failed:", mailError.message);
            }
        }

        console.log("Stripe payment success - booking updated");

    } else {
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true});
}

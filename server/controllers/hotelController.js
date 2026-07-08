import Hotel from "../models/Hotel.js";
import { refreshExchangeRateIfStale, fetchLiveUsdExchangeRate } from "../utils/exchangeRate.js";

// GET /api/hotel - public, used by the homepage/about page to show
// hotel name, address, description, amenities, photos, etc.
export const getHotelSettings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({});
    if (!hotel) {
      return res.json({ success: false, message: "Hotel settings not found. Run server/seed/seedHotel.js" });
    }

    // Respond immediately with whatever rate we have - this is a public,
    // frequently-hit route, so it should never wait on a third-party API.
    // If the rate happens to be stale, refresh it in the background so the
    // *next* request benefits, rather than slowing down this one.
    refreshExchangeRateIfStale(hotel).catch(() => {});

    res.json({ success: true, hotel });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// PUT /api/hotel - admin only, used by the admin dashboard to edit
// hotel name, address, description, amenities, photos, policies.
export const updateHotelSettings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({});
    if (!hotel) {
      return res.json({ success: false, message: "Hotel settings not found. Run server/seed/seedHotel.js" });
    }

    const allowedFields = [
      "name", "address", "city", "contact", "email",
      "description", "amenities", "photos", "policies", "bankDetails", "currency", "usdExchangeRate"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        hotel[field] = req.body[field];
      }
    });

    // An admin manually typing in a rate counts as a fresh, deliberate
    // value - reset the staleness clock so auto-refresh doesn't immediately
    // overwrite it, and record that it came from a person, not the API.
    if (req.body.usdExchangeRate !== undefined) {
      hotel.usdExchangeRateUpdatedAt = new Date();
      hotel.usdExchangeRateSource = "manual";
    }

    await hotel.save();
    res.json({ success: true, message: "Hotel settings updated", hotel });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/hotel/refresh-exchange-rate - admin only. Manually triggers an
// immediate exchange-rate refresh (rather than waiting for the lazy
// background refresh on the next page load) and returns the result so the
// Settings page can show it right away.
export const refreshExchangeRateNow = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({});
    if (!hotel) {
      return res.json({ success: false, message: "Hotel settings not found. Run server/seed/seedHotel.js" });
    }
    const liveRate = await fetchLiveUsdExchangeRate("ETB");
    if (!liveRate) {
      return res.json({ success: false, message: "Could not reach the exchange rate service. Please try again shortly." });
    }

    hotel.usdExchangeRate = liveRate;
    hotel.usdExchangeRateUpdatedAt = new Date();
    hotel.usdExchangeRateSource = "auto";
    await hotel.save();

    res.json({ success: true, message: "Exchange rate refreshed", hotel });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

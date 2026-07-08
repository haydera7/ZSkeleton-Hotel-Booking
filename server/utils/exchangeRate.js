// Fetches a live ETB/USD (or any currency/USD) exchange rate from a free,
// no-API-key-required endpoint, so Hotel.usdExchangeRate doesn't have to be
// kept up to date by hand. This is a best-effort convenience refresh, not a
// financial-grade rate feed - for anything beyond "roughly right", a paid
// rate provider would be more reliable.
const RATE_API_URL = "https://open.er-api.com/v6/latest/USD";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // refresh at most once a day

export const isRateStale = (hotel) => {
    if(!hotel?.usdExchangeRateUpdatedAt) return true;
    return Date.now() - new Date(hotel.usdExchangeRateUpdatedAt).getTime() > STALE_AFTER_MS;
}

// Returns the number of `currencyCode` units per 1 USD, or null if the
// currency isn't in the response or the request fails for any reason.
export const fetchLiveUsdExchangeRate = async (currencyCode) => {
    if(!currencyCode) return null;

    try {
        const response = await fetch(RATE_API_URL);
        if(!response.ok) return null;

        const data = await response.json();
        const rate = data?.rates?.[currencyCode];
        return typeof rate === "number" && rate > 0 ? rate : null;
    } catch (error) {
        console.log("Exchange rate refresh failed:", error.message);
        return null;
    }
}

// Refreshes hotel.usdExchangeRate in place (and saves it) if the current
// value is stale. Safe to call often - it no-ops when the rate is fresh,
// and silently gives up (keeping the last known value) if the API call
// fails, rather than ever blocking or breaking a page load.
export const refreshExchangeRateIfStale = async (hotel) => {
    if(!hotel || !isRateStale(hotel)){
        return hotel;
    }

    const liveRate = await fetchLiveUsdExchangeRate("ETB");
    if(liveRate){
        hotel.usdExchangeRate = liveRate;
        hotel.usdExchangeRateUpdatedAt = new Date();
        hotel.usdExchangeRateSource = "auto";
        await hotel.save();
    }
    return hotel;
}

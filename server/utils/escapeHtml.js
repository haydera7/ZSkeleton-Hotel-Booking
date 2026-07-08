// Minimal HTML escaping for values that get interpolated into email
// templates. Guest-submitted text (names, messages, rejection reasons,
// etc.) must always go through this before being dropped into an
// HTML string - otherwise a guest could submit something like
// "<img src=x onerror=...>" as their name and have it rendered in an
// email your staff opens.
export const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
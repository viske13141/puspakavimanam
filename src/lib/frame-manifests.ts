/**
 * Frame manifests — paths are relative to /public, served at root by Vite.
 * Frames are sorted numerically (0001 → 0050).
 */

const FLIGHT_BASE = "/flights/flight/Passengers_boarding_private_jet_-_20261012194758-frame-";
const YACHT_BASE = "/yarchts/yarchts/Viman_Yachts_superyacht_navigati-_20261012195923-frame-";

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

// Times match the actual filenames: 0001-0.00s, 0002-0.20s … 0050-9.80s
function flightTime(n: number) {
  return ((n - 1) * 0.2).toFixed(2) + "s";
}

export const FLIGHT_FRAMES: string[] = Array.from({ length: 50 }, (_, i) => {
  const n = i + 1;
  return `${FLIGHT_BASE}${pad4(n)}-${flightTime(n)}.jpg`;
});

export const YACHT_FRAMES: string[] = Array.from({ length: 50 }, (_, i) => {
  const n = i + 1;
  return `${YACHT_BASE}${pad4(n)}-${flightTime(n)}.jpg`;
});

export const FLIGHT_POSTER = FLIGHT_FRAMES[0];
export const YACHT_POSTER = YACHT_FRAMES[0];

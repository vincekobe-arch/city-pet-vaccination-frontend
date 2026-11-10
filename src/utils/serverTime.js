// Makes new Date() and Date.now() follow the server clock instead of the device clock.
const SERVER_TIME_URL = 'https://api.petunity-muntinlupacity.com/server-time';

const RealDate = Date;
let offset = 0; // milliseconds: server time minus device time

// Warn if the device clock differs from server time by more than this
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const clockListeners = new Set();

export const isDeviceClockWrong = () => Math.abs(offset) > CLOCK_TOLERANCE_MS;

export function onClockChange(fn) {
  clockListeners.add(fn);
  return () => clockListeners.delete(fn);
}

function SyncedDate(...args) {
  // Date() called without "new" returns a string
  if (!(this instanceof SyncedDate)) {
    return new RealDate(RealDate.now() + offset).toString();
  }
  return args.length === 0
    ? new RealDate(RealDate.now() + offset)
    : new RealDate(...args);
}
SyncedDate.prototype = RealDate.prototype;
SyncedDate.now = () => RealDate.now() + offset;
SyncedDate.parse = RealDate.parse;
SyncedDate.UTC = RealDate.UTC;

window.Date = SyncedDate;
globalThis.Date = SyncedDate;

export async function syncServerTime() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const start = RealDate.now();
    const res = await fetch(SERVER_TIME_URL, { cache: 'no-store', signal: controller.signal });
    const end = RealDate.now();
    const data = await res.json();
    if (data && data.timestamp) {
      // Adjust for network delay
      offset = data.timestamp + (end - start) / 2 - end;
      clockListeners.forEach(fn => fn(offset));
    }
  } catch (e) {
    // If the server can't be reached, keep the last known offset
  } finally {
    clearTimeout(timer);
  }
}

// Re-sync periodically and whenever the user returns to the tab
// (catches the user changing the device clock while the app is open)
export function startServerTimeSync() {
  const interval = setInterval(syncServerTime, 5 * 60 * 1000);
  const onVisible = () => {
    if (document.visibilityState === 'visible') syncServerTime();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

// Today's date in Philippine time, formatted YYYY-MM-DD
export const todayPH = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
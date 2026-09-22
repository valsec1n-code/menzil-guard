/**
 * key -> [timestamp, timestamp, ...]
 * Belirli bir zaman penceresinde kaç kez tetiklendiğini sayar.
 */
class RateTracker {
  constructor() {
    this.store = new Map();
  }

  hit(key, windowMs) {
    const now = Date.now();
    const arr = (this.store.get(key) || []).filter(t => now - t < windowMs);
    arr.push(now);
    this.store.set(key, arr);
    return arr.length;
  }

  reset(key) {
    this.store.delete(key);
  }
}

module.exports = RateTracker;

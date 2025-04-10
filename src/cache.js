import { ErrorTypes } from "./constants.js";

// Configuration Constants (consider moving to constants.js if used elsewhere)
const CACHE_PREFIX = "ffep_cache_";
const MAX_CACHE_ITEMS = 50;
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export class CacheManager {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    // Initial cleanup on instantiation
    this.cleanupCache();
    // console.log("CacheManager Initialized");
  }

  getCacheKeys() {
    try {
      return Object.keys(sessionStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .map((key) => ({ key, timestamp: this.getItemTimestamp(key) })) // Get timestamp along with key
        .sort((a, b) => a.timestamp - b.timestamp) // Sort by timestamp ascending (oldest first)
        .map((item) => item.key); // Return just the keys in sorted order
    } catch (error) {
      console.warn("Error retrieving cache keys:", error);
      this.errors++;
      // Attempt to notify Bugsnag if available
      if (typeof Bugsnag !== "undefined") {
        const cacheError = new Error("Failed to retrieve cache keys");
        cacheError.name = ErrorTypes.CACHE;
        cacheError.originalError = error;
        Bugsnag.notify(cacheError);
      }
      return []; // Return empty array on error
    }
  }

  getItemTimestamp(key) {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return 0; // Or handle as error?
      const parsed = JSON.parse(item);
      return parsed?.timestamp || 0;
    } catch (error) {
      console.warn(`Error parsing timestamp for cache key ${key}:`, error);
      // Treat as old if parsing fails
      return 0;
    }
  }

  cleanupCache() {
    try {
      const cacheKeys = this.getCacheKeys();
      // console.log(`Running cache cleanup. Current items: ${cacheKeys.length}`);
      if (cacheKeys.length > MAX_CACHE_ITEMS) {
        const keysToRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ITEMS);
        // console.log(`Cache limit (${MAX_CACHE_ITEMS}) exceeded. Removing ${keysToRemove.length} oldest items.`);
        keysToRemove.forEach((key) => {
          try {
            sessionStorage.removeItem(key);
          } catch (removeError) {
            console.warn(`Failed to remove cache item ${key}:`, removeError);
            this.errors++;
            // Potentially notify Bugsnag about specific removal error
          }
        });
        // console.log(`Cache Cleanup Complete. Items remaining: ${this.getCacheKeys().length}`);
      }
    } catch (error) {
      // console.warn("Cache cleanup failed:", error);
      this.errors++;
      // Notify Bugsnag about cleanup failure
      if (typeof Bugsnag !== "undefined") {
        const cacheError = new Error("Cache cleanup process failed");
        cacheError.name = ErrorTypes.CACHE;
        cacheError.originalError = error;
        cacheError.metadata = { cacheSize: this.getCacheKeys().length }; // Add context
        Bugsnag.notify(cacheError);
      }
    }
  }

  getCachedItem(key) {
    const prefixedKey = CACHE_PREFIX + key;
    try {
      const item = sessionStorage.getItem(prefixedKey);
      if (!item) {
        // console.log(`Cache Miss: ${key}`);
        this.misses++;
        return null;
      }

      const parsed = JSON.parse(item);

      // Check for expiration
      if (Date.now() - (parsed?.timestamp || 0) > CACHE_EXPIRY_MS) {
        // console.log(`Cache Expired: ${key}`);
        try {
          sessionStorage.removeItem(prefixedKey);
        } catch (removeError) {
          console.warn(`Failed to remove expired cache item ${prefixedKey}:`, removeError);
          this.errors++;
          // Notify Bugsnag
        }
        this.misses++; // Treat expired as a miss
        return null;
      }

      // console.log(`Cache Hit: ${key}`);
      this.hits++;
      return parsed.data;
    } catch (error) {
      // console.warn(`Cache retrieval failed for key ${key}:`, error);
      this.errors++;
      // Attempt to remove potentially corrupted item
      try {
        sessionStorage.removeItem(prefixedKey);
        // console.log(`Removed potentially corrupted cache item: ${prefixedKey}`);
      } catch (removeError) {
        console.warn(`Failed to remove potentially corrupted cache item ${prefixedKey}:`, removeError);
        // Increment error count again or handle differently?
      }
      // Notify Bugsnag
      if (typeof Bugsnag !== "undefined") {
        const cacheError = new Error(`Cache retrieval failed for key: ${key}`);
        cacheError.name = ErrorTypes.CACHE;
        cacheError.originalError = error;
        Bugsnag.notify(cacheError);
      }
      return null; // Return null on error
    }
  }

  setCachedItem(key, data) {
    const prefixedKey = CACHE_PREFIX + key;
    const cacheItem = {
      timestamp: Date.now(),
      data: data,
    };

    try {
      sessionStorage.setItem(prefixedKey, JSON.stringify(cacheItem));
      // console.log(`Cache Set: ${key}, Items in cache before cleanup: ${this.getCacheKeys().length}`);
      // Run cleanup *after* setting the item to ensure the new item isn't immediately removed
      this.cleanupCache();
      // console.log(`Cache items after cleanup: ${this.getCacheKeys().length}`);
    } catch (error) {
      // console.warn(`Cache storage failed for key ${key}:`, error);
      this.errors++;

      // Notify Bugsnag about the initial storage failure
      if (typeof Bugsnag !== "undefined") {
        const cacheError = new Error(`Cache storage failed for key: ${key}`);
        cacheError.name = ErrorTypes.CACHE;
        cacheError.originalError = error;
        // Add metadata like estimated size if possible
        cacheError.metadata = { dataSize: JSON.stringify(cacheItem).length };
        Bugsnag.notify(cacheError);
      }

      // Handle potential quota exceeded error
      if (error.name === "QuotaExceededError" || (error.code && (error.code === 22 || error.code === 1014))) {
        console.warn("SessionStorage quota likely exceeded. Attempting cleanup and retry...");
        try {
          // More aggressive cleanup: remove a few items regardless of count
          const keys = this.getCacheKeys();
          const itemsToRemove = Math.min(5, keys.length); // Remove up to 5 oldest items
          if (itemsToRemove > 0) {
            console.log(`Aggressive cleanup: Removing ${itemsToRemove} oldest items.`);
            keys.slice(0, itemsToRemove).forEach((k) => {
              try {
                sessionStorage.removeItem(k);
              } catch (e) {
                console.warn(`Error removing item ${k} during aggressive cleanup:`, e);
              }
            });
          }

          // Retry setting the item
          sessionStorage.setItem(prefixedKey, JSON.stringify(cacheItem));
          // console.log(`Cache Set Retry Successful: ${key}`);
          // Run normal cleanup again after successful retry
          this.cleanupCache();
        } catch (retryError) {
          // console.warn(`Cache storage retry failed for key ${key}:`, retryError);
          this.errors++; // Increment error count again for the retry failure
          // Notify Bugsnag about the retry failure
          if (typeof Bugsnag !== "undefined") {
            const retryCacheError = new Error(`Cache storage retry failed for key: ${key}`);
            retryCacheError.name = ErrorTypes.CACHE;
            retryCacheError.originalError = retryError;
            Bugsnag.notify(retryCacheError);
          }
        }
      }
    }
  }

  // Optional: Method to get current cache stats
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      keys: this.getCacheKeys().length, // Provide current key count
    };
  }
}

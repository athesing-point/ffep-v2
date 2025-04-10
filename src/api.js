import { ErrorTypes } from "./constants.js";

/**
 * Fetches address suggestions from the SmartyStreets API.
 *
 * @param {string} query - The address query.
 * @param {string} smartyKey - The SmartyStreets API key.
 * @param {object} cacheManager - The cache manager instance.
 * @param {object} options - Additional options.
 * @param {string} [options.lastQuery=""] - The last query made (for optimization).
 * @param {number} [options.suggestionsCount=0] - Number of suggestions from the last query.
 * @param {number} [options.apiCallCount=0] - Current API call count for tracking.
 * @param {HTMLElement|null} [options.errorElement=null] - Element to display API errors.
 * @returns {Promise<Array|null>} A promise that resolves to an array of suggestions or null.
 */
export async function fetchSuggestions(query, smartyKey, cacheManager, options = {}) {
  const { lastQuery = "", suggestionsCount = 0, apiCallCount = 0, errorElement = null } = options;

  if (!query || query.length < 3) return null;

  try {
    // Check cache first using CacheManager
    const cacheKey = query.toLowerCase();
    const cachedResults = cacheManager.getCachedItem(cacheKey);
    if (cachedResults) {
      // console.log(`Using cached results for: ${query}`);
      return cachedResults.slice(0, 5); // Limit to 5 results
    }

    // Optimization: Skip API call if extending a query that previously had no results
    if (lastQuery && query.toLowerCase().startsWith(lastQuery.toLowerCase()) && suggestionsCount === 0) {
      // console.log(`Skipping API call for: ${query} (extension of no-result query: ${lastQuery})`);
      return [];
    }

    const url = `https://us-autocomplete-pro.api.smartystreets.com/lookup?${new URLSearchParams({
      search: query,
      key: smartyKey,
      source: "all",
    })}`;

    const currentApiCallCount = apiCallCount + 1; // Increment count for this call
    // const cacheStats = cacheManager.getStats();
    // console.log(`API Call #${currentApiCallCount} for: ${query}`);
    // console.log(`Cache Stats - Hits: ${cacheStats.hits}, Misses: ${cacheStats.misses}, Errors: ${cacheStats.errors}, Keys: ${cacheStats.keys}`);

    const response = await fetch(url);
    if (!response.ok) {
      const error = new Error(`Failed to fetch suggestions: ${response.status} ${response.statusText}`);
      error.name = ErrorTypes.API;
      throw error;
    }

    const data = await response.json();
    const suggestions = (data.suggestions || []).slice(0, 5); // Limit to 5 results

    // Cache the results using CacheManager
    cacheManager.setCachedItem(cacheKey, suggestions);

    // Hide error element if it was previously shown
    if (errorElement) {
      errorElement.style.display = "none";
    }

    // Return suggestions and updated api call count if needed, or just suggestions
    return suggestions;
  } catch (error) {
    // Ensure error is properly tagged if not already
    if (!error.name) {
      error.name = ErrorTypes.API;
    }
    console.error("Error fetching suggestions:", error);
    if (errorElement) {
      errorElement.textContent = "Error fetching address suggestions."; // More specific error
      errorElement.style.display = "block";
    }
    return []; // Return empty array on error to prevent issues downstream
  }
}

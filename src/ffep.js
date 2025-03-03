// Constants
const SMARTY_WEBSITE_KEYS = {
  PDC: "17448046178191022",
  PDD: "17448045555816402",
};

// Enhanced debounce function with variable wait time
function debounce(func, getWaitTime) {
  let timeout;
  return function executedFunction(...args) {
    return new Promise((resolve) => {
      const later = async () => {
        clearTimeout(timeout);
        resolve(await func.apply(this, args));
      };
      clearTimeout(timeout);
      const wait = typeof getWaitTime === "function" ? getWaitTime(...args) : getWaitTime;
      timeout = setTimeout(later, wait);
    });
  };
}

class FFEP {
  constructor() {
    this.form = null;
    this.addressInput = null;
    this.autocompleteContainer = null;
    this.suggestions = [];
    this.selectedIndex = -1;
    this.isAutocompleteVisible = false;
    this.apiCallCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheErrors = 0;
    this.lastQuery = "";
    this.errorElement = null;
    this.submitButton = null;
    // Remove Map-based cache
    this.CACHE_PREFIX = "ffep_cache_";
    this.MAX_CACHE_ITEMS = 50;

    // Initialize cache cleanup
    this.cleanupCache();
    console.log("FFEP Cache Initialized");

    const hostname = window.location.hostname;
    this.smartyKey = hostname.includes(".dev") ? SMARTY_WEBSITE_KEYS.PDD : SMARTY_WEBSITE_KEYS.PDC;

    this.debouncedFetchSuggestions = debounce(this.fetchSuggestions.bind(this), (query) => (query.length <= 4 ? 50 : 200));
  }

  // Add cache management methods
  cleanupCache() {
    try {
      const beforeCount = this.getCacheKeys().length;
      const cacheKeys = this.getCacheKeys();
      if (cacheKeys.length > this.MAX_CACHE_ITEMS) {
        // Remove oldest items to maintain size limit
        const keysToRemove = cacheKeys.slice(0, cacheKeys.length - this.MAX_CACHE_ITEMS);
        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
        console.log(`Cache Cleanup: Removed ${keysToRemove.length} items. Before: ${beforeCount}, After: ${this.getCacheKeys().length}`);
      }
    } catch (error) {
      console.warn("Cache cleanup failed:", error);
      this.cacheErrors++;
    }
  }

  getCacheKeys() {
    return Object.keys(sessionStorage)
      .filter((key) => key.startsWith(this.CACHE_PREFIX))
      .sort((a, b) => {
        const timeA = JSON.parse(sessionStorage.getItem(a))?.timestamp || 0;
        const timeB = JSON.parse(sessionStorage.getItem(b))?.timestamp || 0;
        return timeA - timeB;
      });
  }

  getCachedItem(key) {
    try {
      const item = sessionStorage.getItem(this.CACHE_PREFIX + key);
      if (!item) {
        console.log(`Cache Miss: ${key}`);
        this.cacheMisses++;
        return null;
      }

      const parsed = JSON.parse(item);
      // Return null if cache is older than 30 minutes
      if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
        console.log(`Cache Expired: ${key}`);
        sessionStorage.removeItem(this.CACHE_PREFIX + key);
        this.cacheMisses++;
        return null;
      }
      console.log(`Cache Hit: ${key}`);
      this.cacheHits++;
      return parsed.data;
    } catch (error) {
      console.warn("Cache retrieval failed:", error);
      this.cacheErrors++;
      return null;
    }
  }

  setCachedItem(key, data) {
    try {
      const cacheItem = {
        timestamp: Date.now(),
        data: data,
      };
      sessionStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cacheItem));
      console.log(`Cache Set: ${key}, Items in cache: ${this.getCacheKeys().length}`);
      this.cleanupCache();
    } catch (error) {
      console.warn("Cache storage failed:", error);
      this.cacheErrors++;
      // If storage fails (e.g., quota exceeded), clear some old items and try again
      try {
        this.cleanupCache();
        sessionStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cacheItem));
        console.log(`Cache Set Retry Successful: ${key}`);
      } catch (retryError) {
        console.warn("Cache storage retry failed:", retryError);
        this.cacheErrors++;
      }
    }
  }

  init() {
    // Find the address input directly
    this.addressInput = document.querySelector('[data-ffep="address"]');
    if (!this.addressInput) {
      console.error("Input with data-ffep='address' not found");
      return;
    }

    // Find the submit button
    this.submitButton = document.querySelector("#ffep-submit");

    // Find the error element
    this.errorElement = document.querySelector(".ffep-error");

    this.setupAutocomplete();
    this.setupFormHandling();
  }

  setupAutocomplete() {
    // Find existing autocomplete container created in Webflow
    this.autocompleteContainer = document.querySelector(".ffep-autocomplete");
    if (!this.autocompleteContainer) {
      // console.error("Autocomplete container with class 'ffep-autocomplete' not found");
      return;
    }

    // Setup input event listeners
    this.addressInput.addEventListener("input", this.handleInput.bind(this));
    this.addressInput.addEventListener("keydown", this.handleKeydown.bind(this));
    this.addressInput.addEventListener("focus", this.handleFocus.bind(this));
    document.addEventListener("click", this.handleClickOutside.bind(this));
    this.autocompleteContainer.addEventListener("mouseover", this.handleMouseOver.bind(this));
  }

  setupFormHandling() {
    const handleSubmit = async () => {
      try {
        // Get the address and encode it properly for both parameters
        const addressValue = this.addressInput.value;
        const encodedAddress = encodeURIComponent(addressValue).replace(/%20/g, "+");

        // Get the current URL to determine the TLD
        const currentUrl = new URL(window.location.href);
        const targetTLD = currentUrl.hostname.includes(".dev") ? "dev" : "com";

        // Construct URL with both parameters
        const targetUrl = `https://home.point.${targetTLD}/?Enter+your+home+address=${encodedAddress}&address=${encodedAddress}`;

        // Immediately redirect without showing form submission
        window.location.replace(targetUrl);
      } catch (error) {
        console.error("Error during redirect:", error);
        if (this.errorElement) {
          this.errorElement.style.display = "block";
        }
      }
    };

    // Handle submit button click
    if (this.submitButton) {
      this.submitButton.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent the default anchor tag behavior
        if (!this.isAutocompleteVisible) {
          handleSubmit();
        }
      });
    }

    // Handle enter key on input
    this.addressInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !this.isAutocompleteVisible) {
        handleSubmit();
      }
    });
  }

  async handleInput(e) {
    const query = e.target.value;
    // console.log("Input value:", query);
    if (query.length < 3) {
      this.hideSuggestions();
      return;
    }

    try {
      // Use the debounced version for API calls
      const suggestions = await this.debouncedFetchSuggestions(query);
      // console.log("Received suggestions:", suggestions);
      if (suggestions) {
        this.suggestions = suggestions;
        this.showSuggestions();
      }
    } catch (error) {
      // console.error("Error fetching suggestions:", error);
    }
  }

  async fetchSuggestions(query) {
    if (!query || query.length < 3) return null;

    try {
      // Check cache first
      const cacheKey = query.toLowerCase();
      const cachedResults = this.getCachedItem(cacheKey);
      if (cachedResults) {
        console.log(`Using cached results for: ${query}`);
        return cachedResults.slice(0, 5); // Limit to 5 results
      }

      // If this is a longer version of the last query and last query had no results,
      // we can skip the API call
      if (this.lastQuery && query.toLowerCase().startsWith(this.lastQuery.toLowerCase()) && this.suggestions.length === 0) {
        console.log(`Skipping API call for: ${query} (extension of no-result query: ${this.lastQuery})`);
        return [];
      }

      const url = `https://us-autocomplete-pro.api.smartystreets.com/lookup?${new URLSearchParams({
        search: query,
        key: this.smartyKey,
        source: "all",
      })}`;

      this.apiCallCount++;
      console.log(`API Call #${this.apiCallCount} for: ${query}`);
      console.log(`Cache Stats - Hits: ${this.cacheHits}, Misses: ${this.cacheMisses}, Errors: ${this.cacheErrors}`);

      this.lastQuery = query;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      const suggestions = (data.suggestions || []).slice(0, 5); // Limit to 5 results

      // Cache the results
      this.setCachedItem(cacheKey, suggestions);

      // Hide error element if it was previously shown
      if (this.errorElement) {
        this.errorElement.style.display = "none";
      }

      return suggestions;
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      if (this.errorElement) {
        this.errorElement.style.display = "block";
      }
      return [];
    }
  }

  showSuggestions() {
    // console.log("Showing suggestions:", this.suggestions);
    if (!this.suggestions.length) {
      // console.log("No suggestions to show, hiding container");
      this.hideSuggestions();
      return;
    }

    if (!this.autocompleteContainer) {
      // console.error("Autocomplete container is null!");
      return;
    }

    const html = this.suggestions
      .map(
        (suggestion, index) => `
        <div class="ffep-suggestion" data-index="${index}" role="option" aria-selected="false">
          ${suggestion.street_line}, ${suggestion.city}, ${suggestion.state} ${suggestion.zipcode}
        </div>
      `
      )
      .join("");

    // console.log("Generated HTML:", html);
    this.autocompleteContainer.innerHTML = html;
    // console.log("Setting display to block");
    this.autocompleteContainer.style.display = "block";
    this.isAutocompleteVisible = true;

    // Add click handlers to suggestions
    this.autocompleteContainer.querySelectorAll(".ffep-suggestion").forEach((el) => {
      el.addEventListener("click", () => {
        const index = parseInt(el.dataset.index);
        this.selectSuggestion(index);
      });
    });
  }

  hideSuggestions() {
    this.autocompleteContainer.style.display = "none";
    this.isAutocompleteVisible = false;
    this.selectedIndex = -1;
  }

  handleKeydown(e) {
    if (!this.isAutocompleteVisible) return;

    const suggestions = this.autocompleteContainer.querySelectorAll(".ffep-suggestion");
    if (!suggestions.length) return;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault(); // Prevent page scrolling
        if (this.selectedIndex === -1) {
          this.selectedIndex = suggestions.length - 1;
        } else {
          this.navigateSuggestions(-1);
        }
        this.handleArrowSelection();
        break;
      case "ArrowDown":
        e.preventDefault(); // Prevent page scrolling
        if (this.selectedIndex === -1) {
          this.selectedIndex = 0;
        } else {
          this.navigateSuggestions(1);
        }
        this.handleArrowSelection();
        break;
      case "Enter":
        if (this.selectedIndex !== -1) {
          e.preventDefault(); // Prevent form submission
          const selectedElement = suggestions[this.selectedIndex];
          if (selectedElement) {
            const index = parseInt(selectedElement.dataset.index);
            if (!isNaN(index) && this.suggestions[index]) {
              const selectedSuggestion = this.suggestions[index];
              const addressValue = `${selectedSuggestion.street_line}, ${selectedSuggestion.city}, ${selectedSuggestion.state} ${selectedSuggestion.zipcode}`;
              this.addressInput.value = addressValue;
              this.hideSuggestions();

              // Direct URL navigation
              const encodedAddress = encodeURIComponent(addressValue).replace(/%20/g, "+");
              const targetTLD = window.location.hostname.includes(".dev") ? "dev" : "com";
              const targetUrl = `https://home.point.${targetTLD}/?Enter+your+home+address=${encodedAddress}&address=${encodedAddress}`;
              window.location.replace(targetUrl);
            }
          }
        }
        break;
      default:
        break;
    }
  }

  navigateSuggestions(direction) {
    const suggestions = this.autocompleteContainer.querySelectorAll(".ffep-suggestion");
    if (!suggestions.length) return;

    this.selectedIndex += direction;

    if (this.selectedIndex < 0) {
      this.selectedIndex = suggestions.length - 1;
    }

    if (this.selectedIndex >= suggestions.length) {
      this.selectedIndex = 0;
    }
  }

  handleMouseOver(event) {
    if (event.target.classList.contains("ffep-suggestion")) {
      const suggestions = this.autocompleteContainer.querySelectorAll(".ffep-suggestion");
      suggestions.forEach((el) => {
        el.classList.remove("hover");
      });
      event.target.classList.add("hover");
    }
  }

  handleArrowSelection() {
    const suggestions = this.autocompleteContainer.querySelectorAll(".ffep-suggestion");
    suggestions.forEach((el, index) => {
      el.classList.remove("hover");
      el.setAttribute("aria-selected", "false");
      if (index === this.selectedIndex) {
        el.classList.add("hover");
        el.setAttribute("aria-selected", "true");
      }
    });
  }

  selectSuggestion(index) {
    const suggestions = this.autocompleteContainer.querySelectorAll(".ffep-suggestion");
    if (index !== undefined && suggestions[index]) {
      const selectedElement = suggestions[index];
      const selectedIndex = parseInt(selectedElement.dataset.index);
      if (!isNaN(selectedIndex) && this.suggestions[selectedIndex]) {
        const selectedSuggestion = this.suggestions[selectedIndex];
        const addressValue = `${selectedSuggestion.street_line}, ${selectedSuggestion.city}, ${selectedSuggestion.state} ${selectedSuggestion.zipcode}`;
        this.addressInput.value = addressValue;
        this.hideSuggestions();

        // Direct URL navigation
        const encodedAddress = encodeURIComponent(addressValue).replace(/%20/g, "+");
        const targetTLD = window.location.hostname.includes(".dev") ? "dev" : "com";
        const targetUrl = `https://home.point.${targetTLD}/?Enter+your+home+address=${encodedAddress}&address=${encodedAddress}`;
        window.location.replace(targetUrl);
      }
    }
  }

  handleClickOutside(e) {
    if (!this.autocompleteContainer.contains(e.target) && e.target !== this.addressInput) {
      this.hideSuggestions();
    }
  }

  async handleFocus(e) {
    const query = e.target.value;
    if (query.length < 3) {
      return;
    }

    // Check if we already have suggestions visible
    if (this.isAutocompleteVisible) {
      return;
    }

    try {
      // Check cache for current input value
      const cacheKey = query.toLowerCase();
      const cachedResults = this.getCachedItem(cacheKey);

      if (cachedResults && cachedResults.length > 0) {
        console.log(`Reshowing cached results for: ${query} on focus`);
        this.suggestions = cachedResults;
        this.showSuggestions();
      }
    } catch (error) {
      console.error("Error fetching cached suggestions on focus:", error);
    }
  }
}

// Initialize FFEP when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.FFEP = FFEP; // Make FFEP available globally
  const ffep = new FFEP();
  ffep.init();
});

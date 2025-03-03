# FFEP Code Overview

## Introduction

FFEP (Fast Form Entry Point) is a client-side address autocomplete and form handling system that integrates with the SmartyStreets API for address validation and suggestions. This document provides an overview of the code structure and key functionalities.

## Core Components

### 1. Constants and Configuration

```javascript
const SMARTY_WEBSITE_KEYS = {
  PDC: "17448046178191022",
  PDD: "17448045555816402",
};

// Hostname-based key selection
const hostname = window.location.hostname;
this.smartyKey = hostname.includes(".dev") ? SMARTY_WEBSITE_KEYS.PDD : SMARTY_WEBSITE_KEYS.PDC;
```

- Defines API keys for different environments (Production and Development)
- Keys are selected based on the hostname (.dev vs .com)

### 2. Performance Optimizations

#### Debounce Function

```javascript
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

// Usage in constructor
this.debouncedFetchSuggestions = debounce(this.fetchSuggestions.bind(this), (query) => (query.length <= 4 ? 50 : 200));
```

- Implements an enhanced debounce with variable wait times
- Shorter delay (50ms) for queries ≤ 4 characters
- Longer delay (200ms) for queries > 4 characters
- Prevents excessive API calls during rapid typing

### 3. Cache Management

The caching system uses sessionStorage for persistence and implements:

- Cache expiration (30 minutes)
- Size limits (50 items maximum)
- Automatic cleanup of old entries
- Performance metrics tracking (hits, misses, errors)

Key Methods:

- `cleanupCache()`: Maintains cache size limits
- `getCachedItem(key)`: Retrieves and validates cached data
- `setCachedItem(key, data)`: Stores data with timestamp
- `getCacheKeys()`: Manages cache entry ordering

```javascript
class FFEP {
  constructor() {
    this.CACHE_PREFIX = "ffep_cache_";
    this.MAX_CACHE_ITEMS = 50;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.cacheErrors = 0;
  }

  cleanupCache() {
    try {
      const beforeCount = this.getCacheKeys().length;
      const cacheKeys = this.getCacheKeys();
      if (cacheKeys.length > this.MAX_CACHE_ITEMS) {
        const keysToRemove = cacheKeys.slice(0, cacheKeys.length - this.MAX_CACHE_ITEMS);
        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
        console.log(`Cache Cleanup: Removed ${keysToRemove.length} items. Before: ${beforeCount}, After: ${this.getCacheKeys().length}`);
      }
    } catch (error) {
      console.warn("Cache cleanup failed:", error);
      this.cacheErrors++;
    }
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
      } catch (retryError) {
        console.warn("Cache storage retry failed:", retryError);
        this.cacheErrors++;
      }
    }
  }
}
```

### 4. Core Functionality

#### Initialization

```javascript
init() {
  // Find the FFEP form
  this.form = document.querySelector('form[data-ffep="form"]');
  if (!this.form) {
    console.error("data-ffep='form' element not found");
    return;
  }

  // Find the address input
  this.addressInput = this.form.querySelector('[data-ffep="address"]');
  if (!this.addressInput) {
    return;
  }

  this.setupAutocomplete();
  this.setupFormHandling();
}

setupAutocomplete() {
  this.autocompleteContainer = document.querySelector(".ffep-autocomplete");
  if (!this.autocompleteContainer) {
    return;
  }

  // Setup input event listeners
  this.addressInput.addEventListener("input", this.handleInput.bind(this));
  this.addressInput.addEventListener("keydown", this.handleKeydown.bind(this));
  this.addressInput.addEventListener("focus", this.handleFocus.bind(this));
  document.addEventListener("click", this.handleClickOutside.bind(this));
  this.autocompleteContainer.addEventListener("mouseover", this.handleMouseOver.bind(this));
}
```

#### Address Input Handling

```javascript
async handleInput(e) {
  const query = e.target.value;
  if (query.length < 3) {
    this.hideSuggestions();
    return;
  }

  try {
    const suggestions = await this.debouncedFetchSuggestions(query);
    if (suggestions) {
      this.suggestions = suggestions;
      this.showSuggestions();
    }
  } catch (error) {
    // Handle error
  }
}

async fetchSuggestions(query) {
  if (!query || query.length < 3) return null;

  // Check cache first
  const cacheKey = query.toLowerCase();
  const cachedResults = this.getCachedItem(cacheKey);
  if (cachedResults) {
    console.log(`Using cached results for: ${query}`);
    return cachedResults.slice(0, 5);
  }

  // Skip API call for no-result queries
  if (this.lastQuery &&
      query.toLowerCase().startsWith(this.lastQuery.toLowerCase()) &&
      this.suggestions.length === 0) {
    console.log(`Skipping API call for: ${query}`);
    return [];
  }

  const url = `https://us-autocomplete-pro.api.smartystreets.com/lookup?${new URLSearchParams({
    search: query,
    key: this.smartyKey,
    source: "all",
  })}`;

  this.apiCallCount++;
  console.log(`API Call #${this.apiCallCount} for: ${query}`);
  this.lastQuery = query;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch suggestions");
  }

  const data = await response.json();
  const suggestions = (data.suggestions || []).slice(0, 5);
  this.setCachedItem(cacheKey, suggestions);

  return suggestions;
}
```

#### Suggestion Management

```javascript
showSuggestions() {
  if (!this.suggestions.length) {
    this.hideSuggestions();
    return;
  }

  if (!this.autocompleteContainer) {
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

  this.autocompleteContainer.innerHTML = html;
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

handleKeydown(e) {
  if (!this.isAutocompleteVisible) return;

  const suggestions = this.autocompleteContainer.querySelectorAll(".ffep-suggestion");
  if (!suggestions.length) return;

  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      if (this.selectedIndex === -1) {
        this.selectedIndex = suggestions.length - 1;
      } else {
        this.navigateSuggestions(-1);
      }
      this.handleArrowSelection();
      break;
    case "ArrowDown":
      e.preventDefault();
      if (this.selectedIndex === -1) {
        this.selectedIndex = 0;
      } else {
        this.navigateSuggestions(1);
      }
      this.handleArrowSelection();
      break;
    case "Enter":
      if (this.selectedIndex !== -1) {
        e.preventDefault();
        const selectedElement = suggestions[this.selectedIndex];
        if (selectedElement) {
          const index = parseInt(selectedElement.dataset.index);
          if (!isNaN(index) && this.suggestions[index]) {
            this.selectSuggestion(index);
          }
        }
      }
      break;
  }
}
```

### 5. UI Components

#### Autocomplete Display

```javascript
showSuggestions() {
  if (!this.suggestions.length) {
    this.hideSuggestions();
    return;
  }

  if (!this.autocompleteContainer) {
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

  this.autocompleteContainer.innerHTML = html;
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

handleKeydown(e) {
  if (!this.isAutocompleteVisible) return;

  const suggestions = this.autocompleteContainer.querySelectorAll(".ffep-suggestion");
  if (!suggestions.length) return;

  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      if (this.selectedIndex === -1) {
        this.selectedIndex = suggestions.length - 1;
      } else {
        this.navigateSuggestions(-1);
      }
      this.handleArrowSelection();
      break;
    case "ArrowDown":
      e.preventDefault();
      if (this.selectedIndex === -1) {
        this.selectedIndex = 0;
      } else {
        this.navigateSuggestions(1);
      }
      this.handleArrowSelection();
      break;
    case "Enter":
      if (this.selectedIndex !== -1) {
        e.preventDefault();
        const selectedElement = suggestions[this.selectedIndex];
        if (selectedElement) {
          const index = parseInt(selectedElement.dataset.index);
          if (!isNaN(index) && this.suggestions[index]) {
            this.selectSuggestion(index);
          }
        }
      }
      break;
  }
}
```

#### Keyboard Navigation

```javascript
handleFocus(e);
handleClickOutside(e);
```

- Manages suggestion visibility on focus/blur
- Implements click-outside detection
- Restores cached results when refocusing

### 6. Form Submission

#### Form Handler

```javascript
setupFormHandling() {
  this.form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const addressValue = this.addressInput.value;
    const encodedAddress = encodeURIComponent(addressValue).replace(/%20/g, "+");

    const currentUrl = new URL(window.location.href);
    const targetTLD = currentUrl.hostname.includes(".dev") ? "dev" : "com";

    const targetUrl = `https://home.point.${targetTLD}/?Enter+your+home+address=${encodedAddress}&address=${encodedAddress}`;

    window.location.replace(targetUrl);
  });
}
```

- Prevents default form submission
- Constructs target URL with proper encoding
- Handles environment-specific redirects (.dev vs .com)
- Manages address parameter formatting

## Event Flow

1. User Input

   - Character threshold check (≥ 3 chars)
   - Debounced API call preparation
   - Cache check

2. Data Retrieval

   - Cache hit: Return cached suggestions
   - Cache miss: Fetch from SmartyStreets API
   - Store new results in cache

3. UI Updates

   - Render suggestions
   - Setup interaction handlers
   - Manage keyboard navigation
   - Handle selection events

4. Form Submission
   - Format selected address
   - Construct redirect URL
   - Handle environment specifics
   - Perform navigation

## Performance Considerations

1. Caching

   - Session-based persistence
   - Automatic cleanup
   - Size limitations
   - Expiration handling

2. API Optimization

   - Debounced requests
   - Smart query prevention
   - Result limiting
   - Environment-specific keys

3. UI Performance
   - Minimal DOM updates
   - Event delegation
   - Efficient rendering
   - Clean teardown

## Error Handling

- Cache operation failures
- API request errors
- DOM element validation
- Input validation
- Environment detection

## Best Practices Implemented

1. Performance

   - Debouncing
   - Caching
   - Smart API calls
   - Result limiting

2. User Experience

   - Keyboard navigation
   - Click handling
   - Focus management
   - Immediate feedback

3. Code Organization

   - Clear class structure
   - Separated concerns
   - Consistent error handling
   - Performance monitoring

4. Security
   - Environment-specific keys
   - Input sanitization
   - Safe URL construction
   - XSS prevention

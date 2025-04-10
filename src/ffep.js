import { SMARTY_WEBSITE_KEYS, ErrorTypes } from "./constants.js";
import { debounce } from "./utils.js";
import { CacheManager } from "./cache.js";
import { fetchSuggestions as apiFetchSuggestions } from "./api.js";
import { setupAutocomplete as uiSetupAutocomplete, showSuggestions as uiShowSuggestions, hideSuggestions as uiHideSuggestions, selectSuggestion as uiSelectSuggestion } from "./ui.js";

class FFEP {
  constructor() {
    // Core state
    this.addressInput = null;
    this.autocompleteContainer = null; // Managed by ui.js
    this.submitButton = null;
    this.errorElement = null;

    // Autocomplete state
    this.suggestions = [];
    this.selectedIndex = -1;
    this.isAutocompleteVisible = false;
    this.lastQuery = "";

    // Configuration & Services
    this.smartyKey = this.getSmartyKey();
    this.cacheManager = new CacheManager();
    this.apiCallCount = 0;

    // Debounced API call
    this.debouncedFetchSuggestions = debounce(this.fetchAndShowSuggestions.bind(this), (query) => (query && query.length <= 4 ? 50 : 200));

    // console.log("FFEP Constructor finished");
  }

  getSmartyKey() {
    const hostname = window.location.hostname;
    // console.log("Hostname:", hostname);
    const key = hostname.includes(".dev") ? SMARTY_WEBSITE_KEYS.PDD : SMARTY_WEBSITE_KEYS.PDC;
    // console.log("Selected Smarty Key:", key ? "Key Found" : "Key Missing!");
    return key;
  }

  init() {
    // console.log("FFEP Init started");
    // Find the address input
    this.addressInput = document.querySelector('[data-ffep="address"]');
    if (!this.addressInput) {
      this.handleInitializationError('Input with data-ffep="address" not found');
      return;
    }

    // Find other essential elements
    this.submitButton = document.querySelector("#ffep-submit");
    this.errorElement = document.querySelector(".field-error"); // Optional, might not exist
    this.autocompleteContainer = document.querySelector(".ffep-autocomplete"); // Find container for UI module

    if (!this.autocompleteContainer) {
      // Don't throw error, just log and disable autocomplete
      console.warn("Autocomplete container (.ffep-autocomplete) not found. Autocomplete disabled.");
    }

    // console.log("Essential elements found:", {
    //     addressInput: !!this.addressInput,
    //     submitButton: !!this.submitButton,
    //     errorElement: !!this.errorElement,
    //     autocompleteContainer: !!this.autocompleteContainer
    // });

    // Setup UI event listeners via ui.js if container exists
    if (this.autocompleteContainer) {
      uiSetupAutocomplete(this);
      // console.log("Autocomplete UI setup complete");
    }

    // Setup form submission logic
    this.setupFormHandling();
    // console.log("Form handling setup complete");
    // console.log("FFEP Init finished");
  }

  handleInitializationError(message) {
    const error = new Error(message);
    error.name = ErrorTypes.INITIALIZATION;
    if (typeof Bugsnag !== "undefined") {
      Bugsnag.notify(error);
    }
    console.error(`[${ErrorTypes.INITIALIZATION}] ${message}`);
  }

  setupFormHandling() {
    // console.log("Setting up form handling...");
    // Handle submit button click
    if (this.submitButton) {
      this.submitButton.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent default anchor tag behavior
        // console.log("Submit button clicked. Autocomplete visible?", this.isAutocompleteVisible);
        // Only submit if autocomplete is not showing suggestions
        if (!this.isAutocompleteVisible) {
          this.triggerFormSubmit();
        }
      });
    } else {
      console.warn("Submit button (#ffep-submit) not found. Form submission via button click disabled.");
    }

    // Handle enter key on input
    this.addressInput.addEventListener("keydown", (e) => {
      // console.log(`Keydown on input: ${e.key}. Autocomplete visible? ${this.isAutocompleteVisible}`);
      // Let the ui.js handleKeydown manage Enter when autocomplete is visible
      if (this.isAutocompleteVisible) {
        return; // ui.js keydown handler takes precedence
      }

      // Handle Enter for submission ONLY when autocomplete is hidden
      if (e.key === "Enter") {
        // console.log("Enter pressed while autocomplete hidden. Triggering submit.");
        e.preventDefault(); // Prevent potential default form submission
        this.triggerFormSubmit();
      }
    });
  }

  // Renamed from handleSubmit to clarify role
  triggerFormSubmit() {
    // console.log("Triggering form submission...");
    try {
      const addressValue = this.addressInput.value;
      if (!addressValue || addressValue.length < 3) {
        // Basic validation
        console.warn("Submission blocked: Address input is too short.");
        // Optional: Show user feedback
        if (this.errorElement) {
          this.errorElement.textContent = "Please enter a valid address.";
          this.errorElement.style.display = "block";
        }
        return;
      }

      const encodedAddress = encodeURIComponent(addressValue).replace(/%20/g, "+");
      const targetTLD = window.location.hostname.includes(".dev") ? "dev" : "com";
      const targetUrl = `https://home.point.${targetTLD}/?Enter+your+home+address=${encodedAddress}&address=${encodedAddress}`;

      // console.log("Redirecting to:", targetUrl);
      // Use setTimeout to allow any pending UI updates or event listeners to complete
      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 0);
    } catch (error) {
      // console.error("Error during form submission trigger:", error);
      error.name = ErrorTypes.FORM_SUBMISSION;
      error.metadata = {
        addressValue: this.addressInput?.value,
        currentUrl: window.location.href,
      };
      if (typeof Bugsnag !== "undefined") {
        Bugsnag.notify(error);
      }
      console.error(`[${ErrorTypes.FORM_SUBMISSION}] Error during redirect:`, error);
      // Show generic error to user
      if (this.errorElement) {
        this.errorElement.textContent = "An error occurred. Please try again.";
        this.errorElement.style.display = "block";
      }
    }
  }

  // --- Event Handlers (called by ui.js listeners or directly) ---

  async handleInput(e) {
    const query = e.target.value;
    // console.log("Input event triggered. Query:", query);
    if (query.length < 3) {
      uiHideSuggestions(this);
      return;
    }
    // Use the debounced fetch + show function
    await this.debouncedFetchSuggestions(query);
  }

  // Fetches suggestions using the API module and then tells the UI module to show them
  async fetchAndShowSuggestions(query) {
    // console.log("Executing debounced fetch & show for query:", query);
    if (!this.smartyKey) {
      console.error("Smarty API key is missing. Cannot fetch suggestions.");
      return;
    }
    try {
      const apiOptions = {
        lastQuery: this.lastQuery,
        suggestionsCount: this.suggestions.length,
        apiCallCount: this.apiCallCount,
        errorElement: this.errorElement,
      };
      const fetchedSuggestions = await apiFetchSuggestions(query, this.smartyKey, this.cacheManager, apiOptions);

      // Update state based on API response
      this.apiCallCount++; // Increment after successful or failed call handled by api.js
      this.lastQuery = query; // Update last query regardless of result for optimization

      if (fetchedSuggestions) {
        this.suggestions = fetchedSuggestions;
        if (this.suggestions.length > 0) {
          // console.log("Suggestions received, showing UI.");
          uiShowSuggestions(this);
        } else {
          // console.log("No suggestions received, hiding UI.");
          uiHideSuggestions(this);
        }
      } else {
        // Handle cases where apiFetchSuggestions returns null (e.g., query too short, error handled internally)
        // console.log("API fetch returned null/empty, ensuring UI is hidden.");
        this.suggestions = [];
        uiHideSuggestions(this);
      }
    } catch (error) {
      // This catch block might be redundant if api.js handles all errors,
      // but good for catching unexpected issues during the orchestration.
      console.error("Error in fetchAndShowSuggestions orchestration:", error);
      this.suggestions = [];
      uiHideSuggestions(this);
      // Ensure error is reported if not already done by api.js
      if (typeof Bugsnag !== "undefined" && !error.metadata) {
        error.name = error.name || ErrorTypes.API; // Default to API error type
        error.metadata = { query: query, stage: "orchestration" };
        Bugsnag.notify(error);
      }
    }
  }

  // Note: Other specific handlers (keydown, focus, clickOutside) are now primarily in ui.js
  // They call methods like uiShowSuggestions, uiHideSuggestions, uiSelectSuggestion,
  // and triggerFormSubmit on the FFEP instance when needed.
}

// --- Initialization --- //

document.addEventListener("DOMContentLoaded", () => {
  // console.log("DOM Content Loaded. Initializing FFEP...");
  try {
    // Make FFEP instance available globally (consider alternative patterns if needed)
    window.FFEPInstance = new FFEP();
    window.FFEPInstance.init();
    // console.log("FFEP Initialized successfully and attached to window.FFEPInstance");
  } catch (error) {
    console.error("Critical error during FFEP initialization:", error);
    // Attempt to report this critical failure
    if (typeof Bugsnag !== "undefined") {
      error.name = error.name || ErrorTypes.INITIALIZATION; // Ensure name is set
      error.metadata = error.metadata || {};
      error.metadata.phase = "DOMContentLoaded";
      Bugsnag.notify(error);
    }
  }
});

// Export the class for potential testing or advanced usage (though current setup relies on global instance)
export default FFEP;

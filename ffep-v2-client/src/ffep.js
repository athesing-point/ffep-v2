// Constants
const SMARTY_WEBSITE_KEYS = {
  PDC: "17448046178191022",
  PDD: "17448045555816402",
};

class FFEP {
  constructor() {
    this.form = null;
    this.addressInput = null;
    this.autocompleteContainer = null;
    this.suggestions = [];
    this.selectedIndex = -1;
    this.isAutocompleteVisible = false;
    // Determine which key to use based on hostname
    const hostname = window.location.hostname;
    this.smartyKey = hostname.includes(".dev") ? SMARTY_WEBSITE_KEYS.PDD : SMARTY_WEBSITE_KEYS.PDC;
  }

  init() {
    // Find the FFEP form
    this.form = document.querySelector('form[data-ffep="form"]');
    if (!this.form) {
      console.error("FFEP form not found");
      return;
    }

    // Find the address input
    this.addressInput = this.form.querySelector('[data-ffep="address"]');
    if (!this.addressInput) {
      console.error("Address input not found");
      return;
    }

    this.setupAutocomplete();
    this.setupFormHandling();
  }

  setupAutocomplete() {
    // Find existing autocomplete container created in Webflow
    this.autocompleteContainer = document.querySelector(".ffep-autocomplete");
    if (!this.autocompleteContainer) {
      console.error("Autocomplete container with class 'ffep-autocomplete' not found");
      return;
    }

    /* Required Webflow styles for .ffep-autocomplete:
     * Position: Absolute
     * Display: None (initial state)
     * Width: 100%
     * Max Height: 200px
     * Background: White
     * Border: 1px solid #ddd
     * Border Radius: 0 0 4px 4px
     * Box Shadow: 0 2px 4px rgba(0,0,0,0.1)
     * Z-Index: 1000
     * Overflow-Y: Auto
     *
     * Parent container (.ffep-autocomplete's parent) needs:
     * Position: Relative
     */

    // Setup input event listeners
    this.addressInput.addEventListener("input", this.handleInput.bind(this));
    this.addressInput.addEventListener("keydown", this.handleKeydown.bind(this));
    document.addEventListener("click", this.handleClickOutside.bind(this));
  }

  setupFormHandling() {
    this.form.addEventListener("submit", async (e) => {
      e.preventDefault();

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
    });
  }

  async handleInput(e) {
    const query = e.target.value;
    console.log("Input value:", query);
    if (query.length < 3) {
      this.hideSuggestions();
      return;
    }

    try {
      const suggestions = await this.fetchSuggestions(query);
      console.log("Received suggestions:", suggestions);
      this.suggestions = suggestions;
      this.showSuggestions();
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }

  async fetchSuggestions(query) {
    const url = `https://us-autocomplete-pro.api.smartystreets.com/lookup?${new URLSearchParams({
      search: query,
      key: this.smartyKey,
      source: "all",
    })}`;
    console.log("Fetching from URL:", url);

    const response = await fetch(url);
    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error("Failed to fetch suggestions");
    }

    const data = await response.json();
    console.log("Raw API response:", data);
    return data.suggestions || [];
  }

  showSuggestions() {
    console.log("Showing suggestions:", this.suggestions);
    if (!this.suggestions.length) {
      console.log("No suggestions to show, hiding container");
      this.hideSuggestions();
      return;
    }

    if (!this.autocompleteContainer) {
      console.error("Autocomplete container is null!");
      return;
    }

    const html = this.suggestions
      .map(
        (suggestion, index) => `
        <div class="ffep-suggestion ${index === this.selectedIndex ? "selected" : ""}"
             style="padding: 8px 12px; cursor: pointer; hover: background-color: #f5f5f5;"
             data-index="${index}">
          ${suggestion.street_line}, ${suggestion.city}, ${suggestion.state} ${suggestion.zipcode}
        </div>
      `
      )
      .join("");

    console.log("Setting innerHTML:", html);
    this.autocompleteContainer.innerHTML = html;
    console.log("Setting display to block");
    this.autocompleteContainer.style.display = "block";
    this.isAutocompleteVisible = true;

    // Add click handlers to suggestions
    this.autocompleteContainer.querySelectorAll(".ffep-suggestion").forEach((el) => {
      el.addEventListener("click", () => {
        const index = parseInt(el.dataset.index);
        this.selectSuggestion(index);
      });

      el.addEventListener("mouseover", () => {
        this.selectedIndex = parseInt(el.dataset.index);
        this.highlightSuggestion();
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

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this.highlightSuggestion();
        break;
      case "ArrowUp":
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.highlightSuggestion();
        break;
      case "Enter":
        if (this.selectedIndex >= 0) {
          e.preventDefault();
          this.selectSuggestion(this.selectedIndex);
        }
        break;
      case "Escape":
        this.hideSuggestions();
        break;
    }
  }

  highlightSuggestion() {
    const suggestions = this.autocompleteContainer.querySelectorAll(".ffep-suggestion");
    suggestions.forEach((el, index) => {
      el.style.backgroundColor = index === this.selectedIndex ? "#f5f5f5" : "";
    });

    // Scroll selected item into view if needed
    if (this.selectedIndex >= 0) {
      suggestions[this.selectedIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }

  selectSuggestion(index) {
    const suggestion = this.suggestions[index];
    this.addressInput.value = `${suggestion.street_line}, ${suggestion.city}, ${suggestion.state} ${suggestion.zipcode}`;
    this.hideSuggestions();
  }

  handleClickOutside(e) {
    if (!this.autocompleteContainer.contains(e.target) && e.target !== this.addressInput) {
      this.hideSuggestions();
    }
  }
}

// Initialize FFEP when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.FFEP = FFEP; // Make FFEP available globally
  const ffep = new FFEP();
  ffep.init();
});

// Constants
const SMARTY_KEY = "YOUR_SMARTY_KEY"; // Replace with actual key
const SMARTY_WEBSITE_KEY = "YOUR_SMARTY_WEBSITE_KEY"; // Replace with actual key

class FFEP {
  constructor() {
    this.form = null;
    this.addressInput = null;
    this.autocompleteContainer = null;
    this.suggestions = [];
    this.selectedIndex = -1;
    this.isAutocompleteVisible = false;
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
    // Create autocomplete container
    this.autocompleteContainer = document.createElement("div");
    this.autocompleteContainer.className = "ffep-autocomplete";
    this.autocompleteContainer.style.cssText = `
      position: absolute;
      width: 100%;
      max-height: 200px;
      overflow-y: auto;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 4px 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1000;
      display: none;
    `;

    this.addressInput.parentNode.style.position = "relative";
    this.addressInput.parentNode.appendChild(this.autocompleteContainer);

    // Setup input event listeners
    this.addressInput.addEventListener("input", this.handleInput.bind(this));
    this.addressInput.addEventListener("keydown", this.handleKeydown.bind(this));
    document.addEventListener("click", this.handleClickOutside.bind(this));
  }

  setupFormHandling() {
    this.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const address = this.addressInput.value;

      // Call the onSubmit callback if it exists
      if (typeof window.onSubmitFfepForm === "function") {
        window.onSubmitFfepForm(address);
      }

      // Default form submission behavior
      const formData = new FormData(this.form);
      const params = new URLSearchParams(formData);
      window.location.href = `https://home.point.com/hei?${params.toString()}`;
    });
  }

  async handleInput(e) {
    const query = e.target.value;
    if (query.length < 3) {
      this.hideSuggestions();
      return;
    }

    try {
      const suggestions = await this.fetchSuggestions(query);
      this.suggestions = suggestions;
      this.showSuggestions();
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }

  async fetchSuggestions(query) {
    const response = await fetch(
      `https://us-autocomplete-pro.api.smartystreets.com/lookup?${new URLSearchParams({
        "auth-id": SMARTY_KEY,
        "key": SMARTY_WEBSITE_KEY,
        "search": query,
        "source": "all",
      })}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch suggestions");
    }

    const data = await response.json();
    return data.suggestions || [];
  }

  showSuggestions() {
    if (!this.suggestions.length) {
      this.hideSuggestions();
      return;
    }

    this.autocompleteContainer.innerHTML = this.suggestions
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
  const ffep = new FFEP();
  ffep.init();
});

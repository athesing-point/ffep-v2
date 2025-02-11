var FFEP = (() => {
  // src/ffep.js
  var SMARTY_WEBSITE_KEYS = {
    PDC: "17448046178191022",
    PDD: "17448045555816402"
  };
  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
  var FFEP = class {
    constructor() {
      this.form = null;
      this.addressInput = null;
      this.autocompleteContainer = null;
      this.suggestions = [];
      this.selectedIndex = -1;
      this.isAutocompleteVisible = false;
      this.apiCallCount = 0;
      const hostname = window.location.hostname;
      this.smartyKey = hostname.includes(".dev") ? SMARTY_WEBSITE_KEYS.PDD : SMARTY_WEBSITE_KEYS.PDC;
      this.debouncedFetchSuggestions = debounce(this.fetchSuggestions.bind(this), 300);
    }
    init() {
      this.form = document.querySelector('form[data-ffep="form"]');
      if (!this.form) {
        console.error("FFEP form not found");
        return;
      }
      this.addressInput = this.form.querySelector('[data-ffep="address"]');
      if (!this.addressInput) {
        console.error("Address input not found");
        return;
      }
      this.setupAutocomplete();
      this.setupFormHandling();
    }
    setupAutocomplete() {
      this.autocompleteContainer = document.querySelector(".ffep-autocomplete");
      if (!this.autocompleteContainer) {
        console.error("Autocomplete container with class 'ffep-autocomplete' not found");
        return;
      }
      this.addressInput.addEventListener("input", this.handleInput.bind(this));
      this.addressInput.addEventListener("keydown", this.handleKeydown.bind(this));
      document.addEventListener("click", this.handleClickOutside.bind(this));
    }
    setupFormHandling() {
      this.form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const addressValue = this.addressInput.value;
        const encodedAddress = encodeURIComponent(addressValue).replace(/%20/g, "+");
        const currentUrl = new URL(window.location.href);
        const targetTLD = currentUrl.hostname.includes(".dev") ? "dev" : "com";
        const targetUrl = "https://home.point.".concat(targetTLD, "/?Enter+your+home+address=").concat(encodedAddress, "&address=").concat(encodedAddress);
        window.location.replace(targetUrl);
      });
    }
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
      }
    }
    async fetchSuggestions(query) {
      if (!query || query.length < 3) return null;
      const url = "https://us-autocomplete-pro.api.smartystreets.com/lookup?".concat(new URLSearchParams({
        search: query,
        key: this.smartyKey,
        source: "all"
      }));
      this.apiCallCount++;
      console.log("API calls made: ".concat(this.apiCallCount));
      const response = await fetch(url);
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
      if (!this.autocompleteContainer) {
        console.error("Autocomplete container is null!");
        return;
      }
      const html = this.suggestions.map(
        (suggestion, index) => '\n        <div class="ffep-suggestion '.concat(index === this.selectedIndex ? "selected" : "", '"\n             style="padding: 8px 12px; cursor: pointer; hover: background-color: #f5f5f5;"\n             data-index="').concat(index, '">\n          ').concat(suggestion.street_line, ", ").concat(suggestion.city, ", ").concat(suggestion.state, " ").concat(suggestion.zipcode, "\n        </div>\n      ")
      ).join("");
      this.autocompleteContainer.innerHTML = html;
      this.autocompleteContainer.style.display = "block";
      this.isAutocompleteVisible = true;
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
      if (this.selectedIndex >= 0) {
        suggestions[this.selectedIndex].scrollIntoView({
          block: "nearest",
          behavior: "smooth"
        });
      }
    }
    selectSuggestion(index) {
      const suggestion = this.suggestions[index];
      this.addressInput.value = "".concat(suggestion.street_line, ", ").concat(suggestion.city, ", ").concat(suggestion.state, " ").concat(suggestion.zipcode);
      this.hideSuggestions();
    }
    handleClickOutside(e) {
      if (!this.autocompleteContainer.contains(e.target) && e.target !== this.addressInput) {
        this.hideSuggestions();
      }
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    window.FFEP = FFEP;
    const ffep = new FFEP();
    ffep.init();
  });
})();
//# sourceMappingURL=ffep.js.map

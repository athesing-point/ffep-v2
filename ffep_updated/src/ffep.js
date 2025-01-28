class FFEP {
  constructor(config = {}) {
    this.config = {
      formSelector: '[data-ffep="form"]',
      addressInputSelector: '[data-ffep="address"]',
      ffepTarget: config.ffepTarget || "/api/submit",
      apiEndpoint: config.apiEndpoint || "https://your-worker.workers.dev",
      onSubmit: config.onSubmit || null,
      autoSubmit: config.autoSubmit !== false,
      ...config,
    };
    this.currentAddress = "";
    this.suggestions = [];
    this.init();
  }

  async init() {
    // Find and decorate all FFEP forms in the document
    const forms = document.querySelectorAll(this.config.formSelector);
    forms.forEach((form) => this.decorateForm(form));
  }

  decorateForm(originalForm) {
    // Create new form with original attributes
    const newForm = document.createElement("form");
    Array.from(originalForm.attributes).forEach((attr) => {
      if (attr.nodeValue) {
        newForm.setAttribute(attr.nodeName, attr.nodeValue);
      }
    });

    // Move all children to new form
    while (originalForm.firstChild) {
      newForm.appendChild(originalForm.firstChild);
    }

    // Set form action
    newForm.setAttribute("action", this.config.ffepTarget);

    // Replace original form
    originalForm.replaceWith(newForm);

    // Store form reference and setup listeners
    this.form = newForm;
    this.addressInput = newForm.querySelector(this.config.addressInputSelector);

    if (!this.addressInput) {
      console.error("FFEP: Address input not found");
      return;
    }

    this.setupFormElements();
    this.setupEventListeners();
  }

  setupFormElements() {
    // Create suggestions container
    this.suggestionsContainer = document.createElement("div");
    this.suggestionsContainer.className = "ffep-suggestions";
    this.suggestionsContainer.style.display = "none";
    this.addressInput.parentNode.insertBefore(this.suggestionsContainer, this.addressInput.nextSibling);

    // Create error message element
    this.errorElement = document.createElement("div");
    this.errorElement.className = "ffep-error";
    this.errorElement.style.display = "none";
    this.addressInput.parentNode.insertBefore(this.errorElement, this.suggestionsContainer);
  }

  setupEventListeners() {
    this.form.addEventListener("submit", this.handleSubmit.bind(this));
    this.addressInput.addEventListener("input", this.handleAddressInput.bind(this));
    this.addressInput.addEventListener("focus", () => {
      if (this.suggestions.length > 0) {
        this.showSuggestions(this.suggestions);
      }
    });
    this.addressInput.addEventListener("blur", () => {
      // Delay hiding to allow for suggestion clicks
      setTimeout(() => (this.suggestionsContainer.style.display = "none"), 200);
    });

    // Handle form data event for additional parameters
    this.form.addEventListener("formdata", (e) => {
      const formData = e.formData;
      formData.set("address", this.currentAddress);
    });
  }

  async handleAddressInput(event) {
    const address = event.target.value;
    this.currentAddress = address;
    this.clearError();

    if (address.length < 3) {
      this.suggestionsContainer.style.display = "none";
      return;
    }

    try {
      const suggestions = await this.getSuggestions(address);
      this.suggestions = suggestions;
      this.showSuggestions(suggestions);
    } catch (error) {
      console.error("Error getting address suggestions:", error);
      this.showError("Failed to fetch address suggestions");
    }
  }

  async getSuggestions(address) {
    const response = await fetch(`${this.config.apiEndpoint}/api/address-suggestions?address=${encodeURIComponent(address)}`);
    if (!response.ok) throw new Error("Failed to fetch suggestions");
    const data = await response.json();
    return data.suggestions || [];
  }

  showSuggestions(suggestions) {
    this.suggestionsContainer.innerHTML = "";

    if (!suggestions.length) {
      this.suggestionsContainer.style.display = "none";
      return;
    }

    suggestions.forEach((suggestion) => {
      const div = document.createElement("div");
      div.className = "ffep-suggestion";
      div.textContent = suggestion.text || suggestion;
      div.addEventListener("click", () => this.handleSuggestionSelect(suggestion.text || suggestion));
      this.suggestionsContainer.appendChild(div);
    });

    this.suggestionsContainer.style.display = "block";
  }

  handleSuggestionSelect(address) {
    this.currentAddress = address;
    this.addressInput.value = address;
    this.suggestionsContainer.style.display = "none";
    this.clearError();

    // Auto-submit if enabled
    if (this.config.autoSubmit && typeof this.form.requestSubmit === "function") {
      this.form.requestSubmit();
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!this.currentAddress.trim()) {
      this.showError("Please enter an address");
      return;
    }

    // Call onSubmit callback if provided
    if (this.config.onSubmit) {
      await this.config.onSubmit(this.currentAddress);
    }

    // Submit the form
    this.form.submit();
  }

  showError(message) {
    this.errorElement.textContent = message;
    this.errorElement.style.display = "block";
  }

  clearError() {
    this.errorElement.style.display = "none";
    this.errorElement.textContent = "";
  }
}

// Export for module usage
export default FFEP;

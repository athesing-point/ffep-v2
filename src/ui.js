/**
 * Sets up the autocomplete input field and suggestion container event listeners.
 * @param {object} ffepInstance - The main FFEP class instance.
 */
export function setupAutocomplete(ffepInstance) {
  // Find existing autocomplete container created in Webflow
  ffepInstance.autocompleteContainer = document.querySelector(".ffep-autocomplete");
  if (!ffepInstance.autocompleteContainer) {
    // console.error("Autocomplete container with class 'ffep-autocomplete' not found");
    return; // Don't attach listeners if container missing
  }

  // Setup input event listeners
  ffepInstance.addressInput.addEventListener("input", ffepInstance.handleInput.bind(ffepInstance));
  ffepInstance.addressInput.addEventListener("keydown", handleKeydown.bind(null, ffepInstance)); // Bind instance for context
  ffepInstance.addressInput.addEventListener("focus", handleFocus.bind(null, ffepInstance)); // Bind instance
  document.addEventListener("click", handleClickOutside.bind(null, ffepInstance)); // Bind instance
  // Note: Mouseover is handled per-suggestion element in showSuggestions
}

/**
 * Displays the suggestion list.
 * @param {object} ffepInstance - The main FFEP class instance.
 */
export function showSuggestions(ffepInstance) {
  // console.log("Showing suggestions:", ffepInstance.suggestions);
  if (!ffepInstance.suggestions || !ffepInstance.suggestions.length) {
    hideSuggestions(ffepInstance);
    return;
  }

  if (!ffepInstance.autocompleteContainer) return;

  const html = ffepInstance.suggestions
    .map(
      (suggestion, index) => `
      <div class="ffep-suggestion" data-index="${index}" role="option" aria-selected="false">
        ${suggestion.street_line}, ${suggestion.city}, ${suggestion.state} ${suggestion.zipcode}
      </div>
    `
    )
    .join("");

  ffepInstance.autocompleteContainer.innerHTML = html;
  ffepInstance.autocompleteContainer.style.display = "block";
  ffepInstance.isAutocompleteVisible = true;
  ffepInstance.selectedIndex = -1; // Reset selection index

  // Add event listeners to each suggestion
  ffepInstance.autocompleteContainer.querySelectorAll(".ffep-suggestion").forEach((el) => {
    el.addEventListener("click", () => {
      clearHoverStates(ffepInstance);
      const index = parseInt(el.dataset.index);
      if (!isNaN(index)) {
        selectSuggestion(ffepInstance, index);
      } else {
        console.error("Invalid index found on suggestion element:", el);
      }
    });

    el.addEventListener("mouseover", () => {
      clearHoverStates(ffepInstance);
      el.classList.add("hover");
      const index = parseInt(el.dataset.index);
      if (!isNaN(index)) {
        ffepInstance.selectedIndex = index; // Update index for potential Enter press
      }
    });

    el.addEventListener("mouseout", () => {
      el.classList.remove("hover");
      // Consider resetting selectedIndex if mouse leaves container entirely
    });
  });
}

/**
 * Hides the suggestion list.
 * @param {object} ffepInstance - The main FFEP class instance.
 */
export function hideSuggestions(ffepInstance) {
  if (ffepInstance.autocompleteContainer) {
    ffepInstance.autocompleteContainer.style.display = "none";
    ffepInstance.autocompleteContainer.innerHTML = ""; // Clear suggestions
  }
  ffepInstance.isAutocompleteVisible = false;
  ffepInstance.selectedIndex = -1;
}

/**
 * Clears hover states from suggestions.
 * @param {object} ffepInstance - The main FFEP class instance.
 */
function clearHoverStates(ffepInstance) {
  if (!ffepInstance.autocompleteContainer) return;
  ffepInstance.autocompleteContainer.querySelectorAll(".ffep-suggestion.hover").forEach((el) => {
    el.classList.remove("hover");
    el.setAttribute("aria-selected", "false");
  });
}

/**
 * Navigates suggestions using arrow keys.
 * @param {object} ffepInstance - The main FFEP class instance.
 * @param {number} direction - +1 for down, -1 for up.
 */
function navigateSuggestions(ffepInstance, direction) {
  if (!ffepInstance.autocompleteContainer) return;
  const suggestions = ffepInstance.autocompleteContainer.querySelectorAll(".ffep-suggestion");
  if (!suggestions.length) {
    ffepInstance.selectedIndex = -1;
    return;
  }

  let newIndex = ffepInstance.selectedIndex + direction;

  // Wrap around logic
  if (newIndex < -1) {
    // Allow going "up" from first item to input state (-1)
    newIndex = suggestions.length - 1;
  } else if (newIndex >= suggestions.length) {
    newIndex = -1; // Allow going "down" from last item to input state (-1)
  }
  // No extra check needed for newIndex === -1 && direction === -1, handled by wrap logic

  ffepInstance.selectedIndex = newIndex;
}

/**
 * Updates the visual highlight on suggestions based on selectedIndex.
 * @param {object} ffepInstance - The main FFEP class instance.
 */
function updateHighlight(ffepInstance) {
  if (!ffepInstance.autocompleteContainer) return;
  const suggestions = ffepInstance.autocompleteContainer.querySelectorAll(".ffep-suggestion");

  suggestions.forEach((el, index) => {
    el.classList.remove("hover");
    el.setAttribute("aria-selected", "false");
    if (index === ffepInstance.selectedIndex) {
      el.classList.add("hover");
      el.setAttribute("aria-selected", "true");
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
  // Removed optional input value update during navigation
}

/**
 * Handles selecting a suggestion (click or Enter).
 * @param {object} ffepInstance - The main FFEP class instance.
 * @param {number} index - The index of the suggestion to select.
 */
export function selectSuggestion(ffepInstance, index) {
  if (index >= 0 && index < ffepInstance.suggestions.length) {
    const selectedSuggestion = ffepInstance.suggestions[index];
    if (selectedSuggestion) {
      const addressValue = `${selectedSuggestion.street_line}, ${selectedSuggestion.city}, ${selectedSuggestion.state} ${selectedSuggestion.zipcode}`;
      ffepInstance.addressInput.value = addressValue; // Update input field
      ffepInstance.lastQuery = addressValue; // Update last query
      hideSuggestions(ffepInstance); // Hide autocomplete

      // Trigger form submission/navigation logic from the main instance
      ffepInstance.triggerFormSubmit(); // Call the method responsible for navigation
    } else {
      console.error(`Suggestion at index ${index} is invalid.`);
      hideSuggestions(ffepInstance);
    }
  } else {
    console.error(`Invalid index ${index} for selectSuggestion.`);
    hideSuggestions(ffepInstance);
  }
}

/**
 * Handles keydown events on the address input for navigation and selection.
 * @param {object} ffepInstance - The main FFEP class instance.
 * @param {Event} e - The keydown event.
 */
function handleKeydown(ffepInstance, e) {
  if (!ffepInstance.isAutocompleteVisible) {
    // Form submission on Enter when autocomplete is hidden is handled in setupFormHandling
    return;
  }

  if (!ffepInstance.autocompleteContainer) return;
  const suggestions = ffepInstance.autocompleteContainer.querySelectorAll(".ffep-suggestion");
  if (!suggestions || suggestions.length === 0) return;

  switch (e.key) {
    case "ArrowUp":
    case "ArrowDown":
      e.preventDefault(); // Prevent cursor move/scroll
      navigateSuggestions(ffepInstance, e.key === "ArrowUp" ? -1 : 1);
      updateHighlight(ffepInstance);
      break;
    case "Enter":
      e.preventDefault(); // Prevent default form submission
      if (ffepInstance.selectedIndex !== -1) {
        selectSuggestion(ffepInstance, ffepInstance.selectedIndex);
      } else {
        // If suggestions visible but none selected, trigger submit with current input
        hideSuggestions(ffepInstance);
        ffepInstance.triggerFormSubmit(); // Use the main instance method
      }
      break;
    case "Escape":
      e.preventDefault();
      hideSuggestions(ffepInstance);
      break;
    default:
      // Allow other keys for input modification
      break;
  }
}

/**
 * Handles clicks outside the input and autocomplete container to hide suggestions.
 * @param {object} ffepInstance - The main FFEP class instance.
 * @param {Event} e - The click event.
 */
function handleClickOutside(ffepInstance, e) {
  if (ffepInstance.addressInput && !ffepInstance.addressInput.contains(e.target) && ffepInstance.autocompleteContainer && !ffepInstance.autocompleteContainer.contains(e.target)) {
    hideSuggestions(ffepInstance);
  }
}

/**
 * Handles the focus event on the address input.
 * Shows cached suggestions if available and input meets criteria.
 * @param {object} ffepInstance - The main FFEP class instance.
 * @param {Event} e - The focus event.
 */
async function handleFocus(ffepInstance, e) {
  const query = e.target.value;
  // Only show suggestions on focus if input valid and not already visible
  if (query.length >= 3 && !ffepInstance.isAutocompleteVisible) {
    try {
      const cacheKey = query.toLowerCase();
      const cachedResults = ffepInstance.cacheManager.getCachedItem(cacheKey);

      if (cachedResults && cachedResults.length > 0) {
        // console.log(`Reshowing cached results for: ${query} on focus`);
        ffepInstance.suggestions = cachedResults;
        showSuggestions(ffepInstance);
      } else {
        // Optional: Fetch if cache miss on focus (currently disabled)
        // const suggestions = await ffepInstance.debouncedFetchSuggestions(query);
        // if (suggestions && suggestions.length > 0) {
        //     ffepInstance.suggestions = suggestions;
        //     showSuggestions(ffepInstance);
        // }
      }
    } catch (error) {
      console.error("Error handling focus event:", error);
      if (ffepInstance.errorElement) {
        ffepInstance.errorElement.textContent = "Error retrieving suggestions.";
        ffepInstance.errorElement.style.display = "block";
      }
    }
  } else if (query.length < 3) {
    hideSuggestions(ffepInstance);
  }
}

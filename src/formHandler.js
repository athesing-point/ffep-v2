/**
 * Sets up event listeners for form submission (button click and Enter key).
 * It relies on the main FFEP instance to check autocomplete visibility
 * and to trigger the actual submission logic.
 *
 * @param {object} ffepInstance - The main FFEP class instance.
 */
export function setupFormEventListeners(ffepInstance) {
  // console.log("Setting up form handling event listeners...");

  // Handle submit button click
  if (ffepInstance.submitButton) {
    ffepInstance.submitButton.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent default anchor tag behavior
      // console.log("Submit button clicked via formHandler. Autocomplete visible?", ffepInstance.isAutocompleteVisible);
      // Only submit if autocomplete is not showing suggestions
      if (!ffepInstance.isAutocompleteVisible) {
        ffepInstance.triggerFormSubmit(); // Call the main instance's submit logic
      }
    });
  } else {
    console.warn("Submit button (#ffep-submit) not found. Form submission via button click disabled.");
  }

  // Handle enter key on input
  if (ffepInstance.addressInput) {
    ffepInstance.addressInput.addEventListener("keydown", (e) => {
      // console.log(`Keydown on input via formHandler: ${e.key}. Autocomplete visible? ${ffepInstance.isAutocompleteVisible}`);
      // Let the ui.js handleKeydown manage Enter when autocomplete is visible
      if (ffepInstance.isAutocompleteVisible) {
        return; // ui.js keydown handler takes precedence for selection/submission
      }

      // Handle Enter for submission ONLY when autocomplete is hidden
      if (e.key === "Enter") {
        // console.log("Enter pressed (autocomplete hidden) via formHandler. Triggering submit.");
        e.preventDefault(); // Prevent potential default form submission
        ffepInstance.triggerFormSubmit(); // Call the main instance's submit logic
      }
    });
  } else {
    // This case should theoretically not happen if init succeeded
    console.error("Address input not found during form handler setup.");
  }
  // console.log("Form handling event listeners setup complete.");
}

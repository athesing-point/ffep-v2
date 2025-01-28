import FFEP from "./ffep.js";
import "./styles.css";

// Initialize FFEP when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const ffep = new FFEP({
    // Required configuration
    ffepTarget: "https://your-api-endpoint.com/submit",
    apiEndpoint: "https://your-worker.workers.dev",

    // Optional configuration
    autoSubmit: true, // Set to false to disable auto-submit on suggestion select

    // Optional callback when form is submitted
    onSubmit: async (address) => {
      // You can add custom tracking here
      if (window.posthog) {
        window.posthog.capture("ffep_form_submit", {
          address: address,
        });
      }
    },
  });
});

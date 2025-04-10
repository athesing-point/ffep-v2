// Enhanced debounce function with variable wait time
export function debounce(func, getWaitTime) {
  let timeout;
  return function executedFunction(...args) {
    return new Promise((resolve) => {
      const later = async () => {
        clearTimeout(timeout);
        try {
          // Add try-catch within the debounced function
          resolve(await func.apply(this, args));
        } catch (error) {
          console.error("Error in debounced function execution:", error);
          // Decide how to handle the error, e.g., resolve with null or reject
          resolve(null); // Or reject(error);
        }
      };
      clearTimeout(timeout);
      // Ensure getWaitTime is called correctly and handles potential errors
      let wait = 200; // Default wait time
      try {
        const query = args[0]; // Assuming the first arg is the query
        wait = typeof getWaitTime === "function" ? getWaitTime(query) : getWaitTime;
        if (isNaN(wait) || wait < 0) {
          console.warn("Invalid wait time calculated, using default 200ms");
          wait = 200;
        }
      } catch (error) {
        console.error("Error getting wait time for debounce:", error);
        // Use default wait time if calculation fails
      }

      timeout = setTimeout(later, wait);
    });
  };
}

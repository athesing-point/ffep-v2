# FFEP Client-Side

A lightweight, zero-dependency address autocomplete component for PDC aiming to replace the original FFEP.js version.

## Features

- **Debounce Functionality**: Limits API calls while typing using a debounce mechanism.
- **Cache Management**: Efficiently stores and retrieves suggestions with a maximum of 50 cache items (stored in session storage).
- **API Key Management**: Automatically selects API keys based on the environment (routes to production or development).
- **Autocomplete Functionality**: Manages suggestion visibility, navigation, and selection (powered by Smartystreets API).
- **Keyboard Accessibility**: Allows users to navigate suggestions using the arrow keys and select using enter.
- **Auto Form Submission**: Enables form submission when a valid address is selected.

## Testing

You can test the component at https://www.point.dev/dev/ffepv2 (password: pdc-dev). Console logs for cache testing/api call counts are currently enabled for debugging purposes (will be disabled when released).

To test the component:

- Enter an address (auto completions should appear)
- Select a suggestion with the arrow keys and enter
- Select a suggestion with a mouse click
- Form should auto-submit if you have entered a valid address

## Questions and Feedback

- **Handling Invalid Addresses**: What should happen if a user submits an invalid address? Does the endpoint handle it? Should they receive an error or be redirected to home.point.com?

- **Error and Edge Case Handling**: Are there any concerns about how errors and edge cases are currently handled? What improvements would you suggest?

- **API Key Exposure**: Is the exposure of URL-scoped API keys a concern, given they are restricted to specific domains (e.g., https://www.point.dev/ or point.com)?

- **Cache/API Call Functions**: Do you have any suggestions or concerns about the current cache and API call escape mechanisms? What changes would you recommend?

# FFEP Client-Side

A lightweight, zero-dependency address autocomplete component for PDC aiming to replace the original FFEP.js version.

## Features

- **Debounce Functionality**: Limits API calls while typing using a debounce mechanism.
- **Cache Management**: Efficiently stores and retrieves suggestions with a maximum of 50 cache items (stored in session storage).
- **API Key Management**: Automatically selects API keys based on the environment (routes to production or development).
- **Autocomplete Functionality**: Manages suggestion visibility, navigation, and selection (powered by Smartystreets API).
- **Keyboard Accessibility**: Allows users to navigate suggestions using the arrow keys and select using enter.
- **Auto Form Submission**: Enables form submission when a valid address is selected.

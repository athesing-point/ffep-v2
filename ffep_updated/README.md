# FFEP (Flexible Form Entry Point)

A lightweight, vanilla JavaScript implementation of the FFEP form with address validation and suggestions.

## Features

- No React dependencies
- Lightweight bundle size
- Address validation and suggestions
- Cloudflare Workers integration for API security
- PostHog tracking integration (optional)
- Webflow-compatible

## Installation

1. Install dependencies:

```bash
npm install
```

2. Build the project:

```bash
# Production build
NODE_ENV=production npm run build

# Development build with watch mode
npm run watch

# Development server
npm run serve
```

## Usage in Webflow

1. Add the bundled script to your Webflow site:

```html
<script src="path/to/ffep.min.js"></script>
```

2. Add the required data attributes to your form elements:

```html
<form data-ffep="form">
  <input data-ffep="address" name="address" placeholder="Enter your address" />
  <button type="submit">Submit</button>
</form>
```

3. Configure the FFEP instance in your site's custom code:

```html
<script>
  document.addEventListener("DOMContentLoaded", () => {
    const ffep = new FFEP({
      ffepTarget: "YOUR_API_ENDPOINT",
      apiEndpoint: "YOUR_CLOUDFLARE_WORKER_URL",
    });
  });
</script>
```

## Configuration Options

- `ffepTarget`: The endpoint where the form will be submitted
- `apiEndpoint`: Your Cloudflare Worker URL for address validation
- `autoSubmit`: Whether to auto-submit after selecting an address (default: true)
- `onSubmit`: Callback function called before form submission

## Development

- `npm run build`: Create a production build
- `npm run watch`: Watch mode for development
- `npm run serve`: Start development server

## Bundle Size

The production build is approximately 10KB minified and gzipped.

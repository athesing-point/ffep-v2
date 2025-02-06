# FFEP Client-Side Version

A lightweight, zero-dependency address autocomplete component that can be added to any website.

## Quick Start

1. Copy the `src/ffep.js` file to your project
2. Include it in your HTML:

```html
<script src="path/to/ffep.js"></script>
```

3. Add the required HTML structure:

```html
<form data-ffep="form">
  <div class="ffep-input-wrapper">
    <input type="text" data-ffep="address" placeholder="Enter your address..." autocomplete="off" />
    <div class="ffep-autocomplete"></div>
  </div>
</form>
```

4. Add the required CSS (see example.html for full styles)
5. Configure your Smarty Streets API keys in the ffep.js file

## Development

To test locally, run:

```bash
npm start
```

This will start a local server at <http://localhost:8000>

## Required CSS Classes

The following CSS classes are required:

- `.ffep-input-wrapper`: Container for the input and autocomplete
- `.ffep-autocomplete`: Container for suggestions
- `.ffep-suggestion`: Individual suggestion items

See example.html for the complete styling.

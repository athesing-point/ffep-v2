# FFEP Client-Side Version

A lightweight, zero-dependency address autocomplete component that can be added to any website.

## Quick Start (Using Pre-built Version)

1. Copy the minified script from `dist/ffep.min.js` to your project
2. Include it in your HTML:

```html
<script src="path/to/ffep.min.js"></script>
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

## Development Setup

### Prerequisites

1. **Install Bun**

   Choose your platform:

   **macOS or Linux:**

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

   **Windows:**
   First install WSL2, then run the above command in your WSL2 terminal.

   Verify installation:

   ```bash
   bun --version
   ```

2. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd ffep-v2-client
   ```

3. **Install dependencies:**
   ```bash
   bun install
   ```

### Development Workflow

1. **Start development server with hot reload:**

   ```bash
   bun dev
   ```

   This will:

   - Watch for changes in the `src` directory
   - Automatically rebuild when files change
   - Output the bundle to `dist/ffep.min.js`

2. **Test the component:**
   ```bash
   bun start
   ```
   This will start a local server at http://localhost:8000 where you can test the component.

### Build Commands

- `bun run build` - Build for development
- `bun run build:prod` - Build for production (minified)
- `bun run build:prod:watch` - Build for production with watch mode
- `bun run clean` - Clean the dist directory

## Required CSS Classes

The following CSS classes are required:

- `.ffep-input-wrapper`: Container for the input and autocomplete
- `.ffep-autocomplete`: Container for suggestions
- `.ffep-suggestion`: Individual suggestion items

See example.html for the complete styling.

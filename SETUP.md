# Quick Setup Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Run Simple Test (Optional)
```bash
npm run test:simple
```

### 4. Run Full Example
```bash
npm run example
```

## 🔧 Development Commands

### Build & Verify
```bash
npm run build:check    # Full build verification
npm run lint          # TypeScript type checking
npm run clean         # Clean build artifacts
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:simple   # Quick engine test
```

### Examples
```bash
npm run example         # Basic example
npm run example:complex # Advanced features
```

## 📁 Project Structure

```
src/
├── core/              # Main engine components
├── formatters/        # Built-in formatters
├── utils/            # Utility functions
├── types/            # TypeScript definitions
└── index.ts          # Main exports

examples/             # Usage examples
tests/               # Test files
dist/                # Build output (after npm run build)
```

## 🐛 Troubleshooting

### Build Errors
1. Ensure Node.js 16+ is installed
2. Delete `node_modules` and run `npm install`
3. Run `npm run clean && npm run build`

### Type Errors
- Run `npm run lint` to check TypeScript issues
- Ensure all imports use `/index` suffix for types

### Missing Dependencies
- Core dependencies are in `package.json`
- Optional: `canvas` and `chart.js` for chart support

## ✅ Verification

After setup, you should see:
- ✅ TypeScript compilation successful
- ✅ `dist/` folder created
- ✅ `dist/index.js` and `dist/index.d.ts` exist
- ✅ Simple test passes

## 🎯 Next Steps

1. Check `examples/` for usage patterns
2. Read the main `README.md` for full documentation
3. Explore the API in `src/types/index.ts`
4. Run tests with `npm test`

## 🔗 Key Files

- `src/core/TemplateEngine.ts` - Main engine class
- `src/types/index.ts` - Type definitions
- `examples/basic-example.ts` - Simple usage
- `examples/complex-example.ts` - Advanced features
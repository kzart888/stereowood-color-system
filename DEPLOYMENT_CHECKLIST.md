# Deployment Checklist for STEREOWOOD Color System

## Overview
This checklist ensures proper configuration when switching between development and production environments.

## Environment-Specific Settings

### Development Mode (for testing/automation)
Used when running Playwright tests or during development to reduce context usage.

```javascript
// In frontend/js/components/*.js files:
itemsPerPage: 3  // Reduced pagination for less context
```

### Production Mode  
Used for actual user-facing deployment.

```javascript
// In frontend/js/components/*.js files:
itemsPerPage: 12  // Normal pagination for better UX
```

## Files Requiring Updates

| File | Line | Dev Value | Prod Value | Purpose |
|------|------|-----------|------------|---------|
| `frontend/js/components/custom-colors.js` | 476 | `itemsPerPage: 3` | `itemsPerPage: 12` | Custom colors grid |
| `frontend/js/components/mont-marte.js` | 304 | `itemsPerPage: 3` | `itemsPerPage: 12` | Materials grid |
| `frontend/js/components/artworks.js` | 566 | `itemsPerPage: 3` | `itemsPerPage: 12` | Artworks grid |

## Quick Switch Methods

### Method 1: URL Parameter (Recommended for Testing)
Add `?test=true` to the URL to trigger test mode:
```
http://localhost:9099/?test=true
```

### Method 2: Environment Detection (Automatic)
The system can automatically detect Playwright/automation tools:

```javascript
// Add to each component's data() function:
data() {
    const isTestMode = window.location.search.includes('test=true') || 
                       window.navigator.userAgent.includes('Playwright');
    return {
        itemsPerPage: isTestMode ? 3 : 12,
        // ... other data
    }
}
```

### Method 3: Global Configuration Variable
Add to `frontend/index.html` before other scripts:

```html
<script>
    // Set to true for development/testing, false for production
    window.STEREOWOOD_TEST_MODE = false;
</script>
```

Then in components:
```javascript
itemsPerPage: window.STEREOWOOD_TEST_MODE ? 3 : 12
```

## Pre-Deployment Checklist

Before deploying to production:

- [ ] Set all `itemsPerPage` values to 12 (or desired production value)
- [ ] Remove or set `STEREOWOOD_TEST_MODE = false` if using Method 3
- [ ] Test that pagination shows 12 items per page
- [ ] Verify no test-specific code remains
- [ ] Clear browser cache to ensure fresh assets

## Post-Deployment Verification

After deployment:

1. Open the application without any URL parameters
2. Navigate to Custom Colors page - should show 12 items
3. Navigate to Mont-Marte page - should show 12 items  
4. Navigate to Artworks page - should show 12 items
5. Verify pagination controls work correctly

## Rollback Instructions

If issues occur after deployment:

1. Revert itemsPerPage values back to previous settings
2. Clear browser cache
3. Restart the server: `npm start`

## Why This Matters

- **Development**: 3 items per page = ~2,500 tokens per Playwright snapshot
- **Production**: 12 items per page = ~10,000 tokens (but better UX)
- **Impact**: 75% reduction in context usage during automated testing

## Notes

- The pagination value directly affects how much data Playwright captures
- Lower values (2-3) are better for testing but worse for user experience
- Consider implementing dynamic detection (Method 2) for automatic switching
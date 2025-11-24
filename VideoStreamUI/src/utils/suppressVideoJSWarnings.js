// Suppress VideoJS duplicate plugin registration warnings
// This file should be imported before any VideoJS plugins to catch warnings early

if (!window.__videojsWarningSuppressed) {
  // Store original console methods
  const originalWarn = console.warn;
  const originalError = console.error;
  
  // Override console.warn to filter VideoJS plugin warnings
  console.warn = function(...args) {
    // Check all arguments for the VideoJS qualityLevels warning
    const message = args.map(arg => String(arg)).join(' ');
    if (message.includes('VIDEOJS') && 
        message.includes('qualityLevels') && 
        message.includes('already exists')) {
      // Suppress this specific warning
      return;
    }
    // Pass through all other warnings
    originalWarn.apply(console, args);
  };
  
  // Mark as suppressed to prevent multiple overrides
  window.__videojsWarningSuppressed = true;
  
  // Restore on page unload (optional cleanup)
  window.addEventListener('beforeunload', () => {
    console.warn = originalWarn;
    console.error = originalError;
  });
}

export default {};


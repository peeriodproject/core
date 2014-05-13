require('blanket')({
  // Only files that match the pattern will be instrumented
  pattern: /\/src\//,
  "data-cover-never": "node_modules"
});

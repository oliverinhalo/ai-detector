import '@testing-library/jest-dom/vitest';

// Tests must never depend on a real clock, a real random, or leftover storage.
beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

if (typeof Element !== 'undefined') Element.prototype.scrollIntoView = () => {};

import { vi } from 'vitest';

// Global test setup — runs before every test file
// Keep this minimal: only things that truly need to be global

// Silence expected console.error calls in tests (audit failures, etc.)
// Individual tests can spy on console.error if they need to assert it was called
vi.spyOn(console, 'error').mockImplementation(() => {});

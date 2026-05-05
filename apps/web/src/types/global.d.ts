// Project-wide ambient declarations.
// Loaded by tsconfig include glob; do not duplicate inside component files.

export {};

declare global {
  interface Window {
    posthog?: {
      capture?: (event: string, props?: Record<string, unknown>) => void;
    };
  }
}

"use client";
// Catches everything else

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service like Sentry
    console.error("Global System Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 bg-background">
      <h2 className="text-headline-md text-foreground mb-4">System Error</h2>
      <p className="text-body-inter text-muted-foreground max-w-md mb-8">
        An unexpected error occurred. The technical team has been notified and
        is working to resolve it.
      </p>
      <button
        onClick={() => reset()}
        className="bg-foreground text-background px-6 py-3 rounded-md text-body-inter font-semibold hover:bg-muted-foreground transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

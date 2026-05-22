// Catches everything else
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 bg-background">
      <AlertTriangle className="w-16 h-16 text-muted-foreground mb-6" />
      <h1 className="text-hero text-foreground mb-4">404</h1>
      <h2 className="text-headline-md text-foreground mb-2">Page Not Found</h2>
      <p className="text-body-inter text-muted-foreground max-w-md mb-8">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground px-6 py-3 rounded-md text-body-inter font-semibold hover:bg-destructive transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}

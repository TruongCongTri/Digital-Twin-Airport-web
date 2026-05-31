// app/page.tsx
import { ClientPageRoot } from "./client-page";

// 🔥 THIS is the magic line that stops Vercel from hanging forever.
// It forces Next.js to skip build-time static generation for this route.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <ClientPageRoot />;
}

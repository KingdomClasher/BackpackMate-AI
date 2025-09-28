import { AppShell } from "@/components/layout/AppShell";

// Force dynamic rendering to avoid static generation issues with client components
export const dynamic = 'force-dynamic';

export default function Home() {
  return <AppShell />;
}

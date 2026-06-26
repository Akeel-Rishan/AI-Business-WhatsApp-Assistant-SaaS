import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function PageLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <LoadingSpinner size="lg" />
    </main>
  );
}

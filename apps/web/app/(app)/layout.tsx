import { AppNav } from '@/components/nav/app-nav';
import { SseListener } from '@/components/sse-listener';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SseListener />
      <AppNav />
      <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
    </>
  );
}

import { SaveForm } from '@/components/save-form';

export const metadata = { title: 'save' };

export default function SavePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="font-mono text-2xl tracking-tight">save</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        paste any url. extraction runs in the background.
      </p>
      <SavePromise searchParams={searchParams} />
    </main>
  );
}

async function SavePromise({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const sp = await searchParams;
  return <SaveForm initialUrl={sp.url ?? ''} />;
}

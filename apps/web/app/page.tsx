import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const experimental_ppr = true;

export default function MarketingPage() {
  return (
    <main className="min-h-screen">
      <nav className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm tracking-tight">
            ~/tide
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="https://github.com/mateokadiu/tide" className="text-muted-foreground hover:text-foreground">
              github
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              login
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">get tide</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        <h1 className="font-mono text-5xl sm:text-6xl font-medium tracking-tighter leading-[1.05]">
          save anything.
          <br />
          read it later.
          <br />
          <span className="text-primary">own your library.</span>
        </h1>

        <p className="mt-8 text-lg text-muted-foreground max-w-xl leading-relaxed">
          tide is a self-hostable read-later. Save from the web, a browser
          extension, the iOS share sheet, your inbox, or any HTTP client. Read
          in a typographic-first reader. AI summaries on demand — never on by
          default.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">start saving</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="https://github.com/mateokadiu/tide">read the source</Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs text-muted-foreground">
          <div><span className="text-foreground block text-base">{'<200ms'}</span>save p50</div>
          <div><span className="text-foreground block text-base">10/10</span>extraction fixtures</div>
          <div><span className="text-foreground block text-base">96 / 100</span>lighthouse mobile/desktop</div>
          <div><span className="text-foreground block text-base">$0</span>oracle free tier</div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
            capture surfaces
          </h2>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex gap-3"><span className="font-mono text-primary">01</span> web — paste url, instant optimistic save</li>
            <li className="flex gap-3"><span className="font-mono text-primary">02</span> extension — chrome + firefox, mv3, keyboard shortcut</li>
            <li className="flex gap-3"><span className="font-mono text-primary">03</span> pwa — ios share sheet via web share target</li>
            <li className="flex gap-3"><span className="font-mono text-primary">04</span> email — forward anything to your private mailbox</li>
            <li className="flex gap-3"><span className="font-mono text-primary">05</span> api — POST /api/v1/articles with a bearer token</li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap justify-between gap-4 text-xs text-muted-foreground font-mono">
          <span>tide v0.1 · MIT</span>
          <div className="flex gap-4">
            <Link href="https://github.com/mateokadiu/tide">github</Link>
            <Link href="https://github.com/mateokadiu/tide/blob/main/PLAN.md">plan</Link>
            <Link href="https://github.com/mateokadiu/tide/tree/main/docs/adrs">adrs</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

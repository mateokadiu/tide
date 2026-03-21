'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function IntegrationsPanel({ inboundEmail }: { inboundEmail: string }) {
  function copy(s: string) {
    void navigator.clipboard.writeText(s);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>capture surfaces</CardTitle>
        <CardDescription>forward, share, or post to any of these.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            email-to-save
          </p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{inboundEmail}</code>
            <Button variant="ghost" size="sm" onClick={() => copy(inboundEmail)}>
              copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            forward any article to this address. only the first link in the body or subject is saved.
          </p>
        </div>

        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            browser extension
          </p>
          <p className="text-sm text-muted-foreground">
            install from{' '}
            <a
              href="https://github.com/mateokadiu/tide/releases"
              className="text-foreground underline underline-offset-4"
            >
              releases
            </a>
            . sideload during dev with{' '}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">chrome://extensions</code>
            .
          </p>
        </div>

        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            ios share sheet
          </p>
          <p className="text-sm text-muted-foreground">
            add tide to your home screen on iphone. the share sheet picks up the PWA share target.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

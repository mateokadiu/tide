'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ReaderDefaults() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>reader</CardTitle>
        <CardDescription>change defaults from inside any reader view (Aa button).</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          your reader preferences are stored locally and synced with each article you open.
          to reset, clear <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">tide.reader</code> from local storage.
        </p>
      </CardContent>
    </Card>
  );
}

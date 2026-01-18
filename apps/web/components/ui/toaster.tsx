'use client';

import * as React from 'react';
import * as Toast from '@radix-ui/react-toast';
import { cn } from '@/lib/utils/cn';

type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

const ToastContext = React.createContext<{
  toast: (t: Omit<ToastMessage, 'id'>) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within Toaster');
  return ctx;
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback((t: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {messages.map((m) => (
          <Toast.Root
            key={m.id}
            className={cn(
              'fixed bottom-4 right-4 z-50 grid gap-1 rounded-md border border-border bg-card px-4 py-3 shadow-lg',
              m.variant === 'destructive' && 'border-destructive/40',
            )}
          >
            <Toast.Title className="text-sm font-medium">{m.title}</Toast.Title>
            {m.description ? (
              <Toast.Description className="text-xs text-muted-foreground">
                {m.description}
              </Toast.Description>
            ) : null}
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

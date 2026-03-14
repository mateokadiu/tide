'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  archiveArticle,
  starArticle,
  togglePublic,
  markRead,
} from '@/app/reader/[id]/actions';

interface Props {
  articleId: string;
  isArchived: boolean;
  isStarred: boolean;
  isPublic: boolean;
  publicSlug: string | null;
}

export function ReaderActions(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState({
    archived: props.isArchived,
    starred: props.isStarred,
    isPublic: props.isPublic,
  });

  function onArchive() {
    startTransition(async () => {
      const next = !state.archived;
      await archiveArticle(props.articleId, next);
      setState((s) => ({ ...s, archived: next }));
      router.push('/library');
    });
  }

  function onStar() {
    startTransition(async () => {
      const next = !state.starred;
      await starArticle(props.articleId, next);
      setState((s) => ({ ...s, starred: next }));
    });
  }

  function onShare() {
    startTransition(async () => {
      const result = await togglePublic(props.articleId);
      if (result.ok) {
        setState((s) => ({ ...s, isPublic: result.value.isPublic }));
        if (result.value.isPublic && result.value.slug) {
          const url = `${location.origin}/s/${result.value.slug}`;
          await navigator.clipboard.writeText(url).catch(() => {});
        }
      }
    });
  }

  function onRead() {
    startTransition(async () => {
      await markRead(props.articleId, true);
      router.push('/library');
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={onStar} disabled={isPending} aria-label="star">
        {state.starred ? '★' : '☆'}
      </Button>
      <Button variant="ghost" size="sm" onClick={onShare} disabled={isPending} aria-label="share">
        {state.isPublic ? 'public' : 'share'}
      </Button>
      <Button variant="ghost" size="sm" onClick={onRead} disabled={isPending}>
        mark read
      </Button>
      <Button variant="ghost" size="sm" onClick={onArchive} disabled={isPending}>
        {state.archived ? 'restore' : 'archive'}
      </Button>
    </div>
  );
}

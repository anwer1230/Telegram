import React from 'react';

export type SkeletonVariant =
  | 'incoming_short'
  | 'incoming_medium'
  | 'incoming_media'
  | 'outgoing_short'
  | 'outgoing_medium'
  | 'date_badge';

export const SKELETON_HEIGHTS: Record<SkeletonVariant, number> = {
  date_badge: 36,
  incoming_short: 64,
  incoming_medium: 84,
  incoming_media: 172,
  outgoing_short: 58,
  outgoing_medium: 88,
};

interface MessageSkeletonRowProps {
  variant: SkeletonVariant;
  id?: string;
  className?: string;
}

export const MessageSkeletonRow: React.FC<MessageSkeletonRowProps> = React.memo(
  ({ variant, className = '' }) => {
    if (variant === 'date_badge') {
      return (
        <div
          className={`flex items-center justify-center py-1.5 px-4 w-full select-none ${className}`}
          style={{ height: SKELETON_HEIGHTS.date_badge }}
        >
          <div className="h-6 w-28 rounded-full bg-black/40 border border-white/5 flex items-center justify-center tg-skeleton-shimmer">
            <div className="h-2.5 w-16 bg-white/20 rounded-full" />
          </div>
        </div>
      );
    }

    if (variant === 'outgoing_short') {
      return (
        <div
          dir="ltr"
          className={`flex justify-end items-end px-3 py-1 w-full select-none ${className}`}
          style={{ height: SKELETON_HEIGHTS.outgoing_short }}
        >
          <div className="relative max-w-[220px] rounded-2xl rounded-br-xs px-3.5 py-2.5 bg-[var(--tg-theme-bubble-out,#7026b9)]/45 border border-[var(--tg-theme-bubble-out,#7026b9)]/30 tg-skeleton-shimmer shadow-sm">
            <div className="h-3 w-28 bg-white/35 rounded-md mb-2" />
            <div className="flex items-center justify-end gap-1.5 ml-auto">
              <div className="h-2 w-8 bg-white/25 rounded-xs" />
              <div className="h-2 w-3 bg-white/25 rounded-xs" />
            </div>
          </div>
        </div>
      );
    }

    if (variant === 'outgoing_medium') {
      return (
        <div
          dir="ltr"
          className={`flex justify-end items-end px-3 py-1 w-full select-none ${className}`}
          style={{ height: SKELETON_HEIGHTS.outgoing_medium }}
        >
          <div className="relative max-w-[300px] w-64 rounded-2xl rounded-br-xs px-3.5 py-2.5 bg-[var(--tg-theme-bubble-out,#7026b9)]/45 border border-[var(--tg-theme-bubble-out,#7026b9)]/30 tg-skeleton-shimmer shadow-sm">
            <div className="h-3 w-full bg-white/35 rounded-md mb-2" />
            <div className="h-3 w-3/5 bg-white/25 rounded-md mb-2" />
            <div className="flex items-center justify-end gap-1.5 ml-auto">
              <div className="h-2 w-8 bg-white/25 rounded-xs" />
              <div className="h-2 w-3 bg-white/25 rounded-xs" />
            </div>
          </div>
        </div>
      );
    }

    if (variant === 'incoming_media') {
      return (
        <div
          dir="ltr"
          className={`flex justify-start items-end gap-2 px-3 py-1 w-full select-none ${className}`}
          style={{ height: SKELETON_HEIGHTS.incoming_media }}
        >
          {/* Avatar skeleton */}
          <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 mb-1 tg-skeleton-shimmer border border-white/5" />
          <div className="relative w-64 rounded-2xl rounded-bl-xs p-2.5 bg-[var(--tg-theme-bubble-in,#222234)]/85 border border-white/5 tg-skeleton-shimmer shadow-sm">
            <div className="w-full h-24 rounded-xl bg-white/10 relative overflow-hidden flex items-center justify-center mb-2 tg-skeleton-shimmer">
              <div className="w-8 h-8 rounded-lg bg-white/15" />
            </div>
            <div className="h-3 w-3/4 bg-white/20 rounded-md mb-1.5" />
            <div className="h-2 w-8 bg-white/15 rounded-xs ml-auto" />
          </div>
        </div>
      );
    }

    if (variant === 'incoming_medium') {
      return (
        <div
          dir="ltr"
          className={`flex justify-start items-end gap-2 px-3 py-1 w-full select-none ${className}`}
          style={{ height: SKELETON_HEIGHTS.incoming_medium }}
        >
          {/* Avatar skeleton */}
          <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 mb-1 tg-skeleton-shimmer border border-white/5" />
          <div className="relative max-w-[280px] w-60 rounded-2xl rounded-bl-xs px-3.5 py-2.5 bg-[var(--tg-theme-bubble-in,#222234)]/85 border border-white/5 tg-skeleton-shimmer shadow-sm">
            <div className="h-3 w-full bg-white/25 rounded-md mb-2" />
            <div className="h-3 w-2/3 bg-white/15 rounded-md mb-2" />
            <div className="h-2 w-8 bg-white/15 rounded-xs ml-auto" />
          </div>
        </div>
      );
    }

    // Default incoming_short
    return (
      <div
        dir="ltr"
        className={`flex justify-start items-end gap-2 px-3 py-1 w-full select-none ${className}`}
        style={{ height: SKELETON_HEIGHTS.incoming_short }}
      >
        <div className="w-8 h-8 rounded-full bg-white/10 shrink-0 mb-1 tg-skeleton-shimmer border border-white/5" />
        <div className="relative max-w-[230px] rounded-2xl rounded-bl-xs px-3.5 py-2.5 bg-[var(--tg-theme-bubble-in,#222234)]/85 border border-white/5 tg-skeleton-shimmer shadow-sm">
          <div className="h-3 w-32 bg-white/25 rounded-md mb-2" />
          <div className="h-2 w-8 bg-white/15 rounded-xs ml-auto" />
        </div>
      </div>
    );
  }
);

MessageSkeletonRow.displayName = 'MessageSkeletonRow';

/**
 * Generates an organic, realistic list of skeleton message items
 * for virtualized insertion during pagination or history fetching.
 */
export function generateHistoryFetchSkeletons(batchPrefix: string = 'older'): Array<{
  type: 'skeleton';
  id: string;
  skeletonVariant: SkeletonVariant;
  estimatedHeight: number;
}> {
  const sequence: SkeletonVariant[] = [
    'date_badge',
    'incoming_medium',
    'incoming_media',
    'outgoing_short',
    'incoming_short',
    'outgoing_medium',
  ];

  return sequence.map((variant, index) => ({
    type: 'skeleton' as const,
    id: `skeleton_${batchPrefix}_${index}`,
    skeletonVariant: variant,
    estimatedHeight: SKELETON_HEIGHTS[variant],
  }));
}

/**
 * Full-screen skeleton thread for instant visual feedback
 * when a chat is first opened or loading initial messages.
 */
export const MessageThreadSkeleton: React.FC<{ count?: number }> = React.memo(
  ({ count = 7 }) => {
    const sequence: SkeletonVariant[] = [
      'date_badge',
      'incoming_medium',
      'outgoing_short',
      'incoming_media',
      'incoming_short',
      'outgoing_medium',
      'incoming_medium',
      'outgoing_short',
    ];

    return (
      <div
        id="tg-message-thread-skeleton"
        className="flex-1 w-full h-full flex flex-col justify-end p-3 gap-1 overflow-hidden pointer-events-none select-none"
        aria-label="Loading message history"
        role="status"
      >
        {sequence.slice(0, count).map((variant, idx) => (
          <MessageSkeletonRow key={`thread_skel_${idx}`} variant={variant} />
        ))}
      </div>
    );
  }
);

MessageThreadSkeleton.displayName = 'MessageThreadSkeleton';

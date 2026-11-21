"use client";

type Props = {
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
};

export default function NavButtons({ onBack, onForward, canGoBack, canGoForward }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Back"
        className="flex h-12 w-12 items-center justify-center border border-border-strong bg-foreground/[0.07] text-muted transition-colors enabled:hover:bg-foreground/[0.12] enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35 dark:bg-foreground/[0.14] dark:enabled:hover:bg-foreground/[0.2]"
      >
        <svg width="20" height="20" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path
            d="M9.5 3 5 7.5l4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={onForward}
        disabled={!canGoForward}
        aria-label="Forward"
        className="flex h-12 w-12 items-center justify-center border border-border-strong bg-foreground/[0.07] text-muted transition-colors enabled:hover:bg-foreground/[0.12] enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35 dark:bg-foreground/[0.14] dark:enabled:hover:bg-foreground/[0.2]"
      >
        <svg width="20" height="20" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path
            d="M5.5 3 10 7.5l-4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

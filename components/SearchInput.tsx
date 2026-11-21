"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function SearchInput({ value, onChange, disabled, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const isShortcut = (e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/";
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isShortcut && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <label className="search-cursor group flex w-full max-w-[260px] items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 transition-colors focus-within:border-accent sm:max-w-[280px]">
      <svg
        aria-hidden="true"
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        className="shrink-0 text-muted-2 transition-colors group-focus-within:text-accent"
      >
        <path
          d="M6.75 11.5a4.75 4.75 0 1 0 0-9.5 4.75 4.75 0 0 0 0 9.5Zm7 2-3.65-3.65"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder ?? "Search subjects, codes…"}
        className="w-full bg-transparent font-sans text-sm text-foreground placeholder:text-muted-2 focus:outline-none disabled:cursor-not-allowed"
      />
      <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-2 sm:inline-block">
        ⌘K
      </kbd>
    </label>
  );
}

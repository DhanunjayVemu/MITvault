"use client";

import type { ReactNode } from "react";

type Props = {
  active?: boolean;
  color?: string;
  onClick: () => void;
  children: ReactNode;
};

/** The shared look for every selector grid (semesters, streams, cycles): a
 *  paper-textured box that, on hover, lifts diagonally up-left while a hollow
 *  "ghost" outline fades in down-right of it — like the tile peeling away
 *  from its own silhouette. */
export default function SelectorTile({ active, color, onClick, children }: Props) {
  return (
    <div className="group relative h-28 sm:h-32 lg:h-36">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 border border-accent opacity-0 transition-[transform,opacity] duration-200 ease-out group-hover:translate-x-2 group-hover:translate-y-2 group-hover:opacity-70"
      />
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        style={color ? { backgroundColor: color } : undefined}
        className={`texture-paper relative flex h-full w-full flex-col items-center justify-center gap-2 border font-sans transition-[border-color,filter,color,transform] duration-200 ease-out ${
          active
            ? "border-accent text-foreground brightness-[1.04]"
            : "border-border text-muted hover:-translate-x-1.5 hover:-translate-y-1.5 hover:border-border-strong hover:text-foreground hover:brightness-[0.93] dark:hover:brightness-125"
        }`}
      >
        {children}
      </button>
    </div>
  );
}

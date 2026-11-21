"use client";

import SelectorTile from "./SelectorTile";

type Props = {
  selected: number | null;
  onSelect: (n: number) => void;
};

export const semColors = [
  "var(--color-sem-1)",
  "var(--color-sem-2)",
  "var(--color-sem-3)",
  "var(--color-sem-4)",
  "var(--color-sem-5)",
  "var(--color-sem-6)",
  "var(--color-sem-7)",
  "var(--color-sem-8)",
];

export default function SemesterTabs({ selected, onSelect }: Props) {
  return (
    <div className="semester-selector flex min-h-0 flex-1 flex-col">
      <p className="font-mono text-[13px] text-muted-2">Choose a semester</p>
      <div className="semester-grid mt-4 grid min-h-0 flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
          <SelectorTile
            key={n}
            active={selected === n}
            color={semColors[n - 1]}
            onClick={() => onSelect(n)}
          >
            <span className="font-serif text-6xl italic leading-none sm:text-7xl">{n}</span>
            <span className="text-base">Semester</span>
          </SelectorTile>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { Cycle } from "@/data/pyq-data";
import { CYCLES } from "@/data/pyq-data";
import SelectorTile from "./SelectorTile";
import { semColors } from "./SemesterTabs";

type Props = {
  semesterNumber: number;
  selected: Cycle | null;
  onSelect: (cycle: Cycle) => void;
};

export default function CycleTabs({ semesterNumber, selected, onSelect }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="font-mono text-[13px] text-muted-2">
        Choose a cycle for semester {semesterNumber}
      </p>
      <div className="mt-4 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        {CYCLES.map(({ id, label }) => (
          <SelectorTile
            key={id}
            active={selected === id}
            color={semColors[semesterNumber - 1]}
            onClick={() => onSelect(id)}
          >
            <span className="font-serif text-4xl italic leading-none sm:text-5xl">
              {id === "physics" ? "Φ" : "Cy"}
            </span>
            <span className="text-base">{label}</span>
          </SelectorTile>
        ))}
      </div>
    </div>
  );
}

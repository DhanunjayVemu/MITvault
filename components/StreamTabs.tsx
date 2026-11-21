"use client";

import type { Stream } from "@/data/pyq-data";
import { STREAMS } from "@/data/pyq-data";
import SelectorTile from "./SelectorTile";
import { semColors } from "./SemesterTabs";

type Props = {
  semesterNumber: number;
  selected: Stream | null;
  onSelect: (stream: Stream) => void;
};

export default function StreamTabs({ semesterNumber, selected, onSelect }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="font-mono text-[13px] text-muted-2">
        Choose a stream for semester {semesterNumber}
      </p>
      <div className="mt-4 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        {STREAMS.map(({ id, label }) => (
          <SelectorTile
            key={id}
            active={selected === id}
            color={semColors[semesterNumber - 1]}
            onClick={() => onSelect(id)}
          >
            <span className="font-serif text-6xl italic leading-none sm:text-7xl">{label}</span>
            <span className="text-base">Stream</span>
          </SelectorTile>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { Branch } from "@/data/pyq-data";
import { branchLabel } from "@/data/pyq-data";
import SelectorTile from "./SelectorTile";
import { semColors } from "./SemesterTabs";

type Props = {
  semesterNumber: number;
  selected: Branch | null;
  onSelect: (branch: Branch) => void;
  branches?: Branch[];
};

export default function BranchTabs({ semesterNumber, selected, onSelect, branches }: Props) {
  const availableBranches = branches ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <p className="font-mono text-[13px] text-muted-2">
        Choose a branch for semester {semesterNumber}
      </p>
      <div className="mt-4 grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {availableBranches.map((id) => (
          <SelectorTile
            key={id}
            active={selected === id}
            color={semColors[semesterNumber - 1]}
            onClick={() => onSelect(id)}
          >
            <span className="text-center font-serif text-2xl italic leading-tight sm:text-3xl">
              {branchLabel(id)}
            </span>
            <span className="text-base">Branch</span>
          </SelectorTile>
        ))}
      </div>
    </div>
  );
}

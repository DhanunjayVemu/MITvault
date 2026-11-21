"use client";

import { useState } from "react";
import type { Paper, Subject } from "@/data/pyq-data";

type Props = {
  subject: Subject;
  onOpenPaper: (paper: Paper) => void;
};

type PaperFilter = "all" | "Mid Sem" | "End Sem";

const PAPER_FILTERS: { value: PaperFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Mid Sem", label: "Mid Sem" },
  { value: "End Sem", label: "End Sem" },
];

function newestFirst(a: string, b: string) {
  const aYear = Number.parseInt(a, 10);
  const bYear = Number.parseInt(b, 10);
  if (Number.isFinite(aYear) && Number.isFinite(bYear)) return bYear - aYear;
  return b.localeCompare(a, undefined, { numeric: true });
}

function fileName(paper: Paper, subject: Subject) {
  if (paper.fileName) return paper.fileName;
  const storedName = paper.storagePath?.split("/").at(-1);
  return storedName ? decodeURIComponent(storedName) : `${subject.code}-${paper.year}-${paper.exam}.pdf`;
}

export default function SubjectPapersPage({ subject, onOpenPaper }: Props) {
  const [paperFilter, setPaperFilter] = useState<PaperFilter>("all");

  const filteredPapers =
    paperFilter === "all"
      ? subject.papers
      : subject.papers.filter((paper) => paper.exam === paperFilter);
  const papersByYear = new Map<string, Paper[]>();
  for (const paper of filteredPapers) {
    papersByYear.set(paper.year, [...(papersByYear.get(paper.year) ?? []), paper]);
  }
  const orderedYears = [...papersByYear.entries()].sort(([a], [b]) => newestFirst(a, b));

  return (
    <main className="mt-8">
      <p className="font-mono text-[12px] text-muted-2">{subject.code}</p>
      <h2 className="mt-1 font-serif text-4xl leading-tight text-foreground sm:text-5xl">{subject.name}</h2>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-sm text-muted">Previous-year question papers, newest first.</p>
        <div
          aria-label="Filter papers by exam"
          className="inline-flex w-fit rounded border border-border bg-box-surface p-1"
          role="group"
        >
          {PAPER_FILTERS.map((filter) => {
            const selected = paperFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setPaperFilter(filter.value)}
                className={`rounded px-3 py-2 font-mono text-[11px] transition-colors ${
                  selected
                    ? "bg-box-surface-active text-foreground"
                    : "text-muted hover:bg-box-surface-hover hover:text-foreground"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {orderedYears.length === 0 ? (
        <p className="mt-8 font-sans text-sm text-muted-2">
          {paperFilter === "all" ? "No papers uploaded yet." : `No ${paperFilter} papers available.`}
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {orderedYears.map(([year, papers]) => (
            <section key={year}>
              <h3 className="font-mono text-lg text-accent">{year}</h3>
              <div className="mt-3 flex flex-col gap-2">
                {[...papers]
                  .sort((a, b) => a.exam.localeCompare(b.exam))
                  .map((paper, index) => (
                    <button
                      key={paper.id ?? `${paper.year}-${paper.exam}-${index}`}
                      type="button"
                      onClick={() => onOpenPaper(paper)}
                      className="flex w-full items-center justify-between gap-4 rounded border border-border bg-box-surface px-4 py-4 text-left transition-colors hover:bg-box-surface-hover"
                    >
                      <span className="min-w-0 truncate font-sans text-sm text-foreground">
                        {fileName(paper, subject)}
                      </span>
                      <span className="shrink-0 rounded border border-border px-2 py-1 font-mono text-[11px] text-muted">
                        {paper.exam}
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

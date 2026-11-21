import type { Subject } from "@/data/pyq-data";

type Props = {
  subject: Subject;
  semesterNumber?: number;
  streamLabel?: string;
  cycleLabel?: string;
  branchLabel?: string;
  /** When provided, the whole card becomes clickable (e.g. to jump from a
   *  site-wide search result into that subject's semester/stream/cycle).
   *  Paper chips still work normally and don't trigger this. */
  onClick?: () => void;
  /** Opens the subject's papers, grouped by year, in the parent view. */
  onOpenPapers?: (subject: Subject) => void;
};

export default function SubjectCard({
  subject,
  semesterNumber,
  streamLabel,
  cycleLabel,
  branchLabel,
  onClick,
  onOpenPapers,
}: Props) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group flex flex-col border border-border bg-surface p-5 text-left transition-colors hover:border-border-strong hover:bg-surface-hover ${
        onClick ? "w-full" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] text-muted-2">
            {subject.code}
            {semesterNumber ? (
              <span className="text-border-strong">
                {" "}
                · sem {semesterNumber}
                {streamLabel ? ` · ${streamLabel}` : ""}
                {cycleLabel ? ` · ${cycleLabel}` : ""}
                {branchLabel ? ` · ${branchLabel}` : ""}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenPapers?.(subject);
            }}
            className="mt-1 text-left font-serif text-[22px] leading-snug text-foreground transition-colors hover:text-accent focus:outline-none focus-visible:text-accent"
          >
            {subject.name}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-1 items-end">
        {subject.papers.length === 0 ? (
          <p className="font-sans text-sm text-muted-2">No papers uploaded yet.</p>
        ) : (
          <p className="font-sans text-sm text-muted-2">
            {subject.papers.length} paper{subject.papers.length === 1 ? "" : "s"} available
          </p>
        )}
      </div>
    </div>
  );
}

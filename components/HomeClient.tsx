"use client";

import { useEffect, useMemo, useState } from "react";
import BranchTabs from "./BranchTabs";
import CycleTabs from "./CycleTabs";
import NavButtons from "./NavButtons";
import PathBreadcrumb from "./PathBreadcrumb";
import RippleGrid from "./RippleGrid";
import SearchInput from "./SearchInput";
import SemesterTabs from "./SemesterTabs";
import StreamTabs from "./StreamTabs";
import SubjectCard from "./SubjectCard";
import ThemeToggle from "./ThemeToggle";
import {
  semesters,
  semesterHasStreams,
  semesterHasBranches,
  getSubjects,
  getAllSubjectEntries,
  streamLabel,
  cycleLabel,
  branchLabel,
  branchSlug,
  STREAMS,
  CYCLES,
  type Stream,
  type Cycle,
  type Branch,
  type Semester,
  type Subject,
  type Paper,
} from "@/data/pyq-data";
import { fetchAllPapers, type PaperMap } from "@/lib/papers";
import { fetchCurriculum } from "@/lib/courses";
import SubjectPapersPage from "./SubjectPapersPage";

type View = {
  sem: number | null;
  stream: Stream | null;
  cycle: Cycle | null;
  branch: Branch | null;
  subjectCode: string | null;
};

const HOME_VIEW: View = { sem: null, stream: null, cycle: null, branch: null, subjectCode: null };

function findSemester(list: Semester[], number: number | null): Semester | undefined {
  return number === null ? undefined : list.find((s) => s.number === number);
}

function subjectSlug(subject: Subject) {
  return subject.name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function HomeClient() {
  // A small in-app history stack, so "back"/"forward" behave like a browser:
  // history[index] is the current view. { sem: null } is home; { sem, stream:
  // null } means the semester is picked but not the stream yet (or the
  // semester has no streams at all); { sem, stream, cycle: null } means the
  // stream is picked but not the cycle; and all three set means the subject
  // list itself is showing.
  const [history, setHistory] = useState<View[]>([HOME_VIEW]);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");

  // Real uploaded papers, fetched from Supabase and keyed by
  // "sem|stream|cycle|code" — see lib/papers.ts. Subjects with no matching
  // key just render with an empty papers list, same as before.
  const [papers, setPapers] = useState<PaperMap>({});

  // Course lists edited from the admin page; falls back to the built-in
  // curriculum until (or unless) they load.
  const [curriculum, setCurriculum] = useState<Semester[]>(semesters);

  // Papers open in a new browser tab (the URL's last path segment is the
  // original uploaded filename — see app/api/admin/upload/route.ts — so the
  // tab title and any Ctrl/Cmd+S save both use that same name) rather than
  // an in-site viewer.
  const openPaper = (_subject: Subject, paper: Paper) => {
    window.open(paper.url, "_blank", "noopener,noreferrer");
  };

  function openPapers(subject: Subject, sourceView: View = current) {
    navigate({ ...sourceView, subjectCode: subject.code });
  }


  useEffect(() => {
    let cancelled = false;
    fetchAllPapers().then((map) => {
      if (!cancelled) setPapers(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCurriculum().then((list) => {
      if (!cancelled) setCurriculum(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = history[index];
  const activeSemester = findSemester(curriculum, current.sem);
  const isComingSoon = activeSemester?.comingSoon ?? false;
  const hasStreams = activeSemester ? semesterHasStreams(activeSemester) : false;
  const hasBranches = activeSemester ? semesterHasBranches(activeSemester) : false;
  const awaitingStream = hasStreams && !current.stream;
  const awaitingCycle = hasStreams && !!current.stream && !current.cycle;
  const awaitingBranch = hasBranches && !current.branch;

  function navigate(view: View) {
    setHistory((prev) => [...prev.slice(0, index + 1), view]);
    setIndex((i) => i + 1);
    setQuery("");
  }

  function selectSemester(n: number) {
    navigate({ sem: n, stream: null, cycle: null, branch: null, subjectCode: null });
  }

  function selectStream(stream: Stream) {
    if (!activeSemester) return;
    navigate({ sem: activeSemester.number, stream, cycle: null, branch: null, subjectCode: null });
  }

  function selectCycle(cycle: Cycle) {
    if (!activeSemester) return;
    navigate({
      sem: activeSemester.number,
      stream: current.stream,
      cycle,
      branch: null,
      subjectCode: null,
    });
  }

  function selectBranch(branch: Branch) {
    if (!activeSemester) return;
    navigate({ sem: activeSemester.number, stream: null, cycle: null, branch, subjectCode: null });
  }

  function goBack() {
    setIndex((i) => Math.max(0, i - 1));
    setQuery("");
  }

  function goForward() {
    setIndex((i) => Math.min(history.length - 1, i + 1));
    setQuery("");
  }

  const subjectsInView =
    !activeSemester || isComingSoon || awaitingStream || awaitingCycle || awaitingBranch
      ? []
      : getSubjects(activeSemester, current.stream, current.cycle, papers, current.branch, curriculum);
  const currentSubject = subjectsInView.find((subject) => subject.code === current.subjectCode) ?? null;
  const isHomeView = !activeSemester && !query.trim();

  const visibleSubjects = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjectsInView;
    return subjectsInView.filter((subject) => {
      const haystack = `${subject.code} ${subject.name}`.toLowerCase();
      const matchesPaperYear = subject.papers.some((p) => p.year.includes(q));
      return haystack.includes(q) || matchesPaperYear;
    });
  })();

  // Site-wide search, used on the home screen (no semester picked yet).
  const globalResults = (() => {
    if (activeSemester) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return getAllSubjectEntries(papers, curriculum).filter((entry) => {
      const haystack = `${entry.subject.code} ${entry.subject.name}`.toLowerCase();
      const matchesPaperYear = entry.subject.papers.some((p) => p.year.includes(q));
      return haystack.includes(q) || matchesPaperYear;
    });
  })();

  // Every crumb (except the last, which is always the current location) is
  // clickable and jumps straight back to that level — no matter which
  // semester's fork structure (stream+cycle, branch, or none) is active.
  const breadcrumbSegments = useMemo(() => {
    const raw: { label: string; view: View }[] = [{ label: "mit-manipal", view: HOME_VIEW }];

    if (activeSemester) {
      raw.push({
        label: activeSemester.slug,
        view: { sem: activeSemester.number, stream: null, cycle: null, branch: null, subjectCode: null },
      });

      if (hasStreams && current.stream) {
        raw.push({
          label: STREAMS.find((s) => s.id === current.stream)!.slug,
          view: {
            sem: activeSemester.number,
            stream: current.stream,
            cycle: null,
            branch: null,
            subjectCode: null,
          },
        });

        if (current.cycle) {
          raw.push({
            label: CYCLES.find((c) => c.id === current.cycle)!.slug,
            view: {
              sem: activeSemester.number,
              stream: current.stream,
              cycle: current.cycle,
              branch: null,
              subjectCode: null,
            },
          });
        }
      }

      if (hasBranches && current.branch) {
        raw.push({
          label: branchSlug(current.branch),
          view: {
            sem: activeSemester.number,
            stream: null,
            cycle: null,
            branch: current.branch,
            subjectCode: null,
          },
        });
      }
    }

    if (currentSubject) {
      raw.push({ label: subjectSlug(currentSubject), view: current });
    }

    return raw.map((segment, i) => ({
      label: segment.label,
      onClick: i === raw.length - 1 ? undefined : () => navigate(segment.view),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSemester, hasStreams, hasBranches, current, currentSubject]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <RippleGrid />
      <div aria-hidden="true" className="page-frame" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1040px] flex-col px-6 pb-16 pt-28 sm:px-10 sm:pt-10">
        {/* Header */}
        <header className="site-header flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-3 sm:items-start">
            <h1 className="font-serif text-[32px] italic leading-none tracking-tight text-foreground sm:text-[52px]">
              PYQvault
            </h1>
            <div className="flex items-center gap-2 sm:pt-3">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={
                  activeSemester ? "Search subjects, codes…" : "Search all subjects, codes…"
                }
              />
              <ThemeToggle />
            </div>
          </div>
          <PathBreadcrumb visible={current.sem !== null || !!currentSubject} segments={breadcrumbSegments} />
        </header>

        {/* Title block — nav buttons sit on the same line as "MIT Manipal" */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-serif text-3xl leading-tight text-foreground sm:text-6xl">
              MIT Manipal
            </p>
            <NavButtons
              onBack={goBack}
              onForward={goForward}
              canGoBack={index > 0}
              canGoForward={index < history.length - 1}
            />
          </div>
          <p className="mt-2 font-sans text-sm text-muted">Previous Year Questions</p>
        </div>

        {currentSubject ? (
          <SubjectPapersPage
            key={`${current.sem}-${current.stream}-${current.cycle}-${current.branch}-${currentSubject.code}`}
            subject={currentSubject}
            onOpenPaper={(paper) => openPaper(currentSubject, paper)}
          />
        ) : activeSemester ? (
          isComingSoon ? (
            /* Semester picked, but its papers haven't been published yet */
            <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
              <p className="font-serif text-4xl italic text-foreground sm:text-5xl">Coming soon</p>
              <p className="mt-2 font-sans text-sm text-muted-2">
                Papers for semester {activeSemester.number} haven&apos;t been added yet.
              </p>
            </div>
          ) : awaitingStream ? (
            /* Semester picked, but it forks into streams — pick one first */
            <div className="mt-6 flex flex-1 flex-col">
              <StreamTabs
                semesterNumber={activeSemester.number}
                selected={current.stream}
                onSelect={selectStream}
              />
            </div>
          ) : awaitingCycle ? (
            /* Stream picked, still need a cycle */
            <div className="mt-6 flex flex-1 flex-col">
              <CycleTabs
                semesterNumber={activeSemester.number}
                selected={current.cycle}
                onSelect={selectCycle}
              />
            </div>
          ) : awaitingBranch ? (
            /* Semester picked, but it forks into branches — pick one first */
            <div className="mt-6 flex flex-1 flex-col">
              <BranchTabs
                semesterNumber={activeSemester.number}
                selected={current.branch}
                onSelect={selectBranch}
                branches={Object.keys(activeSemester.branches ?? {}) as Branch[]}
              />
            </div>
          ) : (
            /* Semester (+ stream + cycle, or + branch) view — subjects only */
            <div className="mt-6">
              <p className="font-sans text-sm text-muted">
                {visibleSubjects.length} of {subjectsInView.length} subjects
                {query.trim() ? ` matching "${query.trim()}"` : ""} in semester{" "}
                {activeSemester.number}
                {current.stream ? ` (${streamLabel(current.stream)}` : ""}
                {current.cycle ? ` · ${cycleLabel(current.cycle)})` : current.stream ? ")" : ""}
                {current.branch ? ` (${branchLabel(current.branch)})` : ""}.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.code}
                    subject={subject}
                    onClick={() => openPapers(subject)}
                    onOpenPapers={openPapers}
                  />
                ))}
              </div>
              {visibleSubjects.length === 0 && (
                <p className="mt-2 font-sans text-sm text-muted-2">
                  {subjectsInView.length === 0
                    ? current.branch
                      ? "No subjects added yet for this branch."
                      : "No subjects added yet for this cycle."
                    : "No subjects match that search."}
                </p>
              )}
            </div>
          )
        ) : query.trim() ? (
          /* Home view, but searching — results from every semester/stream/cycle */
          <div className="mt-6">
            <p className="font-sans text-sm text-muted">
              {globalResults.length} result{globalResults.length === 1 ? "" : "s"} matching &ldquo;
              {query.trim()}&rdquo;.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {globalResults.map((entry) => (
                <SubjectCard
                  key={`${entry.semesterNumber}-${entry.stream ?? "x"}-${entry.cycle ?? "x"}-${entry.branch ?? "x"}-${entry.subject.code}`}
                  subject={entry.subject}
                  semesterNumber={entry.semesterNumber}
                  streamLabel={streamLabel(entry.stream)}
                  cycleLabel={cycleLabel(entry.cycle)}
                  branchLabel={branchLabel(entry.branch)}
                  onClick={() => openPapers(entry.subject, {
                    sem: entry.semesterNumber,
                    stream: entry.stream,
                    cycle: entry.cycle,
                    branch: entry.branch,
                    subjectCode: null,
                  })}
                  onOpenPapers={() => openPapers(entry.subject, {
                    sem: entry.semesterNumber,
                    stream: entry.stream,
                    cycle: entry.cycle,
                    branch: entry.branch,
                    subjectCode: null,
                  })}
                />
              ))}
            </div>
            {globalResults.length === 0 && (
              <p className="mt-2 font-sans text-sm text-muted-2">
                No subjects match that search.
              </p>
            )}
          </div>
        ) : (
          /* Home view — the semester selector */
          <div className="mt-6 flex flex-1 flex-col">
            <SemesterTabs selected={current.sem} onSelect={selectSemester} />
          </div>
        )}

        <footer
          className={`site-footer mt-auto shrink-0 text-center ${
            isHomeView ? "pt-3 sm:pt-5" : "pt-14 sm:pt-16"
          }`}
        >
          <a
            href="https://github.com/DhanunjayVemu/MITvault"
            target="_blank"
            rel="noopener noreferrer"
            className="open-source-link inline-flex items-center gap-[0.45em] rounded-lg border border-border bg-surface px-2.5 py-1 font-serif text-sm leading-relaxed sm:translate-y-4 sm:px-3 sm:py-1.5 sm:text-base"
          >
            <span className="open-source-icon" aria-hidden="true" />
            <span className="open-source-label">Open Source</span>
          </a>
        </footer>
      </div>
    </div>
  );
}

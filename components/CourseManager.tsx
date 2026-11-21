"use client";

import { useMemo, useState } from "react";
import {
  semesters,
  buildSemesters,
  STREAMS,
  CYCLES,
  branchLabel,
  type Course,
  type SemesterSetting,
  type Stream,
  type Cycle,
  type Branch,
} from "@/data/pyq-data";

type Props = {
  courses: Course[];
  settings: SemesterSetting[];
  loadError: string | null;
  onChanged: () => void | Promise<void>;
};

const fieldClass =
  "rounded border border-border bg-transparent px-2 py-1.5 font-sans text-sm text-foreground focus:border-accent focus:outline-none";
const smallButtonClass =
  "shrink-0 rounded border border-border px-2 py-1 font-sans text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50";

export default function CourseManager({ courses, settings, loadError, onChanged }: Props) {
  const [semesterNum, setSemesterNum] = useState(1);
  const [stream, setStream] = useState<Stream | "">("");
  const [cycle, setCycle] = useState<Cycle | "">("");
  const [branch, setBranch] = useState<Branch | "">("");
  const [newBranch, setNewBranch] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const curriculum = useMemo(() => buildSemesters(courses, settings), [courses, settings]);
  const semester = curriculum.find((s) => s.number === semesterNum)!;
  const hasStreams = !!semester.streams;
  const hasBranches = !!semester.branches;
  const branchOptions = Object.keys(semester.branches ?? {});
  const canAddBranches = !hasStreams;
  const groupReady = hasStreams ? !!stream && !!cycle : hasBranches ? !!branch : true;

  const comingSoon = useMemo(
    () => semester.comingSoon ?? false,
    [semester]
  );

  const groupCourses = useMemo(() => {
    if (!groupReady) return [];
    return courses
      .filter(
        (c) =>
          c.semester === semesterNum &&
          c.stream === (hasStreams ? stream || null : null) &&
          c.cycle === (hasStreams ? cycle || null : null) &&
          c.branch === (hasBranches ? branch || null : null)
      )
      .sort((a, b) => a.position - b.position || a.code.localeCompare(b.code));
  }, [courses, groupReady, semesterNum, hasStreams, hasBranches, stream, cycle, branch]);

  const location = [
    `Semester ${semesterNum}`,
    hasStreams && stream ? STREAMS.find((s) => s.id === stream)?.label : null,
    hasStreams && cycle ? CYCLES.find((c) => c.id === cycle)?.label : null,
    hasBranches && branch ? branchLabel(branch) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  async function send(method: string, body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/courses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Request failed." });
        return false;
      }
      await onChanged();
      return true;
    } catch {
      setMessage({ type: "error", text: "Couldn't reach the server." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addCourse() {
    if (!code.trim() || !name.trim()) {
      setMessage({ type: "error", text: "Enter both a course code and a name." });
      return;
    }
    const ok = await send("POST", {
      semester: semesterNum,
      stream: hasStreams ? stream : "",
      cycle: hasStreams ? cycle : "",
      branch: hasBranches ? branch : "",
      code,
      name,
    });
    if (ok) {
      setCode("");
      setName("");
      setMessage({ type: "success", text: "Course added." });
    }
  }

  function startEdit(course: Course) {
    setEditingId(course.id);
    setEditCode(course.code);
    setEditName(course.name);
    setMessage(null);
  }

  async function saveEdit(id: string) {
    const ok = await send("PATCH", { id, code: editCode, name: editName });
    if (ok) {
      setEditingId(null);
      setMessage({ type: "success", text: "Course updated." });
    }
  }

  async function deleteCourse(course: Course) {
    if (
      !confirm(
        `Delete ${course.code} — ${course.name}?\n\nPapers already uploaded for it stay in storage but won't show on the site.`
      )
    ) {
      return;
    }
    const ok = await send("DELETE", { id: course.id });
    if (ok) setMessage({ type: "success", text: "Course deleted." });
  }

  async function toggleStatus() {
    const ok = await send("PUT", { semester: semesterNum, comingSoon: !comingSoon });
    if (ok) {
      setMessage({
        type: "success",
        text: comingSoon ? `Semester ${semesterNum} is now live.` : `Semester ${semesterNum} is now Coming soon.`,
      });
    }
  }

  async function addBranch() {
    const value = newBranch.trim();
    if (!value) {
      setMessage({ type: "error", text: "Enter a branch name." });
      return;
    }
    if (branchOptions.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setMessage({ type: "error", text: "That branch already exists for this semester." });
      return;
    }
    const ok = await send("PUT", {
      semester: semesterNum,
      comingSoon,
      branches: [...branchOptions, value],
    });
    if (ok) {
      setNewBranch("");
      setBranch(value);
      setMessage({ type: "success", text: "Branch added." });
    }
  }

  return (
    <div className="mt-10">
      <h2 className="font-serif text-2xl italic text-foreground">Courses</h2>
      <p className="mt-1 font-sans text-sm text-muted">
        Add, rename or delete courses in any semester, cycle or branch.
      </p>

      {loadError ? (
        <p className="mt-4 border border-border p-4 font-sans text-sm text-red-500">
          Couldn&apos;t load courses: {loadError}.
          {/schema cache|does not exist|relation/i.test(loadError) &&
            " Run supabase/migrations/20260919000000_add_courses.sql in your Supabase SQL editor."}
        </p>
      ) : (
        <div className="mt-4 space-y-4 border border-border bg-surface p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-sans text-sm text-muted">
              Semester
              <select
                value={semesterNum}
                onChange={(e) => {
                  setSemesterNum(Number(e.target.value));
                  setStream("");
                  setCycle("");
                  setBranch("");
                  setEditingId(null);
                  setMessage(null);
                }}
                className={fieldClass}
              >
                {semesters.map((s) => (
                  <option key={s.number} value={s.number}>
                    Semester {s.number}
                  </option>
                ))}
              </select>
            </label>

            {hasStreams && (
              <label className="flex flex-col gap-1 font-sans text-sm text-muted">
                Stream
                <select
                  value={stream}
                  onChange={(e) => {
                    setStream(e.target.value as Stream);
                    setCycle("");
                    setEditingId(null);
                  }}
                  className={fieldClass}
                >
                  <option value="">Select…</option>
                  {STREAMS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {hasStreams && stream && (
              <label className="flex flex-col gap-1 font-sans text-sm text-muted">
                Cycle
                <select
                  value={cycle}
                  onChange={(e) => {
                    setCycle(e.target.value as Cycle);
                    setEditingId(null);
                  }}
                  className={fieldClass}
                >
                  <option value="">Select…</option>
                  {CYCLES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {hasBranches && (
              <label className="flex flex-col gap-1 font-sans text-sm text-muted">
                Branch
                <select
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value as Branch);
                    setEditingId(null);
                  }}
                  className={fieldClass}
                >
                  <option value="">Select…</option>
                  {branchOptions.map((id) => (
                    <option key={id} value={id}>
                      {branchLabel(id)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {canAddBranches && (
              <div className="flex flex-col gap-1 font-sans text-sm text-muted">
                <span>Add branch</span>
                <div className="flex gap-2">
                  <input
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    className={`${fieldClass} min-w-0 flex-1`}
                    placeholder="Branch name"
                    maxLength={80}
                  />
                  <button type="button" onClick={addBranch} disabled={busy} className={smallButtonClass}>
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border border-border px-3 py-2">
            <p className="font-sans text-sm text-muted">
              Semester {semesterNum} is{" "}
              <span className={comingSoon ? "text-red-500" : "text-green-500"}>
                {comingSoon ? "Coming soon (hidden from students)" : "live"}
              </span>
            </p>
            <button type="button" onClick={toggleStatus} disabled={busy} className={smallButtonClass}>
              {comingSoon ? "Make live" : "Mark coming soon"}
            </button>
          </div>

          {groupReady ? (
            <>
              <p className="font-mono text-[12px] text-muted-2">{location}</p>

              <div className="divide-y divide-border border border-border">
                {groupCourses.length === 0 && (
                  <p className="p-4 font-sans text-sm text-muted-2">No courses here yet.</p>
                )}
                {groupCourses.map((course) =>
                  editingId === course.id ? (
                    <div key={course.id} className="flex flex-wrap items-center gap-2 p-3">
                      <input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className={`${fieldClass} w-28`}
                        placeholder="Code"
                      />
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`${fieldClass} min-w-0 flex-1`}
                        placeholder="Course name"
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(course.id)}
                        disabled={busy}
                        className={smallButtonClass}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={busy}
                        className={smallButtonClass}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div key={course.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[12px] text-muted-2">{course.code}</p>
                        <p className="truncate font-sans text-sm text-foreground">{course.name}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(course)}
                          disabled={busy}
                          className={smallButtonClass}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCourse(course)}
                          disabled={busy}
                          className="shrink-0 rounded border border-border px-2 py-1 font-sans text-xs text-muted transition-colors hover:border-red-500 hover:text-red-500 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${fieldClass} w-28`}
                  placeholder="Code"
                />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${fieldClass} min-w-0 flex-1`}
                  placeholder="Course name"
                />
                <button type="button" onClick={addCourse} disabled={busy} className={smallButtonClass}>
                  Add course
                </button>
              </div>
            </>
          ) : (
            <p className="font-sans text-sm text-muted-2">Pick a stream and cycle, or a branch, to manage its courses.</p>
          )}

          {message && (
            <p className={`font-sans text-sm ${message.type === "success" ? "text-green-500" : "text-red-500"}`}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

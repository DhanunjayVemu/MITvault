"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import CourseManager from "@/components/CourseManager";
import {
  buildSemesters,
  semesterHasStreams,
  semesterHasBranches,
  getSubjects,
  STREAMS,
  CYCLES,
  branchLabel,
  type Stream,
  type Cycle,
  type Branch,
  type Course,
  type SemesterSetting,
} from "@/data/pyq-data";

const EXAMS = ["End Sem", "Mid Sem", "Quiz"] as const;

type PaperRow = {
  id: string;
  subject_code: string;
  semester: number;
  stream: Stream | null;
  cycle: Cycle | null;
  branch: Branch | null;
  year: string;
  exam: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const [papers, setPapers] = useState<PaperRow[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [semesterSettings, setSemesterSettings] = useState<SemesterSetting[]>([]);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Upload form state
  const [semesterNum, setSemesterNum] = useState(1);
  const [stream, setStream] = useState<Stream | "">("");
  const [cycle, setCycle] = useState<Cycle | "">("");
  const [branch, setBranch] = useState<Branch | "">("");
  const [subjectCode, setSubjectCode] = useState("");
  const [year, setYear] = useState("");
  const [exam, setExam] = useState<(typeof EXAMS)[number]>("End Sem");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const curriculum = useMemo(
    () => buildSemesters(courses, semesterSettings),
    [courses, semesterSettings]
  );
  const semester = curriculum.find((s) => s.number === semesterNum)!;
  const hasStreams = semesterHasStreams(semester);
  const hasBranches = semesterHasBranches(semester);
  const branchOptions = Object.keys(semester.branches ?? {});

  const subjectOptions = useMemo(() => {
    if (hasStreams && (!stream || !cycle)) return [];
    if (hasBranches && !branch) return [];
    return getSubjects(
      semester,
      hasStreams ? (stream as Stream) : null,
      hasStreams ? (cycle as Cycle) : null,
      {},
      hasBranches ? (branch as Branch) : null,
      curriculum
    );
  }, [semester, curriculum, hasStreams, hasBranches, stream, cycle, branch]);

  // Check whether an existing session cookie is still valid, so a reload
  // doesn't kick you back out. Runs after mount (not during render) so the
  // server-rendered HTML and the first client render always match.
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/admin/papers");
      if (res.ok) {
        const body = await res.json();
        setPapers(body.papers ?? []);
        setAuthorized(true);
        refreshCourses();
      }
    } catch {
      // No valid session yet — the login form below handles that.
    } finally {
      setCheckingAuth(false);
    }
  }

  async function login(candidate: string) {
    setCheckingAuth(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: candidate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAuthError(body.error ?? "Incorrect password.");
        return;
      }
      setPassword("");
      setAuthorized(true);
      refreshPapers();
      refreshCourses();
    } catch {
      setAuthError("Couldn't reach the server.");
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAuthorized(false);
      setPapers([]);
      setCourses([]);
      setSemesterSettings([]);
    }
  }

  async function refreshPapers() {
    setLoadingPapers(true);
    try {
      const res = await fetch("/api/admin/papers");
      if (res.ok) {
        const body = await res.json();
        setPapers(body.papers ?? []);
      }
    } finally {
      setLoadingPapers(false);
    }
  }

  async function refreshCourses() {
    try {
      const res = await fetch("/api/admin/courses");
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setAuthorized(false);
        return;
      }
      if (!res.ok) {
        setCoursesError(body.error ?? "Request failed");
        return;
      }
      setCourses(body.courses ?? []);
      setSemesterSettings(body.settings ?? []);
      setCoursesError(null);
    } catch {
      setCoursesError("Couldn't reach the server");
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setFormMessage({ type: "error", text: "Choose a PDF file first." });
      return;
    }
    if (!subjectCode) {
      setFormMessage({ type: "error", text: "Choose a subject." });
      return;
    }
    if (!year.trim()) {
      setFormMessage({ type: "error", text: "Enter a year." });
      return;
    }

    setSubmitting(true);
    setFormMessage(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("semester", String(semesterNum));
      body.set("stream", hasStreams ? stream : "");
      body.set("cycle", hasStreams ? cycle : "");
      body.set("branch", hasBranches ? branch : "");
      body.set("subjectCode", subjectCode);
      body.set("year", year.trim());
      body.set("exam", exam);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setFormMessage({ type: "error", text: data.error ?? "Upload failed." });
        return;
      }
      setFormMessage({ type: "success", text: "Uploaded." });
      setFile(null);
      setYear("");
      const fileInput = document.getElementById("pdf-file-input") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      refreshPapers();
    } catch {
      setFormMessage({ type: "error", text: "Couldn't reach the server." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this paper? This can't be undone.")) return;
    try {
      const res = await fetch("/api/admin/papers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setPapers((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      // The list will just look stale until the next manual refresh.
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center font-sans text-sm text-muted">
        Checking…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login(password);
          }}
          className="w-full max-w-sm border border-border bg-surface p-6"
        >
          <h1 className="font-serif text-3xl italic text-foreground">PYQvault Admin</h1>
          <p className="mt-2 font-sans text-sm text-muted">
            Enter the admin password to continue.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded border border-border bg-transparent px-3 py-2 font-sans text-sm text-foreground focus:border-accent focus:outline-none"
            placeholder="Password"
            autoFocus
          />
          {authError && <p className="mt-2 font-sans text-sm text-red-500">{authError}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded border border-border py-2 font-sans text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl italic text-foreground">PYQvault Admin</h1>
          <p className="mt-1 font-sans text-sm text-muted">Upload past papers and manage courses.</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded border border-border px-3 py-1.5 font-sans text-sm text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Log out
        </button>
      </div>

      <form
        onSubmit={handleUpload}
        className="mt-8 grid grid-cols-1 gap-4 border border-border bg-surface p-6 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 font-sans text-sm text-muted">
          Semester
          <select
            value={semesterNum}
            onChange={(e) => {
              setSemesterNum(Number(e.target.value));
              setStream("");
              setCycle("");
              setBranch("");
              setSubjectCode("");
            }}
            className="rounded border border-border bg-transparent px-2 py-1.5 text-foreground focus:border-accent focus:outline-none"
          >
            {curriculum.map((s) => (
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
                setSubjectCode("");
              }}
              className="rounded border border-border bg-transparent px-2 py-1.5 text-foreground focus:border-accent focus:outline-none"
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
                setSubjectCode("");
              }}
              className="rounded border border-border bg-transparent px-2 py-1.5 text-foreground focus:border-accent focus:outline-none"
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
                setSubjectCode("");
              }}
              className="rounded border border-border bg-transparent px-2 py-1.5 text-foreground focus:border-accent focus:outline-none"
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

        <label className="flex flex-col gap-1 font-sans text-sm text-muted sm:col-span-2">
          Subject
          <select
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            disabled={subjectOptions.length === 0}
            className="rounded border border-border bg-transparent px-2 py-1.5 text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
          >
            <option value="">
              {subjectOptions.length === 0 ? "Pick semester/stream/cycle/branch first" : "Select…"}
            </option>
            {subjectOptions.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 font-sans text-sm text-muted">
          Year
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
            className="rounded border border-border bg-transparent px-2 py-1.5 text-foreground focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 font-sans text-sm text-muted">
          Exam
          <select
            value={exam}
            onChange={(e) => setExam(e.target.value as (typeof EXAMS)[number])}
            className="rounded border border-border bg-transparent px-2 py-1.5 text-foreground focus:border-accent focus:outline-none"
          >
            {EXAMS.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 font-sans text-sm text-muted sm:col-span-2">
          PDF file
          <input
            id="pdf-file-input"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="font-sans text-sm text-foreground"
          />
        </label>

        {formMessage && (
          <p
            className={`font-sans text-sm sm:col-span-2 ${
              formMessage.type === "success" ? "text-green-500" : "text-red-500"
            }`}
          >
            {formMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded border border-border py-2 font-sans text-sm text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-50 sm:col-span-2"
        >
          {submitting ? "Uploading…" : "Upload paper"}
        </button>
      </form>

      <CourseManager
        courses={courses}
        settings={semesterSettings}
        loadError={coursesError}
        onChanged={refreshCourses}
      />

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl italic text-foreground">Recent uploads</h2>
          <button
            type="button"
            onClick={refreshPapers}
            className="font-sans text-sm text-muted transition-colors hover:text-accent"
          >
            {loadingPapers ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-4 divide-y divide-border border border-border">
          {papers.length === 0 && (
            <p className="p-4 font-sans text-sm text-muted-2">Nothing uploaded yet.</p>
          )}
          {papers.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-mono text-[12px] text-muted-2">
                  sem {p.semester}
                  {p.stream ? ` · ${p.stream}` : ""}
                  {p.cycle ? ` · ${p.cycle}` : ""}
                  {p.branch ? ` · ${p.branch}` : ""}
                </p>
                <p className="truncate font-sans text-sm text-foreground">
                  {p.subject_code} · {p.year} · {p.exam}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="shrink-0 rounded border border-border px-2 py-1 font-sans text-xs text-muted transition-colors hover:border-red-500 hover:text-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

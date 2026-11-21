export type Paper = {
  /** Present once a paper is loaded from Supabase; used for React keys and
   *  admin deletes. Absent for the empty placeholder papers below. */
  id?: string;
  year: string;
  exam: "End Sem" | "Mid Sem" | "Quiz";
  /** Public URL to view/download the file from Supabase Storage. */
  url: string;
  /** Original filename supplied by the uploader, when available. */
  fileName?: string;
  /** Storage bucket path, kept around for admin delete calls. */
  storagePath?: string;
};

export type Subject = {
  code: string;
  name: string;
  papers: Paper[];
};

export type Stream = "cs" | "non-cs";
export type Cycle = "physics" | "chemistry";

/** Semesters with branch-specific curricula fork by branch instead of
 * stream/cycle. Only CS, MnC, and FinTech have a published subject list right
 * now — the rest are still selectable (so the branch picker shows the full
 * department list) but fall back to an empty subject list until their
 * curriculum is added. */
export type Branch = string;

export const STREAMS: { id: Stream; label: string; slug: string }[] = [
  { id: "cs", label: "CS", slug: "cs" },
  { id: "non-cs", label: "Non-CS", slug: "non-cs" },
];

export const CYCLES: { id: Cycle; label: string; slug: string }[] = [
  { id: "physics", label: "Physics Cycle", slug: "physics-cycle" },
  { id: "chemistry", label: "Chemistry Cycle", slug: "chemistry-cycle" },
];

export const BRANCHES: { id: Branch; label: string; slug: string }[] = [
  { id: "cs", label: "CS", slug: "cs" },
  { id: "mnc", label: "MnC", slug: "mnc" },
  { id: "fintech", label: "FinTech", slug: "fintech" },
  { id: "ece", label: "ECE", slug: "ece" },
  { id: "eee", label: "EEE", slug: "eee" },
  { id: "mech", label: "Mech", slug: "mech" },
  { id: "mechatronics", label: "Mechatronics", slug: "mechatronics" },
  { id: "aero", label: "Aero", slug: "aero" },
  { id: "civil", label: "Civil", slug: "civil" },
  { id: "biotech", label: "BioTech", slug: "biotech" },
  { id: "chemical", label: "Chemical", slug: "chemical" },
  { id: "cce", label: "CCE", slug: "cce" },
];

export function streamFromSlug(slug: string | undefined): Stream | null {
  return STREAMS.find((s) => s.slug === slug)?.id ?? null;
}

export function cycleFromSlug(slug: string | undefined): Cycle | null {
  return CYCLES.find((c) => c.slug === slug)?.id ?? null;
}

export function branchFromSlug(slug: string | undefined): Branch | null {
  return BRANCHES.find((b) => b.slug === slug)?.id ?? null;
}

export function streamLabel(stream: Stream | null): string | undefined {
  return stream ? STREAMS.find((s) => s.id === stream)?.label : undefined;
}

export function cycleLabel(cycle: Cycle | null): string | undefined {
  return cycle ? CYCLES.find((c) => c.id === cycle)?.label : undefined;
}

export function branchLabel(branch: Branch | null): string | undefined {
  return branch ? BRANCHES.find((b) => b.id === branch)?.label ?? branch : undefined;
}

export function branchSlug(branch: Branch): string {
  return BRANCHES.find((b) => b.id === branch)?.slug ?? branch.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Semesters 1 and 2 fork into a CS / Non-CS stream, and each stream then
// forks again into a Physics cycle and a Chemistry cycle. Semester 3 forks
// once into a branch. Every other semester just has a flat `subjects` list.
// `comingSoon` semesters short-circuit straight to a "Coming soon" screen
// regardless of what other data they carry.
export type Semester = {
  number: number;
  slug: string;
  subjects?: Subject[];
  streams?: Record<Stream, Record<Cycle, Subject[]>>;
  branches?: Partial<Record<Branch, Subject[]>>;
  branchOptions?: Branch[];
  comingSoon?: boolean;
};

export function semesterHasStreams(semester: Semester): boolean {
  return !!semester.streams;
}

export function semesterHasBranches(semester: Semester): boolean {
  return !!semester.branches;
}

/** Real papers fetched from Supabase, keyed by paperKey() below. Subjects
 *  with no matching key just fall back to their static (empty) paper list. */
export type PaperMap = Record<string, Paper[]>;

export function paperKey(
  semesterNumber: number,
  stream: Stream | null,
  cycle: Cycle | null,
  subjectCode: string,
  branch: Branch | null = null
): string {
  return `${semesterNumber}|${stream ?? "-"}|${cycle ?? "-"}|${branch ?? "-"}|${subjectCode}`;
}

function normalizeForSignature(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Identifies a course by its (normalized) code + name, independent of
 *  which branch/stream/cycle it happens to be listed under. Two subjects
 *  with the same signature within the same semester are treated as the
 *  same course for paper-sharing purposes. */
function subjectSignature(code: string, name: string): string {
  return `${normalizeForSignature(code)}::${normalizeForSignature(name)}`;
}

/** Lazily-built index: `${semesterNumber}|${signature}` -> every paperKey
 *  belonging to a subject with that (normalized) code + name anywhere in
 *  that semester's curriculum (across every stream/cycle or branch). Built
 *  once from the static curriculum and cached, since `semesters` isn't
 *  initialized yet at module-evaluation time. */
const signatureKeysCache = new WeakMap<Semester[], Map<string, Set<string>>>();

function getSignatureKeys(sems: Semester[]): Map<string, Set<string>> {
  const cached = signatureKeysCache.get(sems);
  if (cached) return cached;

  const map = new Map<string, Set<string>>();
  const add = (semesterNumber: number, subject: Subject, key: string) => {
    const sigKey = `${semesterNumber}|${subjectSignature(subject.code, subject.name)}`;
    const set = map.get(sigKey) ?? new Set<string>();
    set.add(key);
    map.set(sigKey, set);
  };

  for (const sem of sems) {
    if (sem.streams) {
      for (const { id: stream } of STREAMS) {
        for (const { id: cycle } of CYCLES) {
          for (const subject of sem.streams[stream]?.[cycle] ?? []) {
            add(sem.number, subject, paperKey(sem.number, stream, cycle, subject.code));
          }
        }
      }
    } else if (sem.branches) {
      for (const branch of Object.keys(sem.branches)) {
        for (const subject of sem.branches[branch] ?? []) {
          add(sem.number, subject, paperKey(sem.number, null, null, subject.code, branch));
        }
      }
    } else {
      for (const subject of sem.subjects ?? []) {
        add(sem.number, subject, paperKey(sem.number, null, null, subject.code));
      }
    }
  }

  signatureKeysCache.set(sems, map);
  return map;
}

/** Every paperKey that should be treated as the same course as `subject`
 *  within `semesterNumber` — its own key plus any other branch/cycle entry
 *  in that semester that shares the same (normalized) code and name. */
function equivalentKeys(sems: Semester[], semesterNumber: number, subject: Subject): string[] {
  const sigKey = `${semesterNumber}|${subjectSignature(subject.code, subject.name)}`;
  const set = getSignatureKeys(sems).get(sigKey);
  return set ? [...set] : [];
}

/** Merges live papers from every equivalent key, de-duplicating by id (or
 *  storage path / url when a paper has no id). Returns null when none of
 *  the keys have any live papers, so callers can fall back to the static
 *  placeholder list. */
function mergedLivePapers(papers: PaperMap, keys: string[]): Paper[] | null {
  const seen = new Set<string>();
  const merged: Paper[] = [];
  let found = false;

  for (const key of keys) {
    const live = papers[key];
    if (!live) continue;
    found = true;
    for (const paper of live) {
      const dedupeId = paper.id ?? paper.storagePath ?? paper.url;
      if (dedupeId) {
        if (seen.has(dedupeId)) continue;
        seen.add(dedupeId);
      }
      merged.push(paper);
    }
  }

  return found ? merged : null;
}

/** Subjects for a semester, resolving stream + cycle (or branch) when the
 *  semester has them, with any live-uploaded papers merged in. Courses that
 *  share the same code + name across other branches or cycles in this
 *  semester automatically share their uploaded papers too. Returns [] for
 *  a semester still awaiting its stream/cycle/branch pick, or one flagged
 *  `comingSoon`. */
export function getSubjects(
  semester: Semester,
  stream: Stream | null,
  cycle: Cycle | null,
  papers: PaperMap = {},
  branch: Branch | null = null,
  sems: Semester[] = semesters
): Subject[] {
  if (semester.comingSoon) return [];

  const base = semester.branches
    ? branch
      ? semester.branches[branch] ?? []
      : []
    : semester.streams
    ? stream && cycle
      ? semester.streams[stream]?.[cycle] ?? []
      : []
    : semester.subjects ?? [];

  return base.map((subject) => {
    const live = mergedLivePapers(papers, equivalentKeys(sems, semester.number, subject));
    return live ? { ...subject, papers: live } : subject;
  });
}

export type SubjectEntry = {
  subject: Subject;
  semesterNumber: number;
  stream: Stream | null;
  cycle: Cycle | null;
  branch: Branch | null;
};

/** Every subject across every semester (and every stream/cycle or branch,
 *  where they exist), flattened for site-wide search, with live papers
 *  merged in. Semesters flagged `comingSoon` are skipped entirely. */
export function getAllSubjectEntries(papers: PaperMap = {}, sems: Semester[] = semesters): SubjectEntry[] {
  const entries: SubjectEntry[] = [];
  for (const sem of sems) {
    if (sem.comingSoon) continue;
    if (sem.streams) {
      for (const { id: stream } of STREAMS) {
        for (const { id: cycle } of CYCLES) {
          for (const subject of sem.streams[stream]?.[cycle] ?? []) {
            const live = mergedLivePapers(papers, equivalentKeys(sems, sem.number, subject));
            entries.push({
              subject: live ? { ...subject, papers: live } : subject,
              semesterNumber: sem.number,
              stream,
              cycle,
              branch: null,
            });
          }
        }
      }
    } else if (sem.branches) {
      for (const branch of Object.keys(sem.branches)) {
        for (const subject of sem.branches[branch] ?? []) {
          const live = mergedLivePapers(papers, equivalentKeys(sems, sem.number, subject));
          entries.push({
            subject: live ? { ...subject, papers: live } : subject,
            semesterNumber: sem.number,
            stream: null,
            cycle: null,
            branch,
          });
        }
      }
    } else {
      for (const subject of sem.subjects ?? []) {
        const live = mergedLivePapers(papers, equivalentKeys(sems, sem.number, subject));
        entries.push({
          subject: live ? { ...subject, papers: live } : subject,
          semesterNumber: sem.number,
          stream: null,
          cycle: null,
          branch: null,
        });
      }
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Semesters 3–8 are still placeholder data. Swap `url` for real file links
// (Drive, S3, /public, etc.) and edit subject lists to match the actual
// curriculum once you have it.
// ---------------------------------------------------------------------------

function makePapers(seed: number): Paper[] {
  const years = ["2025", "2024", "2023", "2022"];
  const exams: Paper["exam"][] = ["End Sem", "Mid Sem"];
  const papers: Paper[] = [];
  years.forEach((year, i) => {
    exams.forEach((exam, j) => {
      if ((i + j + seed) % 3 !== 0) {
        papers.push({ year, exam, url: "#" });
      }
    });
  });
  return papers;
}

export const semesters: Semester[] = [
  {
    number: 1,
    slug: "semester-1",
    streams: {
      cs: {
        physics: [
          { code: "SMS 1102", name: "Computational Mathematics - I", papers: [] },
          { code: "SMS 1002", name: "Applied Physics for Engineers", papers: [] },
          { code: "EES 1004", name: "Fundamentals of Electronics", papers: [] },
          { code: "CES 1102", name: "Programming for Problem Solving", papers: [] },
          { code: "MES 1002", name: "Fundamentals of Mechanical Engineering", papers: [] },
          { code: "SMS 1005", name: "Communication Skills in English", papers: [] },
        ],
        chemistry: [
          { code: "SMS 1102", name: "Computational Mathematics - I", papers: [] },
          { code: "SMS 1004", name: "Applied Chemistry for Engineers", papers: [] },
          { code: "EES 1002", name: "Fundamentals of Electrical Engineering", papers: [] },
          { code: "CES 1102", name: "Programming for Problem Solving", papers: [] },
          { code: "CCS 1003", name: "Environmental Studies", papers: [] },
          { code: "CCS 1002", name: "Engineering Mechanics & Smart Building", papers: [] },
        ],
      },
      "non-cs": {
        physics: [
          { code: "SMS 1101", name: "Engineering Mathematics - I", papers: [] },
          { code: "SMS 1001", name: "Engineering Physics", papers: [] },
          { code: "CCS 1001", name: "Mechanics of Solids", papers: [] },
          { code: "EES 1003", name: "Basic Electronics", papers: [] },
          { code: "MES 1001", name: "Basic Mechanical Engineering", papers: [] },
          { code: "SMS 1005", name: "Communication Skills in English", papers: [] },
        ],
        chemistry: [
          { code: "SMS 1101", name: "Engineering Mathematics - I", papers: [] },
          { code: "SMS 1003", name: "Engineering Chemistry", papers: [] },
          { code: "CCS 1004", name: "Biology for Engineers", papers: [] },
          { code: "EES 1001", name: "Basic Electrical Technology", papers: [] },
          { code: "CES 1001", name: "Problem Solving using Computers", papers: [] },
          { code: "CCS 1003", name: "Environmental Studies", papers: [] },
        ],
      },
    },
  },
  {
    number: 2,
    slug: "semester-2",
    comingSoon: true,
    streams: {
      cs: {
        physics: [
          { code: "SMS 1202", name: "Computational Mathematics - II", papers: [] },
          { code: "SMS 1004", name: "Applied Chemistry for Engineers", papers: [] },
          { code: "EES 1002", name: "Fundamentals of Electrical Engineering", papers: [] },
          { code: "CCS 1002", name: "Engineering Mechanics and Smart Buildings", papers: [] },
          { code: "CCS 1201", name: "Introduction to Object Oriented Programming", papers: [] },
          { code: "CCS 1003", name: "Environmental Studies", papers: [] },
        ],
        chemistry: [
          { code: "SMS 1202", name: "Computational Mathematics - II", papers: [] },
          { code: "SMS 1002", name: "Applied Physics for Engineers", papers: [] },
          { code: "EES 1004", name: "Fundamentals of Electronics", papers: [] },
          { code: "MES 1002", name: "Fundamentals of Mechanical Engineering", papers: [] },
          { code: "CES 1201", name: "Introduction to Object Oriented Programming", papers: [] },
          { code: "SMS 1005", name: "Communication Skills in English", papers: [] },
        ],
      },
      "non-cs": {
        physics: [
          { code: "SMS 1201", name: "Engineering Mathematics - II", papers: [] },
          { code: "SMS 1003", name: "Engineering Chemistry", papers: [] },
          { code: "CCS 1004", name: "Biology for Engineers", papers: [] },
          { code: "EES 1001", name: "Basic Electrical Technology", papers: [] },
          { code: "CES 1001", name: "Problem Solving using Computers", papers: [] },
          { code: "CCS 1003", name: "Environmental Studies", papers: [] },
        ],
        chemistry: [
          { code: "SMS 1201", name: "Engineering Mathematics - II", papers: [] },
          { code: "SMS 1001", name: "Engineering Physics", papers: [] },
          { code: "CCS 1001", name: "Mechanics of Solids", papers: [] },
          { code: "EES 1003", name: "Basic Electronics", papers: [] },
          { code: "MES 1001", name: "Basic Mechanical Engineering", papers: [] },
          { code: "SMS 1005", name: "Communication Skills in English", papers: [] },
        ],
      },
    },
  },
  {
    number: 3,
    slug: "semester-3",
    branchOptions: [
      "cs",
      "mnc",
      "fintech",
      "ece",
      "eee",
      "mech",
      "mechatronics",
      "aero",
      "civil",
      "biotech",
      "chemical",
    ],
    // Branch is chosen first (see BRANCHES above); only CS, MnC, and FinTech
    // have a published subject list so far. The other eight branches are
    // still shown as selectors — they just resolve to an empty list ("No
    // subjects added yet for this branch") until their curriculum is added.
    branches: {
      cs: [
        { code: "SMS 2101", name: "Discrete Mathematical Structures", papers: [] },
        { code: "CES 2101", name: "Data Structures", papers: [] },
        { code: "CES 2102", name: "Data Communication and Computer Networks", papers: [] },
        { code: "CES 2103", name: "Data Analytics", papers: [] },
        { code: "CES 2104", name: "Digital Systems and Computer Organization", papers: [] },
      ],
      mnc: [
        { code: "SMM 2101", name: "Computational Linear Algebra", papers: [] },
        { code: "SMM 2102", name: "Probability and Stochastic Process", papers: [] },
        { code: "SMM 2103", name: "Elementary Number Theory", papers: [] },
        { code: "SMM 2104", name: "Discrete Mathematics", papers: [] },
        { code: "CES 2101", name: "Data Structures", papers: [] },
        { code: "CEM 2101", name: "Advanced Programming", papers: [] },
      ],
      // No official course codes were provided for FinTech — these are
      // placeholder codes; update them once the real codes are known.
      fintech: [
        { code: "FTS 2101", name: "Mathematics for Finance", papers: [] },
        { code: "FTS 2102", name: "Object Oriented Programming", papers: [] },
        { code: "FTS 2103", name: "Algorithms & Data Structures", papers: [] },
        { code: "FTS 2104", name: "Introduction to Banking, Payments and Capital Markets", papers: [] },
        { code: "FTS 2105", name: "Database Management System", papers: [] },
      ],
    },
  },
  {
    number: 4,
    slug: "semester-4",
    comingSoon: true,
    subjects: [
      { code: "CS204", name: "Design & Analysis of Algorithms", papers: makePapers(13) },
      { code: "CS205", name: "Computer Organization", papers: makePapers(14) },
      { code: "CS206", name: "Database Management Systems", papers: makePapers(15) },
      { code: "MA202", name: "Probability & Statistics", papers: makePapers(16) },
    ],
  },
  {
    number: 5,
    slug: "semester-5",
    branches: { cce: [] },
    branchOptions: ["cce"],
  },
  {
    number: 6,
    slug: "semester-6",
    comingSoon: true,
    subjects: [
      { code: "CS305", name: "Machine Learning", papers: makePapers(21) },
      { code: "CS306", name: "Compiler Design", papers: makePapers(22) },
      { code: "CS307", name: "Artificial Intelligence", papers: makePapers(23) },
      { code: "CS308", name: "Distributed Systems", papers: makePapers(24) },
    ],
  },
  {
    number: 7,
    slug: "semester-7",
    comingSoon: true,
    subjects: [
      { code: "CS401", name: "Cloud Computing", papers: makePapers(25) },
      { code: "CS402", name: "Information Security", papers: makePapers(26) },
      { code: "CS403", name: "Big Data Analytics", papers: makePapers(27) },
      { code: "CS404", name: "Elective I", papers: makePapers(28) },
    ],
  },
  {
    number: 8,
    slug: "semester-8",
    comingSoon: true,
    subjects: [
      { code: "CS405", name: "Elective II", papers: makePapers(29) },
      { code: "CS406", name: "Elective III", papers: makePapers(30) },
      { code: "CS407", name: "Project Work", papers: makePapers(31) },
    ],
  },
];

export function getSemester(number: number): Semester | undefined {
  return semesters.find((s) => s.number === number);
}

/** A course row as stored in the Supabase `courses` table. */
export type Course = {
  id: string;
  semester: number;
  stream: Stream | null;
  cycle: Cycle | null;
  branch: Branch | null;
  code: string;
  name: string;
  position: number;
};

export type SemesterSetting = {
  semester: number;
  coming_soon: boolean;
  /** When set, this non-stream semester uses these branches instead of its
   * built-in structure. This lets admins turn any later semester into a
   * branch-based curriculum. */
  branches?: Branch[] | null;
};

/** Course rows equivalent to the built-in curriculum above, used to fill the
 *  `courses` table the first time the admin edits anything. Placeholder
 *  semesters (still flagged comingSoon with a flat list) are left out. */
export function defaultCourseRows(): Omit<Course, "id">[] {
  const rows: Omit<Course, "id">[] = [];
  for (const sem of semesters) {
    if (sem.comingSoon && sem.subjects) continue;
    if (sem.streams) {
      for (const { id: stream } of STREAMS) {
        for (const { id: cycle } of CYCLES) {
          (sem.streams[stream]?.[cycle] ?? []).forEach((subject, position) => {
            rows.push({ semester: sem.number, stream, cycle, branch: null, code: subject.code, name: subject.name, position });
          });
        }
      }
    } else if (sem.branches) {
      const branchIds = sem.branchOptions ?? BRANCHES.map((branch) => branch.id);
      for (const branch of branchIds) {
        (sem.branches[branch] ?? []).forEach((subject, position) => {
          rows.push({ semester: sem.number, stream: null, cycle: null, branch, code: subject.code, name: subject.name, position });
        });
      }
    } else {
      (sem.subjects ?? []).forEach((subject, position) => {
        rows.push({ semester: sem.number, stream: null, cycle: null, branch: null, code: subject.code, name: subject.name, position });
      });
    }
  }
  return rows;
}

/** Builds the curriculum from database rows, keeping each semester's
 *  stream/cycle/branch structure from the built-in data. With no rows (table
 *  empty or unreachable) the built-in curriculum is used as is. */
export function buildSemesters(courses: Course[], settings: SemesterSetting[] = []): Semester[] {
  if (courses.length === 0) return semesters;

  const settingsBySemester = new Map(settings.map((s) => [s.semester, s]));
  const sorted = [...courses].sort((a, b) => a.position - b.position || a.code.localeCompare(b.code));
  const pick = (n: number, stream: Stream | null, cycle: Cycle | null, branch: Branch | null): Subject[] =>
    sorted
      .filter((c) => c.semester === n && c.stream === stream && c.cycle === cycle && c.branch === branch)
      .map((c) => ({ code: c.code, name: c.name, papers: [] }));

  return semesters.map((base) => {
    const setting = settingsBySemester.get(base.number);
    const comingSoon = setting?.coming_soon ?? base.comingSoon ?? false;

    if (base.streams) {
      const streams = {} as Record<Stream, Record<Cycle, Subject[]>>;
      for (const { id: stream } of STREAMS) {
        streams[stream] = {} as Record<Cycle, Subject[]>;
        for (const { id: cycle } of CYCLES) {
          streams[stream][cycle] = pick(base.number, stream, cycle, null);
        }
      }
      return { ...base, comingSoon, streams };
    }

    const configuredBranches = setting?.branches;
    if (base.branches || configuredBranches) {
      const branches: Partial<Record<Branch, Subject[]>> = {};
      const branchIds =
        configuredBranches ?? base.branchOptions ?? BRANCHES.map((branch) => branch.id);
      for (const branch of branchIds) {
        branches[branch] = pick(base.number, null, null, branch);
      }
      return { ...base, comingSoon, branches };
    }

    return { ...base, comingSoon, subjects: pick(base.number, null, null, null) };
  });
}

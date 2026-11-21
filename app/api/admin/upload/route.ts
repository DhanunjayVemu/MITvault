import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { PAPERS_BUCKET, PAPERS_TABLE } from "@/lib/supabase/browserClient";
import { isAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";

const VALID_EXAMS = ["End Sem", "Mid Sem", "Quiz"];
const VALID_STREAMS = ["cs", "non-cs"];
const VALID_CYCLES = ["physics", "chemistry"];
function isMissingColumnError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  // PostgREST uses two different wordings here. A freshly migrated database
  // returns "column ... does not exist", while a stale schema cache returns
  // "Could not find the 'branch' column ... in the schema cache" (PGRST204).
  return (
    message.includes("column") &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

/** Storage object keys need a conservative filename. Keep the user's original
 * filename in `file_name` for display, but use an ASCII-only key segment so
 * names containing brackets, emoji, or other punctuation upload reliably. */
function storageFileName(fileName: string) {
  const safe = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  return safe || "paper.pdf";
}

/** Column sets to try when inserting, most complete first — mirrors the
 *  read-side fallback in lib/papers.ts. Older installations may be missing
 *  `file_name`, `branch`, or both. */
const INSERT_VARIANTS: { file_name: boolean; branch: boolean }[] = [
  { file_name: true, branch: true },
  { file_name: false, branch: true },
  { file_name: true, branch: false },
  { file_name: false, branch: false },
];

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const semesterRaw = formData.get("semester");
  const streamRaw = formData.get("stream"); // "" when the semester has no streams
  const cycleRaw = formData.get("cycle"); // "" when the semester has no streams
  const branchRaw = formData.get("branch"); // "" when the semester has no branches
  const subjectCode = formData.get("subjectCode");
  const year = formData.get("year");
  const exam = formData.get("exam");

  if (!(file instanceof File) || !semesterRaw || !subjectCode || !year || !exam) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }
  if (!VALID_EXAMS.includes(String(exam))) {
    return NextResponse.json({ error: "Invalid exam type" }, { status: 400 });
  }
  const stream = streamRaw ? String(streamRaw) : null;
  const cycle = cycleRaw ? String(cycleRaw) : null;
  const branch = branchRaw ? String(branchRaw) : null;
  if (stream && !VALID_STREAMS.includes(stream)) {
    return NextResponse.json({ error: "Invalid stream" }, { status: 400 });
  }
  if (cycle && !VALID_CYCLES.includes(cycle)) {
    return NextResponse.json({ error: "Invalid cycle" }, { status: 400 });
  }
  if (branch && branch.length > 80) {
    return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
  }

  const semester = Number(semesterRaw);
  if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
    return NextResponse.json({ error: "Invalid semester" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const safeCode = String(subjectCode).trim().replace(/\s+/g, "-").toLowerCase();
  // The original name is stored separately for display. The object-key name
  // is deliberately stricter because Supabase Storage rejects some filename
  // characters (for example, the square brackets in "[ICT_2156]").
  const originalFileName = file.name;
  const objectFileName = storageFileName(file.name);
  const path = [
    `semester-${semester}`,
    stream,
    cycle,
    branch,
    safeCode,
    String(Date.now()),
    objectFileName,
  ]
    .filter(Boolean)
    .join("/");

 const arrayBuffer = await file.arrayBuffer();

  try {
    await uploadToR2(
      path,
      Buffer.from(arrayBuffer),
      "application/pdf"
    );
  } catch (error) {
    console.error("[pyqvault] R2 upload failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "R2 upload failed",
      },
      { status: 500 }
    );
  }

  const insertResponse = await supabase
    .from(PAPERS_TABLE)
    .insert({
      subject_code: String(subjectCode).trim(),
      semester,
      stream,
      cycle,
      branch,
      year: String(year).trim(),
      exam: String(exam),
      file_name: originalFileName,
      storage_path: path,
    })
    .select()
    .single();

  // Keep uploads working for databases created before the optional file_name
  // and/or branch metadata was introduced. Those files use their storage
  // filename in the UI, and won't be filed under a branch. Try every column
  // combination in turn rather than assuming only one column is ever
  // missing at a time.
  let row = insertResponse.data;
  let insertError = insertResponse.error;
  for (const variant of INSERT_VARIANTS.slice(1)) {
    if (!insertError || !isMissingColumnError(insertError)) break;
    const record: Record<string, unknown> = {
      subject_code: String(subjectCode).trim(),
      semester,
      stream,
      cycle,
      year: String(year).trim(),
      exam: String(exam),
      storage_path: path,
    };
    if (variant.branch) record.branch = branch;
    if (variant.file_name) record.file_name = originalFileName;

    const legacyResponse = await supabase
      .from(PAPERS_TABLE)
      .insert(record)
      .select()
      .single();
    row = legacyResponse.data;
    insertError = legacyResponse.error;
  }

  if (insertError) {
    // Best-effort cleanup so a failed insert doesn't leave an orphaned file.
    try {
    await deleteFromR2(path);
  } catch (cleanupError) {
    console.error("[pyqvault] Failed to clean up R2 object:", cleanupError);
  }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ paper: row }, { status: 201 });
}

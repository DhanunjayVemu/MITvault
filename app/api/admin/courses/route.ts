import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { PAPERS_TABLE } from "@/lib/supabase/browserClient";
import { COURSES_TABLE, SEMESTER_SETTINGS_TABLE } from "@/lib/courses";
import { isAuthorized } from "@/lib/adminAuth";
import { CYCLES, STREAMS, defaultCourseRows, semesters } from "@/data/pyq-data";

export const runtime = "nodejs";

type Group = {
  semester: number;
  stream: string | null;
  cycle: string | null;
  branch: string | null;
};

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

function parseGroup(body: Record<string, unknown>): Group | string {
  const semester = Number(body.semester);
  const base = semesters.find((s) => s.number === semester);
  if (!Number.isInteger(semester) || !base) return "Invalid semester";

  const stream = body.stream ? String(body.stream) : null;
  const cycle = body.cycle ? String(body.cycle) : null;
  const branch = body.branch ? String(body.branch) : null;

  if (base.streams) {
    if (!STREAMS.some((s) => s.id === stream)) return "Choose a stream";
    if (!CYCLES.some((c) => c.id === cycle)) return "Choose a cycle";
    return { semester, stream, cycle, branch: null };
  }
  if (base.branches) {
    if (!branch?.trim()) return "Choose a branch";
    return { semester, stream: null, cycle: null, branch };
  }
  if (branch?.trim()) return { semester, stream: null, cycle: null, branch };
  return { semester, stream: null, cycle: null, branch: null };
}

/** The site switches to database courses as soon as the table has rows, so
 *  the built-in curriculum is copied in before the first change. Otherwise
 *  adding one course to an empty table would hide every built-in course. */
async function ensureSeeded(supabase: SupabaseClient): Promise<string | null> {
  const { count, error } = await supabase
    .from(COURSES_TABLE)
    .select("id", { count: "exact", head: true });
  if (error) return error.message;
  if ((count ?? 0) > 0) return null;

  const { error: insertError } = await supabase.from(COURSES_TABLE).insert(defaultCourseRows());
  // 23505: a concurrent request seeded it first.
  if (insertError && insertError.code !== "23505") return insertError.message;
  return null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const supabase = getSupabaseAdminClient();
  const seedError = await ensureSeeded(supabase);
  if (seedError) return bad(seedError, 500);

  const [courses, settings] = await Promise.all([
    supabase.from(COURSES_TABLE).select("*").order("position", { ascending: true }),
    supabase.from(SEMESTER_SETTINGS_TABLE).select("*"),
  ]);
  if (courses.error) return bad(courses.error.message, 500);
  if (settings.error) return bad(settings.error.message, 500);

  return NextResponse.json({ courses: courses.data, settings: settings.data });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body");

  const group = parseGroup(body);
  if (typeof group === "string") return bad(group);

  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!code || !name) return bad("Course code and name are required");

  const supabase = getSupabaseAdminClient();
  const seedError = await ensureSeeded(supabase);
  if (seedError) return bad(seedError, 500);

  const { count: semesterCount } = await supabase
    .from(COURSES_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("semester", group.semester);

  let last = supabase
    .from(COURSES_TABLE)
    .select("position")
    .eq("semester", group.semester);
  last = group.stream ? last.eq("stream", group.stream) : last.is("stream", null);
  last = group.cycle ? last.eq("cycle", group.cycle) : last.is("cycle", null);
  last = group.branch ? last.eq("branch", group.branch) : last.is("branch", null);
  const { data: lastRow } = await last.order("position", { ascending: false }).limit(1);
  const position = (lastRow?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from(COURSES_TABLE)
    .insert({ ...group, code, name, position })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return bad("That course code already exists here.", 409);
    return bad(error.message, 500);
  }

  // First course in a semester that was still "Coming soon" → publish it.
  if ((semesterCount ?? 0) === 0) {
    await supabase
      .from(SEMESTER_SETTINGS_TABLE)
      .upsert({ semester: group.semester, coming_soon: false });
  }

  return NextResponse.json({ course: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body");

  const id = String(body.id ?? "");
  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!id) return bad("Missing id");
  if (!code || !name) return bad("Course code and name are required");

  const supabase = getSupabaseAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from(COURSES_TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !existing) return bad(fetchError?.message ?? "Not found", 404);

  const { error } = await supabase.from(COURSES_TABLE).update({ code, name }).eq("id", id);
  if (error) {
    if (error.code === "23505") return bad("That course code already exists here.", 409);
    return bad(error.message, 500);
  }

  // Uploaded papers are matched to a course by its code, so move them along.
  if (code !== existing.code) {
    let papers = supabase
      .from(PAPERS_TABLE)
      .update({ subject_code: code })
      .eq("semester", existing.semester)
      .eq("subject_code", existing.code);
    if (existing.stream) papers = papers.eq("stream", existing.stream);
    if (existing.cycle) papers = papers.eq("cycle", existing.cycle);
    if (existing.branch) papers = papers.eq("branch", existing.branch);

    const { error: papersError } = await papers;
    if (papersError) {
      await supabase.from(COURSES_TABLE).update({ code: existing.code, name: existing.name }).eq("id", id);
      return bad(papersError.message, 500);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const body = await readBody(req);
  const id = body ? String(body.id ?? "") : "";
  if (!id) return bad("Missing id");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(COURSES_TABLE).delete().eq("id", id);
  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true });
}

/** Toggles a semester between live and "Coming soon". */
export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) return unauthorized();

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body");

  const semester = Number(body.semester);
  if (!Number.isInteger(semester) || !semesters.some((s) => s.number === semester)) {
    return bad("Invalid semester");
  }
  const base = semesters.find((s) => s.number === semester);
  const branchesProvided = Object.hasOwn(body, "branches");
  const branches = branchesProvided ? body.branches : undefined;
  if (typeof body.comingSoon !== "boolean") return bad("Missing comingSoon");
  if (branchesProvided) {
    if (base?.streams) return bad("Semesters with streams cannot use branches");
    if (!Array.isArray(branches) || branches.length === 0) return bad("Choose at least one branch");
    const normalizedBranches = branches.map((branch) => (typeof branch === "string" ? branch.trim() : ""));
    if (
      normalizedBranches.some((branch) => !branch || branch.length > 80) ||
      new Set(normalizedBranches.map((branch) => branch.toLowerCase())).size !== normalizedBranches.length
    ) {
      return bad("Invalid branches");
    }
    branches.splice(0, branches.length, ...normalizedBranches);
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from(SEMESTER_SETTINGS_TABLE)
    .upsert({
      semester,
      coming_soon: body.comingSoon,
      ...(branchesProvided ? { branches } : {}),
    });
  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true });
}

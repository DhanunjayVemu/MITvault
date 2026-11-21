import { getSupabaseBrowserClient } from "./supabase/browserClient";
import { buildSemesters, semesters, type Course, type Semester, type SemesterSetting } from "@/data/pyq-data";

export const COURSES_TABLE = "courses";
export const SEMESTER_SETTINGS_TABLE = "semester_settings";

export async function fetchCurriculum(): Promise<Semester[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return semesters;

  const [coursesRes, settingsRes] = await Promise.all([
    supabase.from(COURSES_TABLE).select("id, semester, stream, cycle, branch, code, name, position"),
    supabase.from(SEMESTER_SETTINGS_TABLE).select("semester, coming_soon, branches"),
  ]);

  if (coursesRes.error || !coursesRes.data) return semesters;
  return buildSemesters(
    coursesRes.data as Course[],
    settingsRes.error ? [] : ((settingsRes.data ?? []) as SemesterSetting[])
  );
}

import { getSupabaseBrowserClient, PAPERS_TABLE } from "./supabase/browserClient";
import { paperKey, type Paper, type PaperMap, type Stream, type Cycle, type Branch } from "@/data/pyq-data";

type PaperRow = {
  id: string;
  subject_code: string;
  semester: number;
  stream: Stream | null;
  cycle: Cycle | null;
  branch: Branch | null;
  year: string;
  exam: "End Sem" | "Mid Sem" | "Quiz";
  file_name: string | null;
  storage_path: string;
};

export type { PaperMap };



/** Older databases may not yet have the optional `branch` column. The upload
 * path has always included the branch, so retain that information while the
 * database migration is being applied instead of showing those papers under
 * every branch. */
function branchFromStoragePath(semester: number, storagePath: string): Branch | null {
  if (semester === 1 || semester === 2) return null;
  const parts = storagePath.split("/");
  if (parts.length < 5) return null;
  const candidate = parts[1] as Branch | undefined;
  return candidate && candidate.length <= 80 ? candidate : null;
}


export async function fetchAllPapers(): Promise<PaperMap> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from(PAPERS_TABLE)
    .select(
      "id, subject_code, semester, stream, cycle, year, exam, storage_path"
    )
    .order("year", { ascending: false });

  if (error || !data) {
    console.error(
      "[pyqvault] Failed to load papers from Supabase:",
      error?.message
    );
    return {};
  }

  const map: PaperMap = {};

  for (const partial of data) {
    const row: PaperRow = {
      id: partial.id,
      subject_code: partial.subject_code,
      semester: partial.semester,
      stream: partial.stream ?? null,
      cycle: partial.cycle ?? null,

      // branch is NOT fetched from Supabase.
      // We derive it from the storage path.
      branch: branchFromStoragePath(
        partial.semester,
        partial.storage_path
      ),

      year: partial.year,
      exam: partial.exam,
      file_name: null,
      storage_path: partial.storage_path,
    };

    const key = paperKey(
      row.semester,
      row.stream,
      row.cycle,
      row.subject_code,
      row.branch
    );

    const r2BaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    if (!r2BaseUrl) {
      console.error(
        "[pyqvault] NEXT_PUBLIC_R2_PUBLIC_URL is not configured"
      );
      continue;
    }

    const paperUrl =
      `${r2BaseUrl.replace(/\/$/, "")}/${row.storage_path}`;

    const paper: Paper = {
      id: row.id,
      year: row.year,
      exam: row.exam,
      fileName: row.file_name ?? undefined,
      url: paperUrl,
      storagePath: row.storage_path,
    };

    map[key] = map[key]
      ? [...map[key], paper]
      : [paper];
  }

  return map;
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { PAPERS_TABLE } from "@/lib/supabase/browserClient";
import { isAuthorized } from "@/lib/adminAuth";
import { deleteFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

/** Lists every uploaded paper, newest first — used by the admin page's
 *  "recent uploads" table. Also doubles as the password check the admin
 *  page runs right after you type it in. */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(PAPERS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ papers: data });
}

/** Deletes a paper: removes the file from storage, then the metadata row. */
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const { data: row, error: fetchError } = await supabase
    .from(PAPERS_TABLE)
    .select("storage_path")
    .eq("id", body.id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: fetchError?.message ?? "Not found" }, { status: 404 });
  }

  try {
  await deleteFromR2(row.storage_path);
} catch (error) {
  console.error("[pyqvault] R2 delete failed:", error);

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "R2 delete failed",
    },
    { status: 500 }
  );
}

  const { error: deleteError } = await supabase.from(PAPERS_TABLE).delete().eq("id", body.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

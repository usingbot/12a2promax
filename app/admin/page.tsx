import { redirect } from "next/navigation";
import { adminSession } from "@/lib/supabase/server";
import { photoFields, photoView } from "@/lib/gallery";
import Shell from "@/components/admin/Shell";
import Moderation from "@/components/admin/Moderation";
import type { Status } from "@/lib/model";
export const dynamic = "force-dynamic";
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await adminSession();
  if (!session) redirect("/admin/login");
  const { db } = session,
    params = await searchParams;
  const status = ["pending", "approved", "rejected"].includes(
    params.status ?? "",
  )
    ? (params.status as Status)
    : "all";
  const search = (params.q ?? "").slice(0, 100),
    page = Math.max(1, Math.min(100000, Math.trunc(Number(params.page) || 1)));
  let query = db
    .from("photos")
    .select(`${photoFields},status` as const, { count: "exact" });
  if (status !== "all") query = query.eq("status", status);
  if (search.trim()) {
    const needle = search
      .trim()
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')
      .replace(/[%_*]/g, (c) => "\\" + c);
    query = query.or(
      `caption.ilike."%${needle}%",uploader_name.ilike."%${needle}%"`,
    );
  }
  const [list, pending, approved, all] = await Promise.all([
    query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * 24, page * 24 - 1),
    db
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    db.from("photos").select("id", { count: "exact", head: true }),
  ]);
  if (list.error || pending.error || approved.error || all.error)
    throw Error("Không thể tải danh sách.");
  const rows = (list.data ?? []) as unknown as (Parameters<
    typeof photoView
  >[0] & { status: Status })[];
  return (
    <Shell active="photos">
      <h1 className="admin-title">Quản lý kỷ niệm</h1>
      <div className="stats">
        {[
          ["Chờ duyệt", pending.count],
          ["Đã duyệt", approved.count],
          ["Tổng số ảnh", all.count],
        ].map(([label, n]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <Moderation
        key={JSON.stringify([status, search, page])}
        photos={rows.map((row) => ({
          ...photoView(row, true),
          status: row.status,
        }))}
        status={status}
        search={search}
        page={page}
        total={list.count ?? 0}
      />
    </Shell>
  );
}

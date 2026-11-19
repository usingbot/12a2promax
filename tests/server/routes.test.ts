import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { POST as submit } from "../../app/api/submissions/route";
import { POST as moderate } from "../../app/api/admin/photos/route";
import { POST as settings } from "../../app/api/admin/settings/route";
import { GET as readPhoto } from "../../app/api/photos/[id]/route";
import { getGallery } from "../../lib/gallery";
const origin = "https://class.example";
const post = (url: string, body?: BodyInit) =>
  new Request(origin + url, { method: "POST", headers: { origin }, body });
test("missing connection disables writes and returns an explicit demo state", async (t) => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  t.after(() => {
    if (previous) process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  });
  const gallery = await getGallery();
  assert.equal(gallery.connection, "unconfigured");
  assert.equal(gallery.uploadAvailable, false);
  assert.equal((await submit(post("/api/submissions"))).status, 503);
  assert.equal((await moderate(post("/api/admin/photos"))).status, 403);
  assert.equal((await settings(post("/api/admin/settings"))).status, 403);
});
test("controlled submission, idempotent retry and private-media reads through the SDK with a local transport", async (t) => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-only-anon",
    SUPABASE_SERVICE_ROLE_KEY: "local-only-service",
    UPLOAD_RATE_LIMIT_SECRET: "0".repeat(48),
  };
  for (const [key, value] of Object.entries(env)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  type RecordRow = {
    id: string;
    status: string;
    storage_path: string;
    caption: string;
  };
  let record: RecordRow | undefined,
    allowed = true;
  const objects: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, options?: RequestInit) => {
      const req = new Request(input, options);
      const u = new URL(req.url);
      const json = (value: unknown) => Response.json(value);
      if (u.pathname === "/rest/v1/rpc/consume_upload_quota")
        return json(allowed);
      if (u.pathname === "/rest/v1/photos") {
        if (req.method === "POST") {
          record = await req.json();
          return new Response(null, { status: 201 });
        }
        if (
          u.searchParams.get("status") === "eq.approved" &&
          record?.status !== "approved"
        )
          return json([]);
        return json(record ? [record] : []);
      }
      if (u.pathname.startsWith("/storage/v1/object/memories/")) {
        objects.push(u.pathname);
        return json({ Key: u.pathname });
      }
      if (u.pathname.startsWith("/storage/v1/object/sign/memories/"))
        return json({
          signedURL: "/object/sign/memories/file.webp?token=fixture",
        });
      throw Error("Unexpected request " + u.pathname);
    },
  );
  const bytes = new Uint8Array(await readFile("public/demo/friends.webp"));
  const f = new FormData();
  f.set("file", new File([bytes], "anh.webp", { type: "image/webp" }));
  f.set("request_id", crypto.randomUUID());
  f.set("caption", "Kỷ niệm");
  f.set("uploader_name", "Linh");
  f.set("status", "approved");
  assert.equal((await submit(post("/api/submissions", f))).status, 201);
  assert.equal(record?.status, "pending");
  assert.equal(objects.length, 2);
  assert.notEqual(objects[0], objects[1]);
  assert.equal((await submit(post("/api/submissions", f))).status, 200);
  assert.equal(objects.length, 2);
  const id = record!.id,
    params = Promise.resolve({ id });
  const request = new Request(origin + "/api/photos/" + id);
  assert.equal((await readPhoto(request, { params })).status, 404);
  record!.status = "rejected";
  assert.equal((await readPhoto(request, { params })).status, 404);
  allowed = false;
  assert.equal((await submit(post("/api/submissions", f))).status, 429);
});

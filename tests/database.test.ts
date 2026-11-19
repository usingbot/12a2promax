import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Supabase migration, moderation, storage rules and persistence on local PostgreSQL", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  // Supabase supplies these platform schemas and roles in a deployed project.
  await db.exec(`
    create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,delete on storage.objects to anon,authenticated;
    create policy existing_shared_policy on storage.objects for all using(true) with check(true);
  `);
  await db.exec(
    await readFile(
      "supabase/migrations/202611190001_vintage_memories.sql",
      "utf8",
    ),
  );
  const moderator = "11111111-1111-4111-8111-111111111111",
    guest = "22222222-2222-4222-8222-222222222222",
    photo = "33333333-3333-4333-8333-333333333333",
    path = photo + ".webp";
  await db.exec(
    `insert into auth.users values('${moderator}'),('${guest}');insert into public.admin_users(user_id) values('${moderator}');insert into storage.objects values('memories','original.webp'),('theme','music.mp3'),('shared','other.webp');`,
  );
  async function size(sql: string) {
    return (await db.query(sql)).rows.length;
  }
  async function role(name: string, id = "") {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role " + name);
  }
  await t.test(
    "empty site has a singleton settings row and two private buckets",
    async () => {
      assert.equal(await size("select * from photos"), 0);
      assert.equal(
        await size("select * from storage.buckets where not public"),
        2,
      );
      assert.equal(await size("select * from site_settings where id=1"), 1);
    },
  );
  await t.test(
    "only the controlled service can submit a pending photo",
    async () => {
      await role("service_role");
      await db.query(
        "insert into photos(id,storage_path,uploader_name,caption) values($1,$2,'An','Sân trường')",
        [photo, path],
      );
      assert.deepEqual((await db.query("select status from photos")).rows, [
        { status: "pending" },
      ]);
      await role("anon");
      assert.equal(await size("select id from photos"), 0);
      await assert.rejects(
        db.query(
          "insert into photos(storage_path,uploader_name,caption) values($1,'An','Ảnh')",
          [path],
        ),
      );
      await assert.rejects(db.query("update photos set status='approved'"));
      await assert.rejects(db.query("delete from photos"));
      assert.deepEqual(
        (await db.query("select bucket_id from storage.objects")).rows,
        [{ bucket_id: "shared" }],
      );
    },
  );
  await t.test(
    "a signed-in non-admin cannot grant membership or change moderation/settings",
    async () => {
      await role("authenticated", guest);
      assert.equal(await size("select * from admin_users"), 0);
      await assert.rejects(
        db.query("insert into admin_users(user_id) values($1)", [guest]),
      );
      assert.equal(
        await size("update photos set status='approved' returning id"),
        0,
      );
      assert.equal(
        await size("update site_settings set default_volume=90 returning id"),
        0,
      );
    },
  );
  await t.test(
    "approval exposes an image, rejection hides it, deletion queues both image sizes",
    async () => {
      await role("authenticated", moderator);
      assert.equal(await size("select * from admin_users"), 1);
      await db.exec(
        "update photos set status='approved',caption='Ngày cuối năm'",
      );
      await role("anon");
      assert.deepEqual((await db.query("select caption from photos")).rows, [
        { caption: "Ngày cuối năm" },
      ]);
      await role("authenticated", moderator);
      await db.exec("update photos set status='rejected'");
      await role("anon");
      assert.equal(await size("select id from photos"), 0);
      await role("authenticated", moderator);
      assert.equal(await size("delete from photos returning id"), 1);
      await role("service_role");
      assert.equal(
        await size("select * from asset_cleanup where bucket='memories'"),
        2,
      );
    },
  );
  await t.test(
    "settings persist across roles and stale updates do not overwrite a newer edit",
    async () => {
      await role("authenticated", moderator);
      const {
        rows: [old],
      } = await db.query<{ v: string }>(
        "select updated_at::text as v from site_settings",
      );
      await db.query(
        "update site_settings set site_title='Lưu bút',default_volume=61,music_path=$1,floating_speed=1.5,background_color='#334433' where updated_at=$2",
        [photo + ".mp3", old.v],
      );
      assert.equal(
        await size(
          `update site_settings set default_volume=1 where updated_at='${old.v}' returning id`,
        ),
        0,
      );
      await role("anon");
      assert.deepEqual(
        (
          await db.query(
            "select site_title,default_volume,background_color from site_settings",
          )
        ).rows,
        [
          {
            site_title: "Lưu bút",
            default_volume: 61,
            background_color: "#334433",
          },
        ],
      );
      await role("authenticated", moderator);
      await db.exec("update site_settings set music_path=null");
      await role("service_role");
      assert.equal(
        await size("select * from asset_cleanup where bucket='theme'"),
        1,
      );
    },
  );
  await t.test(
    "database-backed hourly quota persists and is limited to the service role",
    async () => {
      await role("service_role");
      for (let i = 0; i < 13; i++)
        assert.deepEqual(
          (await db.query("select consume_upload_quota('local-key') as ok"))
            .rows,
          [{ ok: i < 12 }],
        );
      await db.exec(
        "update upload_limits set window_start=now()-interval '61 minutes'",
      );
      assert.deepEqual(
        (await db.query("select consume_upload_quota('local-key') as ok")).rows,
        [{ ok: true }],
      );
      await role("anon");
      await assert.rejects(
        db.query("select consume_upload_quota('local-key')"),
      );
    },
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { optimizeImage, validateMp3 } from "../lib/validation/media";
import { parseMetadata, imageIssue } from "../lib/validation/photo";
import { parseSettings } from "../lib/validation/settings";
import { defaults } from "../lib/model";
import { readForm } from "../lib/http";
test("public fields are allowlisted and real calendar dates are checked", () => {
  const f = new FormData();
  f.set("uploader_name", "  Lan ");
  f.set("caption", "Lưu bút");
  f.set("status", "approved");
  f.set("memory_date", "2027-02-28");
  assert.deepEqual(parseMetadata(f), {
    uploader_name: "Lan",
    caption: "Lưu bút",
    memory_date: "2027-02-28",
  });
  f.set("memory_date", "2027-02-29");
  assert.throws(() => parseMetadata(f));
});
test("image processing produces two bounded WebP files and checks actual file content", async () => {
  const sample = await readFile("public/demo/schoolyard.webp");
  const { main, small } = await optimizeImage(
    new File([new Uint8Array(sample)], "anh.webp", { type: "image/webp" }),
  );
  assert.equal((await sharp(main).metadata()).format, "webp");
  assert.ok(((await sharp(small!).metadata()).width ?? 0) <= 640);
  assert.equal((await sharp(main).metadata()).exif, undefined);
  await assert.rejects(
    optimizeImage(
      new File([new Uint8Array(sample)], "anh.jpg", { type: "image/jpeg" }),
    ),
  );
  assert.ok(
    imageIssue(
      new File([new Uint8Array(4194305)], "anh.png", { type: "image/png" }),
    ),
  );
});
test("music validation accepts the local MP3 and rejects invalid audio", async () => {
  const track = await readFile("public/audio/chieu-san-truong.mp3");
  assert.ok(
    (
      await validateMp3(
        new File([new Uint8Array(track)], "nhac.mp3", { type: "audio/mpeg" }),
      )
    ).length,
  );
  await assert.rejects(
    validateMp3(
      new File(["không phải âm thanh"], "loi.mp3", { type: "audio/mpeg" }),
    ),
  );
});
test("settings limits and allowed fields match the database", () => {
  assert.equal(
    parseSettings({ ...defaults, id: 4, music_path: "secret" })
      .max_visible_photos,
    8,
  );
  assert.ok(!("music_path" in parseSettings(defaults)));
  assert.throws(() => parseSettings({ ...defaults, default_volume: 101 }));
  assert.throws(() => parseSettings({ ...defaults, floating_speed: 0 }));
});
test("multipart size limit works without a Content-Length header", async () => {
  const f = new FormData();
  f.set("caption", "12A2");
  const encoded = new Request("http://example.test", {
    method: "POST",
    body: f,
  });
  const bytes = await encoded.arrayBuffer();
  const req = () =>
    new Request("http://example.test", {
      method: "POST",
      body: bytes,
      headers: encoded.headers,
    });
  assert.equal((await readForm(req())).get("caption"), "12A2");
  await assert.rejects(readForm(req(), 12));
});

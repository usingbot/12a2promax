import { test, expect } from "@playwright/test";

test("responsive gallery, viewer and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator(".entry-btn")).toBeVisible();
  await expect(page.locator(".polaroid").first()).toBeVisible();
  await expect(page.locator(".drift").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
  const frame = page.locator(".polaroid").first();
  await frame.focus();
  await frame.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Chi tiết kỷ niệm" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(frame).toBeFocused();
  await page.getByRole("button", { name: "Bước vào miền ký ức" }).click();
  await expect(page.locator(".scene.entered")).toBeVisible();
  const mobile = await page.evaluate(
    () => matchMedia("(max-width: 680px)").matches,
  );
  expect(await page.locator(".photo-slot").count()).toBeLessThanOrEqual(
    mobile ? 4 : 12,
  );
  await page.getByRole("button", { name: "Album", exact: true }).click();
  await expect(page.locator(".full-album")).toBeVisible();
  await page.getByRole("button", { name: "Về ảnh trôi" }).click();
  await expect(page.locator(".scene")).toBeVisible();
});

test("motion control and photo upload preview", async ({ page }) => {
  await page.goto("/");
  const pause = page.getByRole("button", { name: "Tạm dừng" });
  if (await pause.isEnabled()) {
    await pause.click();
    await expect(page.locator(".drift").first()).toHaveCSS(
      "animation-play-state",
      "paused",
    );
    await page.getByRole("button", { name: "Tiếp tục" }).click();
  }
  await page.locator(".send-tool").click();
  const dialog = page.getByRole("dialog", { name: "Gửi kỷ niệm" });
  await expect(dialog).toBeVisible();
  await dialog
    .locator('input[type="file"]')
    .setInputFiles(["public/demo/schoolyard.webp", "public/demo/friends.webp"]);
  await expect(dialog.locator(".upload-previews img")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Bỏ ảnh schoolyard.webp" }).click();
  await expect(dialog.locator(".upload-previews img")).toHaveCount(1);
  await dialog.getByLabel("Tên người gửi").fill("Lớp 12A2");
  await dialog.getByLabel("Lời nhắn").fill("Sân trường năm ấy");
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("guest is redirected from protected pages", async ({ page }) => {
  for (const path of ["/admin", "/admin/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(
      page.getByRole("heading", { name: "Đăng nhập quản trị" }),
    ).toBeVisible();
  }
});

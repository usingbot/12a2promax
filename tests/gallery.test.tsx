import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { defaults, demoPhotos } from "../lib/model";
import Scrapbook from "../components/gallery/Scrapbook";
import SettingsEditor from "../components/admin/SettingsEditor";
import Upload from "../components/upload/Upload";

const dom = new JSDOM("<!doctype html><html lang='vi'><body></body></html>", {
  url: "https://class.example/",
});
const w = dom.window;
for (const [key, value] of Object.entries({
  self: w,
  window: w,
  document: w.document,
  navigator: w.navigator,
  HTMLElement: w.HTMLElement,
  HTMLDialogElement: w.HTMLDialogElement,
  FormData: w.FormData,
  File: w.File,
  MutationObserver: w.MutationObserver,
  requestAnimationFrame: (fn: FrameRequestCallback) =>
    setTimeout(() => fn(0), 0),
  cancelAnimationFrame: clearTimeout,
})) {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
}
let mobile = false,
  reduced = false;
w.matchMedia = (query: string) => ({
  matches: query.includes("max-width") ? mobile : reduced,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
  onchange: null,
});
w.HTMLElement.prototype.scrollIntoView = () => {};
w.HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
w.HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
// Testing Library binds its document when loaded, after JSDOM initialization.
const { render, fireEvent, cleanup, within, waitFor } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(() => {
  cleanup();
  mobile = false;
  reduced = false;
});
function home() {
  return render(
    createElement(Scrapbook, {
      photos: [],
      total: 0,
      settings: defaults,
      connection: "unconfigured",
      uploadAvailable: false,
    }),
  );
}

test("demo scrapbook, modal, shuffle, pause and album controls", () => {
  const ui = home();
  assert.equal(ui.container.querySelectorAll(".photo-slot").length, 4);
  assert.ok(ui.getByText("Bộ ảnh minh họa"));
  const initial = ui.container
    .querySelector(".polaroid")!
    .getAttribute("aria-label");
  fireEvent.click(ui.container.querySelector(".polaroid")!);
  const viewer = ui.getByRole("dialog");
  assert.match(viewer.textContent!, /Sân trường năm ấy/);
  assert.match(viewer.textContent!, /Bộ ảnh minh họa/);
  fireEvent.click(within(viewer).getByRole("button", { name: "Đóng" }));
  assert.equal(ui.queryByRole("dialog"), null);
  fireEvent.click(ui.getByRole("button", { name: "Trộn ảnh" }));
  assert.notEqual(
    ui.container.querySelector(".polaroid")!.getAttribute("aria-label"),
    initial,
  );
  fireEvent.click(ui.getByRole("button", { name: "Tạm dừng" }));
  assert.ok(ui.container.querySelector(".scene.still"));
  fireEvent.click(ui.getByRole("button", { name: "Tiếp tục" }));
  fireEvent.click(ui.getByRole("button", { name: "Bước vào miền ký ức" }));
  assert.equal(ui.container.querySelectorAll(".photo-slot").length, 6);
  fireEvent.click(ui.getByRole("button", { name: "Album" }));
  assert.equal(
    ui.container.querySelectorAll(".album-grid .album-card").length,
    6,
  );
  fireEvent.click(ui.getByRole("button", { name: "Về ảnh trôi" }));
  assert.ok(ui.container.querySelector(".entered:not(.scene-hidden)"));
});
test("mobile caps the floating scene and remains navigable with reduced motion", () => {
  mobile = true;
  reduced = true;
  const ui = home();
  fireEvent.click(ui.getByRole("button", { name: "Bước vào miền ký ức" }));
  assert.equal(ui.container.querySelectorAll(".photo-slot").length, 4);
  fireEvent.click(ui.getByRole("button", { name: "Mở trình đơn" }));
  assert.ok(ui.container.querySelector(".nav.open"));
  fireEvent.click(
    within(ui.container.querySelector("nav")!).getByRole("button", {
      name: "Gửi kỷ niệm",
    }),
  );
  assert.ok(within(ui.getByRole("dialog")).getByText(/Kho ảnh chưa sẵn sàng/));
  assert.equal(
    (
      within(ui.getByRole("dialog")).getByRole("button", {
        name: "Gửi kỷ niệm",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  assert.equal(ui.container.querySelector(".nav.open"), null);
});
test("real approved photos replace demo data and show upload details", () => {
  const photo = {
    ...demoPhotos[0],
    id: "real-photo",
    demo: false,
    caption: "Ngày tốt nghiệp",
    created_at: "2027-05-25T07:00:00Z",
    memory_date: "2027-05-24",
    uploader_name: "Minh",
  };
  const ui = render(
    createElement(Scrapbook, {
      photos: [photo],
      total: 1,
      settings: defaults,
      connection: "ready",
      uploadAvailable: true,
    }),
  );
  assert.equal(ui.queryByText("Bộ ảnh minh họa"), null);
  fireEvent.click(ui.container.querySelector(".polaroid")!);
  assert.match(
    ui.getByRole("dialog").textContent!,
    /Minh.*25\/05\/2027.*24\/05\/2027/,
  );
});
test("multi-file submission previews and waits for each successful HTTP response", async (t) => {
  const original = URL.createObjectURL;
  URL.createObjectURL = () => "blob:demo";
  t.after(() => {
    URL.createObjectURL = original;
  });
  const bodies: FormData[] = [];
  class LocalRequest {
    upload = {};
    status = 201;
    responseText = '{"received":true}';
    onload?: () => void;
    open() {}
    send(body: FormData) {
      bodies.push(body);
      queueMicrotask(() => this.onload?.());
    }
  }
  t.mock.method(globalThis, "fetch", async () => new Response());
  Object.defineProperty(globalThis, "XMLHttpRequest", {
    value: LocalRequest,
    configurable: true,
  });
  const ui = render(
    createElement(Upload, { available: true, close: () => {} }),
  );
  const picker = ui.container.querySelector("input[type=file]")!;
  fireEvent.change(picker, {
    target: { files: [new w.File(["bad"], "loi.txt", { type: "text/plain" })] },
  });
  assert.match(ui.getByRole("alert").textContent!, /Chỉ nhận ảnh/);
  fireEvent.change(picker, {
    target: {
      files: [
        new w.File(["a"], "a.jpg", { type: "image/jpeg" }),
        new w.File(["b"], "b.png", { type: "image/png" }),
      ],
    },
  });
  assert.equal(ui.container.querySelectorAll(".upload-previews img").length, 2);
  fireEvent.change(ui.getByLabelText("Tên người gửi"), {
    target: { value: "Trang" },
  });
  fireEvent.change(ui.getByLabelText("Lời nhắn"), {
    target: { value: "Cuối năm" },
  });
  fireEvent.submit(ui.container.querySelector("form")!);
  await waitFor(() =>
    assert.ok(ui.getByText("Kỷ niệm của bạn đã được gửi và đang chờ duyệt ❤️")),
  );
  assert.equal(bodies.length, 2);
  assert.notEqual(bodies[0].get("request_id"), bodies[1].get("request_id"));
  assert.equal(bodies[0].get("uploader_name"), "Trang");
  assert.equal(bodies[0].get("status"), null);
});
test("settings editor saves versioned field changes through its public form", async (t) => {
  let draft = defaults;
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: unknown, init: RequestInit) => {
      const form = init.body as FormData;
      assert.equal(form.get("version"), "2026-11-19T12:00:00Z");
      draft = JSON.parse(String(form.get("values")));
      return Response.json({
        settings: { ...draft, updated_at: "2026-11-19T12:01:00Z" },
      });
    },
  );
  const ui = render(
    createElement(SettingsEditor, {
      initial: { ...defaults, updated_at: "2026-11-19T12:00:00Z" },
    }),
  );
  fireEvent.change(ui.getByLabelText("Tiêu đề chính"), {
    target: { value: "Lớp mình" },
  });
  fireEvent.click(ui.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() =>
    assert.match(ui.getByRole("status").textContent!, /Đã lưu/),
  );
  assert.equal(draft.site_title, "Lớp mình");
});

import { expect, test, type Page } from "@playwright/test";
import { getEditor } from "../helpers/utils";

async function chooseTheme(page: Page, option: RegExp) {
  await page.getByRole("button", { name: /^(Theme|主题)$/ }).click();
  await page.getByRole("button", { name: option }).click();
}

test("stores an explicit theme across pages and follows live system changes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.goto("/tutorial");
  await expect(page.locator(".markdown-body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.goto("/");
  await chooseTheme(page, /^(Dark|深色)$/);
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.goto("/tutorial");
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".markdown-body")).toHaveCSS("background-color", "rgb(17, 23, 36)");

  await page.goto("/");
  await chooseTheme(page, /^(System|跟随系统)$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBe("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("updates both Monaco panes and their comparison markers without replacing either model", async ({ page }) => {
  await getEditor(page, { goto: true, needTutorial: true });
  await page.getByRole("tab", { name: /^(text|文本)$/i }).click();
  await getEditor(page, { rightEditor: true });
  await page.evaluate(() => {
    const { main, secondary } = window.monacoApi;
    main.setValue('{\n  "mode": "tree",\n  "limit": 20\n}');
    secondary.setValue('{\n  "mode": "text",\n  "limit": 50\n}');
    document.documentElement.dataset.previewModels = [main, secondary]
      .map((editor) => editor.getModel()?.uri.toString())
      .join(",");
  });
  await page.getByRole("switch").click();
  const left = page.locator("#left-panel");
  const right = page.locator("#right-panel");
  await expect(left.locator(".line-del").first()).toBeVisible();
  await expect(right.locator(".line-ins").first()).toBeVisible();

  await chooseTheme(page, /^(Dark|深色)$/);
  await expect(left.locator(".monaco-editor")).toHaveClass(/\bvs-dark\b/);
  await expect(right.locator(".monaco-editor")).toHaveClass(/\bvs-dark\b/);
  await expect(left.locator(".line-del").first()).toHaveCSS("background-color", "rgb(48, 33, 38)");
  await expect(right.locator(".line-ins").first()).toHaveCSS("background-color", "rgb(32, 45, 39)");
  expect(
    await page.evaluate(() => {
      const { main, secondary } = window.monacoApi;
      return {
        sameModels:
          document.documentElement.dataset.previewModels ===
          [main, secondary].map((editor) => editor.getModel()?.uri.toString()).join(","),
        before: main.getValue(),
        after: secondary.getValue(),
      };
    }),
  ).toEqual({
    sameModels: true,
    before: '{\n  "mode": "tree",\n  "limit": 20\n}',
    after: '{\n  "mode": "text",\n  "limit": 50\n}',
  });
});

test("updates both levels of table key backgrounds when the theme changes", async ({ page }) => {
  await getEditor(page, { goto: true, needTutorial: true });
  await page.getByRole("tab", { name: /^(table|表)$/i }).click();

  const rootKey = page.locator("#right-panel .tbl-header", { hasText: /^Aidan Gillen$/ });
  const nestedKey = page.locator("#right-panel .tbl-header", { hasText: /^array$/ }).first();
  await expect(rootKey).toHaveCSS("background-color", "rgb(214, 211, 209)");
  await expect(nestedKey).toHaveCSS("background-color", "rgb(229, 231, 235)");

  await chooseTheme(page, /^(Dark|深色)$/);
  await expect(rootKey).toHaveCSS("background-color", "rgb(23, 34, 52)");
  await expect(nestedKey).toHaveCSS("background-color", "rgb(30, 42, 62)");
  await expect(rootKey).toHaveCSS("color", "rgb(156, 220, 254)");
});

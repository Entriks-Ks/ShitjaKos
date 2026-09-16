import { chromium } from "@playwright/test";

// Read-only browser measurements. Run against a production server for comparisons.
const baseURL = process.env.PERF_BASE_URL ?? "http://localhost:3002";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const run of [1, 2, 3]) {
    const start = performance.now();
    const response = await page.goto(`${baseURL}/?lang=en`);
    await page.locator(".listing-card").first().waitFor();
    const contentMs = Math.round(performance.now() - start);
    await page.locator(".listing-card img").evaluateAll(async (images) => {
      await Promise.all(
        images.map((image) => (image as HTMLImageElement).decode().catch(() => {})),
      );
    });
    const photosMs = Math.round(performance.now() - start);
    const transfers = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes("/api/media/"))
        .reduce(
          (bytes, entry) => bytes + (entry as PerformanceResourceTiming).encodedBodySize,
          0,
        ),
    );
    let documents = 0;
    const countDocument = (request: import("@playwright/test").Request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        documents++;
    };
    page.on("request", countDocument);
    const searchStart = performance.now();
    await page.locator('form[action="/search"] input[name="q"]').fill("phone");
    await page.locator('form[action="/search"] button').click();
    await page.waitForURL(/\/search\?/);
    await page.locator(".search-results").waitFor();
    page.off("request", countDocument);
    console.log(
      JSON.stringify({
        run,
        status: response?.status(),
        contentMs,
        photosMs,
        photoBytes: transfers,
        searchMs: Math.round(performance.now() - searchStart),
        searchDocumentRequests: documents,
      }),
    );
  }
} finally {
  await browser.close();
}

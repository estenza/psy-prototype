import { chromium } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 480, height: 900 },
  { width: 721, height: 1000 },
  { width: 1140, height: 1000 },
  { width: 1280, height: 1000 },
];
const ROUTES = [
  "/",
  "/bookmarks",
  "/notifications",
  "/psychologists",
  "/settings/account",
  "/create-topic",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });

    for (const route of ROUTES) {
      const response = await page.goto(`${BASE_URL}${route}`, {
        waitUntil: "networkidle",
      });

      assert(
        response?.ok(),
        `${route} returned ${response?.status() ?? "no response"} at ${viewport.width}px`,
      );

      const metrics = await page.evaluate(() => ({
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        visibleMobileTabbar: Boolean(
          document.querySelector(".app-mobile-tabbar")
            && getComputedStyle(document.querySelector(".app-mobile-tabbar")).display !== "none",
        ),
      }));

      const maxScrollWidth = Math.max(metrics.bodyScrollWidth, metrics.documentScrollWidth);

      assert(
        maxScrollWidth <= metrics.innerWidth + 1,
        `${route} has horizontal overflow ${maxScrollWidth}px > ${metrics.innerWidth}px at ${viewport.width}px`,
      );

      if (viewport.width <= 480) {
        const finalPathname = new URL(page.url()).pathname;
        const tabbarExpected =
          finalPathname === "/"
          || finalPathname === "/notifications"
          || finalPathname === "/create-topic"
          || finalPathname === "/search";
        assert(
          metrics.visibleMobileTabbar === tabbarExpected,
          `${route} mobile tabbar visibility mismatch at ${viewport.width}px; final path ${finalPathname}`,
        );
      }
    }

    await page.close();
  }
} finally {
  await browser.close();
}

console.log("Shell layout smoke checks passed.");

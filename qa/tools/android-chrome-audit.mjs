import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {readFile, mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "../../related/website/node_modules/playwright/index.mjs";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = process.argv[2];
const url = process.argv[3] ?? "https://lumiq-parallax-collab-public.vercel.app/zh-hant";
const cold = process.argv.includes("--cold");
const adb = process.env.ADB ?? "/tmp/android-platform-tools-20261111/platform-tools/adb";
if (!output) throw new Error("Usage: node android-chrome-audit.mjs OUTPUT_DIR [URL]");
await mkdir(output, {recursive: true});

const vitals = await readFile(path.join(root, "related/website/node_modules/next/dist/compiled/web-vitals/web-vitals.js"), "utf8");
const probe = `(() => {
  var module = {exports: {}};
  var __dirname = "";
  ${vitals}
  const state = {metrics: {}, changes: [], segments: []};
  const save = metric => {
    const entry = {
      name: metric.name, value: metric.value, delta: metric.delta,
      rating: metric.rating, time: performance.now(),
      entries: metric.entries.map(item => ({
        entryType: item.entryType, name: item.name, startTime: item.startTime,
        duration: item.duration, size: item.size, value: item.value,
        interactionId: item.interactionId
      }))
    };
    state.metrics[metric.name] = entry;
    state.changes.push(entry);
  };
  module.exports.onLCP(save, {reportAllChanges: true});
  module.exports.onINP(save, {reportAllChanges: true});
  module.exports.onCLS(save, {reportAllChanges: true});
  let active = false, last = 0, intervals = [], segmentName = "";
  const sample = time => {
    if (!active) return;
    if (last) intervals.push(time - last);
    last = time;
    requestAnimationFrame(sample);
  };
  window.__lumiqAudit = {
    start(name) {
      if (active) throw new Error("Frame segment already active");
      segmentName = name; intervals = []; last = 0; active = true;
      requestAnimationFrame(sample);
    },
    stop() {
      active = false;
      const sorted = [...intervals].sort((a, b) => a - b);
      const baseline = sorted[Math.floor(sorted.length / 2)] ?? null;
      const missed = baseline ? intervals.reduce((sum, ms) =>
        sum + Math.max(0, Math.round(ms / baseline) - 1), 0) : null;
      const result = {name: segmentName, frameCount: intervals.length,
        medianFrameMs: baseline, estimatedMissedFrames: missed, intervalsMs: intervals};
      state.segments.push(result);
      return result;
    },
    snapshot() {
      const navigation = performance.getEntriesByType("navigation")[0];
      return {...state, url: location.href, title: document.title,
        readyState: document.readyState, scrollY, viewport: {
          width: innerWidth, height: innerHeight, dpr: devicePixelRatio
        }, navigation: navigation?.toJSON() ?? null};
    }
  };
})();`;

await run(adb, ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "about:blank", "-p", "com.android.chrome"]);
await run(adb, ["forward", "tcp:9223", "localabstract:chrome_devtools_remote"]);
const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
const context = browser.contexts()[0];
const page = context.pages().find(item => item.url() === "about:blank");
if (!page) throw new Error("Chrome about:blank tab not found");
const cdp = await context.newCDPSession(page);
if (cold) await cdp.send("Network.clearBrowserCache");
await page.addInitScript({content: probe});

const startedAt = new Date().toISOString();
const failures = [];
page.on("requestfailed", request => failures.push({url: request.url(), error: request.failure()?.errorText}));
const response = await page.goto(url, {waitUntil: "domcontentloaded", timeout: 45000});
await page.waitForTimeout(10000);
await page.screenshot({path: path.join(output, "01-loaded.png")});

const steps = [];
steps.push({name: "load", status: response?.status(), scrollY: await page.evaluate(() => scrollY), at: new Date().toISOString()});
await page.evaluate(() => window.__lumiqAudit.start("continuous-scroll"));
const viewport = await page.evaluate(() => ({width: innerWidth, height: innerHeight}));
const swipe = async () => {
  const x = viewport.width / 2;
  const from = viewport.height * 0.82;
  const to = viewport.height * 0.2;
  await cdp.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x, y: from, id: 1}]});
  for (let step = 1; step <= 12; step++) {
    await cdp.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x, y: from + (to - from) * step / 12, id: 1}]});
    await page.waitForTimeout(25);
  }
  await cdp.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
};
const tap = async selector => {
  const point = await page.locator(selector).evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, id: 1};
  });
  await cdp.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [point]});
  await cdp.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
};
for (let index = 0; index < 8; index++) {
  await swipe();
  await page.waitForTimeout(160);
  steps.push({name: `scroll-${index + 1}`, scrollY: await page.evaluate(() => scrollY), at: new Date().toISOString()});
}
await page.waitForTimeout(800);
const scrollFrames = await page.evaluate(() => window.__lumiqAudit.stop());
await page.screenshot({path: path.join(output, "02-after-scroll.png")});

await page.evaluate(() => window.__lumiqAudit.start("return-top-and-menu"));
await tap(".nav-logo");
await page.waitForTimeout(1100);
steps.push({name: "return-top", scrollY: await page.evaluate(() => scrollY), at: new Date().toISOString()});
await page.screenshot({path: path.join(output, "03-return-top.png")});
await tap(".site-mobile-trigger");
await page.waitForTimeout(500);
steps.push({name: "menu-open", expanded: await page.locator(".site-mobile-trigger").getAttribute("aria-expanded"), at: new Date().toISOString()});
await page.screenshot({path: path.join(output, "04-menu-open.png")});
await tap(".site-mobile-close");
await page.waitForTimeout(500);
steps.push({name: "menu-close", expanded: await page.locator(".site-mobile-trigger").getAttribute("aria-expanded"), at: new Date().toISOString()});
const otherFrames = await page.evaluate(() => window.__lumiqAudit.stop());
await page.screenshot({path: path.join(output, "05-menu-close.png")});

const result = {
  startedAt, endedAt: new Date().toISOString(), url, status: response?.status(),
  cache: cold ? "browser cache cleared before navigation" : "existing browser cache",
  browser: "Android Chrome", steps, scrollFrames, otherFrames, failures,
  audit: await page.evaluate(() => window.__lumiqAudit.snapshot())
};
await writeFile(path.join(output, "results.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({status: result.status, metrics: result.audit.metrics,
  scrollFrames: {frameCount: scrollFrames.frameCount, estimatedMissedFrames: scrollFrames.estimatedMissedFrames},
  steps, failures: failures.length}, null, 2));
await browser.close();

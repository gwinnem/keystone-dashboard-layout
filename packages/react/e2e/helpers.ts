import { expect, type Locator } from '@playwright/test';

/**
 * Waits for an element's bounding box to stop changing before treating
 * it as a stable baseline — same rationale and shape as the Vue
 * package's own `e2e/helpers.ts`: the native drag/resize engine's own
 * setup (confirmed via a class/attribute appearing) doesn't by itself
 * confirm the container's own width measurement — which every item's
 * actual pixel position depends on — has also finished settling,
 * which can resolve across more than one render pass after mount or a
 * scenario switch.
 *
 * History worth knowing about before changing this again:
 *
 * 1. An earlier version additionally required the read width to clear
 *    a 30px floor before counting toward stability, on the theory
 *    that `GridLayout.tsx`'s own `containerWidth` seed value (a
 *    hardcoded `100`, corrected only once a `useEffect`-driven
 *    `ResizeObserver` fires post-paint) could produce a briefly-stable
 *    but wrong, too-narrow plateau. That specific implementation made
 *    things categorically worse — every test using this helper
 *    stopped stabilizing at all within a 10s timeout — so it was
 *    reverted, and the exact cause of that regression was never
 *    conclusively identified.
 * 2. Reverting to a plain "N consecutive identical reads" check (no
 *    width floor), bumped from 3 to 5 reads as a low-risk, purely
 *    additive safety margin, got most of this suite passing but left
 *    a real, reproduced case: `item "1"` in the drag-and-resize
 *    scenario (settled position ≈439px) was still observed settling
 *    on a wrong, stable value (≈56px — consistent with the
 *    `containerWidth: 100` seed) for **at least 5 consecutive reads**
 *    before the real measurement ever landed and the position jumped.
 *    That's direct, reproduced evidence — not the same unverified
 *    theory as attempt 1 — that the wrong plateau can outlast even a
 *    5-read requirement at whatever cadence `expect.poll` was
 *    sampling at, i.e. it isn't a single-frame fluke, it persists for
 *    several hundred milliseconds at minimum in practice.
 *
 * Given that, the fix here is deliberately the simplest possible
 * response to that evidence: wait longer, unconditionally, *before*
 * ever starting to sample for stability at all — rather than trying
 * to reject the wrong plateau by its own characteristics (width, in
 * attempt 1) once already sampling, which is what actually broke
 * things last time in a way that was never fully explained. A wrong
 * value can't be mistaken for a stable one if the real measurement has
 * already landed before the first read ever happens.
 */
export async function stableBoundingBox(locator: Locator): ReturnType<Locator['boundingBox']> {
  await locator.page().waitForTimeout(1500);
  let consecutiveStable = 0;
  let previous = await locator.boundingBox();
  await expect.poll(async () => {
    const current = await locator.boundingBox();
    const stable = previous !== null && current !== null && current.x === previous.x && current.width === previous.width;
    consecutiveStable = stable ? consecutiveStable + 1 : 0;
    previous = current;
    return consecutiveStable;
  }).toBeGreaterThanOrEqual(5);
  return locator.boundingBox();
}

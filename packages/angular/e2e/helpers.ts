import { expect, type Locator } from '@playwright/test';

/**
 * Waits for an element's bounding box to stop changing before treating
 * it as a stable baseline — ported directly from the Vue/React
 * packages' own identical `e2e/helpers.ts` (same rationale applies
 * here: `GridLayoutComponent`'s own `containerWidth` field starts at
 * `0`, corrected only once its own `ResizeObserver` callback fires
 * post-paint in `ngAfterViewInit`, which can resolve across more than
 * one render pass after mount or a scenario switch). See those files'
 * own doc comment for the fuller history of why this waits
 * unconditionally *before* sampling, rather than trying to reject a
 * wrong-but-stable early plateau by its own characteristics.
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

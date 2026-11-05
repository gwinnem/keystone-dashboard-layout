/**
 * Compares the reference vertical compactor with the fast one.
 *
 * Run with `pnpm --filter keystone-dashboard-layout-core bench`.
 *
 * The reference is quadratic, so it is only benchmarked up to 1,000
 * items; at 10,000 it would take minutes per iteration. The fast
 * compactor runs at all three sizes.
 */
import { bench, describe } from 'vitest';
import { cloneLayout } from '../src/helpers/utils';
import { verticalCompactor, verticalFastCompactor } from '../src/gridlayout/helpers/compactor';
import { ECompactType } from '../src/gridlayout/enums/ECompactType';
import type { TLayout } from '../src/layout-definition';

const COLS = 12;
const CONTEXT = { compactType: ECompactType.VERTICAL };

/** A dashboard-like layout: rows of mixed-size widgets with gaps, a few statics. */
function buildLayout(count: number): TLayout {
  let state = 12345;
  const random = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const layout: TLayout = [];
  for(let i = 0; i < count; i++) {
    const w = 1 + Math.floor(random() * 4);
    layout.push({
      h: 1 + Math.floor(random() * 4),
      i: `item-${i}`,
      isStatic: i % 50 === 0,
      w,
      x: Math.floor(random() * (COLS - w + 1)),
      y: Math.floor(i / 3) + Math.floor(random() * 6),
    });
  }
  return layout;
}

for(const size of [100, 1000, 10000]) {
  const source = buildLayout(size);
  describe(`vertical compaction, ${size} items`, () => {
    if(size <= 1000) {
      bench(`verticalCompactor (reference)`, () => {
        verticalCompactor.compact(cloneLayout(source), COLS, CONTEXT);
      }, { iterations: 5, time: 0, warmupIterations: 1, warmupTime: 0 });
    }
    bench(`verticalFastCompactor`, () => {
      verticalFastCompactor.compact(cloneLayout(source), COLS, CONTEXT);
    }, { iterations: 5, time: 0, warmupIterations: 1, warmupTime: 0 });
  });
}

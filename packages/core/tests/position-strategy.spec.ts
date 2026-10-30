import { describe, expect, it } from 'vitest';
import {
  getPositionStrategy,
  topLeftStrategy,
  transformStrategy,
} from '../src/gridlayout/helpers/position-strategy';
import { setTopLeft, setTopRight, setTransform, setTransformRtl } from '../src/helpers/utils';

describe(`position-strategy`, () => {
  describe(`transformStrategy`, () => {
    it(`Should have type "transform" and the css-transforms class`, () => {
      expect(transformStrategy.type).toBe(`transform`);
      expect(transformStrategy.className).toBe(`css-transforms`);
    });

    it(`Should produce the same style as setTransform for left-to-right`, () => {
      const style = transformStrategy.getStyle({ height: 40, left: 30, rtl: false, top: 20, width: 50 });
      expect(style).toStrictEqual(setTransform(20, 30, 50, 40));
    });

    it(`Should produce the same style as setTransformRtl for right-to-left`, () => {
      const style = transformStrategy.getStyle({ height: 40, right: 30, rtl: true, top: 20, width: 50 });
      expect(style).toStrictEqual(setTransformRtl(20, 30, 50, 40));
    });
  });

  describe(`topLeftStrategy`, () => {
    it(`Should have type "top-left" and no class`, () => {
      expect(topLeftStrategy.type).toBe(`top-left`);
      expect(topLeftStrategy.className).toBeUndefined();
    });

    it(`Should produce the same style as setTopLeft for left-to-right`, () => {
      const style = topLeftStrategy.getStyle({ height: 40, left: 30, rtl: false, top: 20, width: 50 });
      expect(style).toStrictEqual(setTopLeft(20, 30, 50, 40));
    });

    it(`Should produce the same style as setTopRight for right-to-left`, () => {
      const style = topLeftStrategy.getStyle({ height: 40, right: 30, rtl: true, top: 20, width: 50 });
      expect(style).toStrictEqual(setTopRight(20, 30, 50, 40));
    });
  });

  describe(`getPositionStrategy`, () => {
    it(`Should return the transform strategy for true`, () => {
      expect(getPositionStrategy(true)).toBe(transformStrategy);
    });

    it(`Should return the top-left strategy for false`, () => {
      expect(getPositionStrategy(false)).toBe(topLeftStrategy);
    });
  });
});

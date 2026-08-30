import { describe, expect, it } from 'vitest';
import { exportLayoutAsSvg } from '../src/gridlayout/helpers/export-svg';

describe(`exportLayoutAsSvg`, () => {
  it(`Should produce a valid, empty SVG document for an empty layout`, () => {
    const svg = exportLayoutAsSvg([]);

    expect(svg).toContain(`<svg`);
    expect(svg).toContain(`</svg>`);
    expect(svg).not.toContain(`<rect x=`);
  });

  it(`Should render a rectangle and label for each item`, () => {
    const svg = exportLayoutAsSvg([
      { h: 2, i: `0`, w: 2, x: 0, y: 0 },
      { h: 2, i: `1`, w: 2, x: 2, y: 0 },
    ]);

    expect((svg.match(/<rect x=/g) ?? []).length).toBe(2);
    expect(svg).toContain(`>0</text>`);
    expect(svg).toContain(`>1</text>`);
  });

  it(`Should not throw for a layout with a single item`, () => {
    expect(() => exportLayoutAsSvg([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }])).not.toThrow();
  });

  it(`Should escape XML-unsafe characters in item ids`, () => {
    const svg = exportLayoutAsSvg([{ h: 2, i: `<script>`, w: 2, x: 0, y: 0 }]);

    expect(svg).not.toContain(`<script>`);
    expect(svg).toContain(`&lt;script&gt;`);
  });

  it(`Should respect custom colNum/rowHeight/margin/containerWidth options`, () => {
    const svg = exportLayoutAsSvg(
      [{ h: 1, i: `0`, w: 1, x: 0, y: 0 }],
      { colNum: 4, containerWidth: 400, margin: [0, 0], rowHeight: 100 },
    );

    // colWidth = (400 - 0*5)/4 = 100; item w:1 -> pixelW = 100.
    expect(svg).toContain(`width="100"`);
    expect(svg).toContain(`height="100"`);
  });

  it(`Should apply a background color when backgroundColor is set`, () => {
    const svg = exportLayoutAsSvg([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }], { backgroundColor: `#fff` });

    expect(svg).toContain(`fill="#fff"`);
  });

  it(`Should not include a background rect when backgroundColor is null (the default)`, () => {
    const svg = exportLayoutAsSvg([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);

    expect(svg).not.toContain(`width="100%" height="100%"`);
  });

  it(`Should size the viewBox/height to fit the bottommost item`, () => {
    const svg = exportLayoutAsSvg(
      [{ h: 2, i: `0`, w: 2, x: 0, y: 3 }],
      { margin: [10, 10], rowHeight: 100 },
    );

    // bottomRow = 3+2 = 5; totalHeight = calcGridItemWH(5, 100, 10) + 10
    // = (100*5 + 4*10) + 10 = 540 + 10 = 550.
    expect(svg).toContain(`height="550"`);
  });

  it(`Should compute exact pixel x/y/width/height for a non-zero position — not just x:0 (every other test in this file only ever uses x:0, and the "viewBox" test above only checks the aggregate totalHeight, never a single item's own pixelY)`, () => {
    const svg = exportLayoutAsSvg(
      [{ h: 2, i: `test`, w: 2, x: 2, y: 3 }],
      { colNum: 12, containerWidth: 1210, margin: [10, 10], rowHeight: 150 },
    );

    // colWidth = (1210 - 10*13)/12 = 90.
    // pixelX = 90*2 + (2+1)*10 = 180+30 = 210.
    // pixelY = 150*3 + (3+1)*10 = 450+40 = 490.
    // pixelW = calcGridItemWH(2,90,10) = round(180 + max(0,1)*10) = 190.
    // pixelH = calcGridItemWH(2,150,10) = round(300 + max(0,1)*10) = 310.
    expect(svg).toContain(`x="210" y="490" width="190" height="310"`);
  });

  it(`Should escape & and " (not just < and >) in item ids`, () => {
    // The existing "escape XML-unsafe characters" test above only ever
    // uses <script>, exercising the < and > replacements — & and " are
    // two entirely separate .replace() calls in the escapeXml chain,
    // never reached by any existing assertion.
    const svg = exportLayoutAsSvg([{ h: 2, i: `a&b"c`, w: 2, x: 0, y: 0 }]);

    expect(svg).toContain(`a&amp;b&quot;c`);
  });

  it(`Should use the custom itemFill/itemStroke/labelColor option values, not just the defaults`, () => {
    const svg = exportLayoutAsSvg(
      [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }],
      { itemFill: `#123456`, itemStroke: `#abcdef`, labelColor: `#fedcba` },
    );

    expect(svg).toContain(`fill="#123456"`);
    expect(svg).toContain(`stroke="#abcdef"`);
    expect(svg).toContain(`fill="#fedcba"`);
  });

  it(`Should include the fixed structural SVG attributes exactly — xmlns, text styling, and rect corner radius/stroke-width, none of which any existing test asserts on individually`, () => {
    const svg = exportLayoutAsSvg([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);

    expect(svg).toContain(`xmlns="http://www.w3.org/2000/svg"`);
    expect(svg).toContain(`stroke-width="1"`);
    expect(svg).toContain(`rx="8" ry="8"`);
    expect(svg).toContain(`font-family="sans-serif"`);
    expect(svg).toContain(`font-size="13"`);
    expect(svg).toContain(`text-anchor="middle"`);
    expect(svg).toContain(`dominant-baseline="middle"`);
  });

  it(`Should format the viewBox attribute exactly as "0 0 {containerWidth} {totalHeight}"`, () => {
    const svg = exportLayoutAsSvg(
      [{ h: 1, i: `0`, w: 1, x: 0, y: 0 }],
      { colNum: 4, containerWidth: 400, margin: [0, 0], rowHeight: 100 },
    );

    // bottomRow = 0+1 = 1; totalHeight = calcGridItemWH(1,100,0) + 0 = 100.
    expect(svg).toContain(`viewBox="0 0 400 100"`);
  });

  it(`Should center the label's own x/y at the item rect's center point (pixelX + pixelW/2, pixelY + pixelH/2)`, () => {
    const svg = exportLayoutAsSvg(
      [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }],
      { colNum: 12, containerWidth: 1210, margin: [10, 10], rowHeight: 150 },
    );

    // pixelX=10, pixelW=190 -> label x = 10+95 = 105.
    // pixelY=10, pixelH=310 -> label y = 10+155 = 165.
    expect(svg).toContain(`<text x="105" y="165"`);
  });
});

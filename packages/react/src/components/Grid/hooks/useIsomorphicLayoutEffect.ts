import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` in a browser, `useEffect` on the server. React 18 warns when a layout effect is declared during server
 * rendering (React 19 stopped warning, but the package still supports 18), and a layout effect never runs on the server anyway.
 *
 * `GridLayout` measures its container with this: a layout effect runs before the browser paints, so the grid is laid out at its
 * real width in the first painted frame after hydration, rather than a frame (or, on a busy page, seconds) later.
 */
export const useIsomorphicLayoutEffect = typeof window === `undefined` ? useEffect : useLayoutEffect;

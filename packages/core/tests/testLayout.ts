import { TLayout } from '../src/layout-definition';

export const testLayoutOne: TLayout = [
  // test 1
  {
    i: 1,
    h: 2,
    w: 1,
    x: 0,
    y: 0,
    isDraggable: false,
    isResizable: false,
  },
  {
    i: 2,
    h: 1,
    w: 2,
    x: 1,
    y: 0,
  },
  {
    i: 3,
    h: 2,
    w: 1,
    x: 2,
    y: 1,
  },
  {
    i: 4,
    h: 2,
    w: 1,
    x: 3,
    y: 1,
    isStatic: true,
  },
  {
    i: 5,
    h: 2,
    w: 1,
    x: 4,
    y: 0,
  },
  {
    i: 6,
    h: 1,
    w: 1,
    x: 5,
    y: 0,
    isStatic: true,
  },
  {
    i: 7,
    h: 3,
    w: 1,
    x: 0,
    y: 2,
    isDraggable: false,
    isResizable: false,
  },
  {
    i: 8,
    h: 1,
    w: 1,
    x: 1,
    y: 1,
    isStatic: true,
  },
];

export const testLayoutTwo: TLayout = [
  { h: 1, i: "qwerty", w: 1, x: 0, y: 0 },
  { h: 1, i: "abc", w: 1, x: 1, y: 0 },
];

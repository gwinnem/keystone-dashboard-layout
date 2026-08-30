import { describe, expect, it } from 'vitest';
import { DEFAULT_ARIA_LABELS, resolveAriaLabels } from '../src/common/interfaces/aria-labels.interface';

describe(`resolveAriaLabels`, () => {
  it(`Should return the built-in English defaults when neither layer sets anything`, () => {
    expect(resolveAriaLabels(undefined, undefined)).toStrictEqual(DEFAULT_ARIA_LABELS);
  });

  it(`DEFAULT_ARIA_LABELS should contain the actual, specific English text — not just be internally self-consistent`, () => {
    // Every other test in this file compares result.X against
    // DEFAULT_ARIA_LABELS.X directly — the SAME constant on both sides
    // of the comparison. If a mutant replaced one of these string
    // literals with '' (or any other value) at the source, every one of
    // those comparisons would still pass, since both sides would shift
    // together. Hardcoded literal values here are what actually pin
    // down the real content.
    expect(DEFAULT_ARIA_LABELS.closeButton).toBe(`Close`);
    expect(DEFAULT_ARIA_LABELS.itemRoleDescription).toBe(`Draggable, resizable item`);
    expect(DEFAULT_ARIA_LABELS.moveInstruction).toBe(`Press arrow keys to move.`);
    expect(DEFAULT_ARIA_LABELS.resizeInstruction).toBe(`Press shift plus arrow keys to resize.`);
  });

  it(`Should let GridLayout's own labels override the defaults`, () => {
    const result = resolveAriaLabels({ closeButton: `Cerrar` }, undefined);

    expect(result.closeButton).toBe(`Cerrar`);
    expect(result.moveInstruction).toBe(DEFAULT_ARIA_LABELS.moveInstruction);
  });

  it(`Should let a GridItem's own labels override GridLayout's`, () => {
    const result = resolveAriaLabels({ closeButton: `Grid-wide` }, { closeButton: `Item-specific` });

    expect(result.closeButton).toBe(`Item-specific`);
  });

  it(`Should only override the specific keys each layer sets, leaving the rest at their prior layer's value`, () => {
    const result = resolveAriaLabels(
      { closeButton: `Grid close`, moveInstruction: `Grid move` },
      { moveInstruction: `Item move` },
    );

    expect(result.closeButton).toBe(`Grid close`);
    expect(result.moveInstruction).toBe(`Item move`);
    expect(result.resizeInstruction).toBe(DEFAULT_ARIA_LABELS.resizeInstruction);
    expect(result.itemRoleDescription).toBe(DEFAULT_ARIA_LABELS.itemRoleDescription);
  });
});

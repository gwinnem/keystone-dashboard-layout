import type { JSX } from 'react';

export interface IGridItemCloseButtonProps {
  /** The id of the `GridItem` this button removes when clicked. Required — unlike Vue's own `-1` sentinel workaround, React's own type system already expresses "must be provided" directly, with no need for a magic default value to stand in for "no item." */
  i: string | number;
  /** Called with `i` when clicked. */
  onRemoveGridItem: (id: string | number) => void;
}

/**
 * The default close button rendered inside a `GridItem` when its own
 * `showCloseButton` resolves `true` — the React port of Vue's own
 * `CustomCloseButton.vue` (confirmed via a direct source read). Also
 * exported standalone, same as Vue's own version, for a consumer who
 * wants to render the identical button elsewhere (e.g. in a custom
 * header) and wire it to the same removal logic manually. Not used
 * internally by `GridItem` itself, which renders its own, separate
 * built-in close button (`.kdl-grid-item-close-button`) — this is a
 * standalone, opt-in utility with a matching visual style, same
 * relationship Angular's own `GridItemCloseButtonComponent` has to its
 * package's built-in close button.
 */
export function GridItemCloseButton({ i, onRemoveGridItem }: IGridItemCloseButtonProps): JSX.Element {
  return (
    <button
      aria-label="Close"
      className="kdl-custom-close-button"
      onClick={() => onRemoveGridItem(i)}
      type="button"
    >
      <span aria-hidden="true" className="kdl-custom-close-button-icon" />
    </button>
  );
}

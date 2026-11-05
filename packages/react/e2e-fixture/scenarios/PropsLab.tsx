import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { GridItem, GridLayout, useLayoutPresets, useLayoutStorage } from '../../src/index';
import type { IGridLayoutHandle } from '../../src/index';
import { ECompactType, collides } from 'keystone-dashboard-layout-core';
import type {
  IBreakpoints,
  IColumns,
  ICompactor,
  IGridAriaLabels,
  TAlignEdge,
  TLayout,
  TResizeHandle,
  TResponsiveLayout,
} from 'keystone-dashboard-layout-core';

/**
 * A test fixture, not an example — the React counterpart of the Vue package's `demo/views/PropsLabView.vue`.
 * Every `GridLayout` property is bound to a control (`grid-<prop>` test ids), every callback is logged, and every
 * exposed method has a button, so each property can be switched on, driven in a real browser and asserted against.
 * The stage is a fixed 1200px wide, so pixel maths is deterministic.
 *
 * Where React differs from Vue, and so from the Vue lab:
 *   - A React `GridItem` takes no per-item props (`isStatic`, `maxW`, ... live on the layout ENTRY). The `item-*`
 *     controls therefore patch the *target item's entry*. They are kept apart from the base layout (`layout` state)
 *     and merged in only when rendering, so switching the target moves them, and clearing one ("inherit") really does
 *     restore the grid default instead of leaving a stale value baked into the entry.
 *   - `GridLayout` and `GridItem` accept no arbitrary attributes, so there are no `data-testid`s on them: the e2e
 *     helpers find items by `[data-grid-item-id]` inside the `lab-grid-wrap` wrapper.
 *   - There is no `item-clicked`, `container-resized` or intermediate `resize` event, and the imperative handle has no
 *     `width` or `isDragging`; the lab reads what it can (`onLayoutReady`, the wrapper's own width, the drag callbacks).
 */

const RESIZE_HANDLE_EDGES: TResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const COMPACT_TYPES = Object.values(ECompactType);
const ALIGN_EDGES: TAlignEdge[] = ['left', 'right', 'top', 'bottom', 'center-x', 'center-y'];
const ARIA_KEYS = ['closeButton', 'itemRoleDescription', 'moveInstruction', 'resizeInstruction'] as const;
type TAriaKey = typeof ARIA_KEYS[number];
const LAB_MIME = `application/x-lab-widget`;

const initialLayout = (): TLayout => [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 3, i: '1', w: 2, x: 3, y: 0 },
  { h: 4, i: '2', w: 4, x: 7, y: 0 },
  { h: 2, i: '3', w: 3, x: 0, y: 3 },
];

/** Every pair far enough apart that aligning one to another can never overlap them; every distribute gap divides evenly. */
const alignLayout = (): TLayout => [
  { h: 2, i: 'p', w: 4, x: 2, y: 0 },
  { h: 2, i: 'q', w: 2, x: 8, y: 3 },
  { h: 4, i: 'r', w: 3, x: 0, y: 6 },
  { h: 2, i: 's', w: 2, x: 6, y: 9 },
  { h: 2, i: 't1', w: 2, x: 0, y: 12 },
  { h: 2, i: 't2', w: 2, x: 3, y: 12 },
  { h: 2, i: 't3', w: 2, x: 10, y: 12 },
  { h: 2, i: 'v1', w: 1, x: 11, y: 0 },
  { h: 2, i: 'v2', w: 1, x: 11, y: 3 },
  { h: 2, i: 'v3', w: 1, x: 11, y: 8 },
];

const GRID_BOOLEAN_PROPS = [
  'autoSize', 'allowCrossGridDrag', 'disableExternalDrop', 'allowOutsideDrop', 'useBorderRadius', 'showAlignmentGuides',
  'showSpacingGuides', 'snapToGrid', 'distributeEvenly', 'horizontalShift', 'isBounded', 'isDraggable', 'isMirrored',
  'isResizable', 'multiSelect', 'preventCollision', 'responsive', 'restoreOnDrag', 'showCloseButton', 'showGridLines',
  'showResizeHandles', 'useCssTransforms', 'enableUndoRedo', 'enableEditMode',
] as const;
type TGridBooleanProp = typeof GRID_BOOLEAN_PROPS[number];

const GRID_NUMBER_PROPS = [
  'outsideDropWidth', 'outsideDropHeight', 'borderRadiusPx', 'transitionDurationMs', 'snapThreshold', 'colNum', 'marginX',
  'marginY', 'rowHeight', 'transformScale', 'undoHistoryLimit',
] as const;
type TGridNumberProp = typeof GRID_NUMBER_PROPS[number];

interface IGridState extends Record<TGridBooleanProp, boolean>, Record<TGridNumberProp, number> {
  acceptOnlyLabWidgets: boolean;
  breakpointsJson: string;
  colsJson: string;
  compactType: string;
  compactorMode: 'builtin' | 'downward';
  heightMode: '' | 'auto' | 'fixed' | 'scroll' | 'fit';
  layoutId: string;
  maxRows: string;
  resizeHandleColor: string;
  responsiveLayoutsJson: string;
  transitionTimingFunction: string;
}

const defaultGridState = (): IGridState => ({
  acceptOnlyLabWidgets: false,
  allowCrossGridDrag: false,
  allowOutsideDrop: false,
  autoSize: true,
  borderRadiusPx: 10,
  breakpointsJson: ``,
  colNum: 12,
  colsJson: ``,
  compactType: `none`,
  compactorMode: `builtin`,
  disableExternalDrop: false,
  distributeEvenly: false,
  enableEditMode: true,
  enableUndoRedo: false,
  heightMode: ``,
  horizontalShift: false,
  isBounded: false,
  isDraggable: true,
  isMirrored: false,
  isResizable: true,
  layoutId: `lab-grid-a`,
  marginX: 10,
  marginY: 10,
  maxRows: ``,
  multiSelect: false,
  outsideDropHeight: 2,
  outsideDropWidth: 2,
  preventCollision: false,
  resizeHandleColor: `rgb(94 94 94 / 45%)`,
  responsive: false,
  responsiveLayoutsJson: ``,
  restoreOnDrag: false,
  rowHeight: 60,
  showAlignmentGuides: false,
  showCloseButton: false,
  showGridLines: false,
  showResizeHandles: false,
  showSpacingGuides: false,
  snapThreshold: 1,
  snapToGrid: false,
  transformScale: 1,
  transitionDurationMs: 0,
  transitionTimingFunction: `ease`,
  undoHistoryLimit: 50,
  useBorderRadius: false,
  useCssTransforms: true,
});

const ITEM_TRI_KEYS = ['isDraggable', 'isResizable', 'isBounded', 'enableEditMode', 'showCloseButton', 'showResizeHandles', 'useBorderRadius', 'isMirrored'] as const;
type TItemTriKey = typeof ITEM_TRI_KEYS[number];
type TTri = 'inherit' | 'true' | 'false';
const ITEM_BOOLEAN_KEYS = ['isStatic', 'preserveAspectRatio', 'autoScroll', 'autoHeight'] as const;
type TItemBooleanKey = typeof ITEM_BOOLEAN_KEYS[number];
const ITEM_NUMBER_KEYS = ['minW', 'minH', 'maxW', 'maxH', 'borderRadiusPx', 'zIndex'] as const;
type TItemNumberKey = typeof ITEM_NUMBER_KEYS[number];
const ITEM_TEXT_KEYS = ['dragAllowFrom', 'dragIgnoreFrom', 'resizeIgnoreFrom', 'resizeHandleColor'] as const;
type TItemTextKey = typeof ITEM_TEXT_KEYS[number];
const ACTIVATION_KEYS = ['value', 'mouse', 'touch', 'pen'] as const;
type TActivationKey = typeof ACTIVATION_KEYS[number];

const triValue = (mode: TTri): boolean | undefined => {
  if(mode === `true`) {
    return true;
  }
  if(mode === `false`) {
    return false;
  }
  return undefined;
};
const numberOrUndefined = (raw: string): number | undefined => (raw.trim() === `` ? undefined : Number(raw));
const textOrUndefined = (raw: string): string | undefined => (raw.trim() === `` ? undefined : raw);

/** Parses a JSON textarea without ever throwing, so a half-typed value never takes the whole lab down. */
function parseJson<T>(raw: string): { failed: boolean; value: T | undefined } {
  if(raw.trim() === ``) {
    return { failed: false, value: undefined };
  }
  try {
    return { failed: false, value: JSON.parse(raw) as T };
  } catch {
    return { failed: true, value: undefined };
  }
}

// A deliberately visible, testably-different custom compactor: items settle toward the bottom instead of floating up.
const downwardCompactor: ICompactor = {
  compact(layoutToCompact: TLayout): TLayout {
    const maxY = 10;
    const placed: TLayout = [];
    const sorted = [...layoutToCompact].sort((a, b) => b.y - a.y);
    for(const item of sorted) {
      const moved = { ...item };
      if(!moved.isStatic) {
        while (moved.y + moved.h < maxY && !placed.some(other => collides({ ...moved, y: moved.y + 1 }, other))) {
          moved.y++;
        }
      }
      placed.push(moved);
    }
    return layoutToCompact.map(item => placed.find(entry => entry.i === item.i) ?? item);
  },
  type: `downward`,
} as ICompactor;

const acceptLabWidgetsOnly = (dataTransfer: DataTransfer | null): boolean => !!dataTransfer?.types.includes(LAB_MIME);

interface ILogEntry {
  id: number;
  name: string;
  payload: string;
}

const isLayoutArray = (value: unknown): value is TLayout =>
  Array.isArray(value) && value.every(entry => entry && typeof entry === `object` && `i` in entry && `x` in entry && `w` in entry);

const summarize = (value: unknown): unknown => {
  if(typeof value === `function`) {
    return `[function]`;
  }
  if(typeof DataTransfer !== `undefined` && value instanceof DataTransfer) {
    return { types: Array.from(value.types) };
  }
  if(isLayoutArray(value)) {
    return value.map(({ h, i, w, x, y }) => ({ h, i, w, x, y }));
  }
  if(Array.isArray(value)) {
    return value.map(summarize);
  }
  if(value && typeof value === `object`) {
    const out: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, inner]) => {
      out[key] = summarize(inner);
    });
    return out;
  }
  return value;
};

const compactLayout = (value: TLayout): { h: number; i: string | number; w: number; x: number; y: number }[] =>
  value.map(({ h, i, w, x, y }) => ({ h, i, w, x, y }));

export default function PropsLab(): React.JSX.Element {
  const [layout, setLayout] = useState<TLayout>(initialLayout());
  const [layoutB, setLayoutB] = useState<TLayout>([]);
  const gridRef = useRef<IGridLayoutHandle>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [useLibraryDefaults, setUseLibraryDefaults] = useState(false);
  const [showGridB, setShowGridB] = useState(false);
  const [stageScale, setStageScale] = useState(1);
  const [stageWidth, setStageWidth] = useState(1200);

  // ---------------------------------------------------------------- grid state

  const [grid, setGridState] = useState<IGridState>(defaultGridState());
  const setGrid = <K extends keyof IGridState>(key: K, value: IGridState[K]): void => setGridState(current => ({ ...current, [key]: value }));
  const [gridB, setGridB] = useState({ allowCrossGridDrag: false, disableExternalDrop: false });
  const [gridResizeHandles, setGridResizeHandles] = useState<TResizeHandle[]>([...RESIZE_HANDLE_EDGES]);
  const [gridAria, setGridAria] = useState<Record<TAriaKey, string>>({ closeButton: ``, itemRoleDescription: ``, moveInstruction: ``, resizeInstruction: `` });
  const [gridPlaceholderSlot, setGridPlaceholderSlot] = useState(false);

  const parsedBreakpoints = useMemo(() => parseJson<IBreakpoints>(grid.breakpointsJson), [grid.breakpointsJson]);
  const parsedCols = useMemo(() => parseJson<IColumns>(grid.colsJson), [grid.colsJson]);
  const parsedResponsiveLayouts = useMemo(() => parseJson<TResponsiveLayout>(grid.responsiveLayoutsJson), [grid.responsiveLayoutsJson]);
  const jsonError = useMemo(() => {
    const failed: string[] = [];
    if(parsedBreakpoints.failed) {
      failed.push(`breakpoints`);
    }
    if(parsedCols.failed) {
      failed.push(`cols`);
    }
    if(parsedResponsiveLayouts.failed) {
      failed.push(`responsiveLayouts`);
    }
    return failed.length === 0 ? `` : `invalid JSON: ${failed.join(`, `)}`;
  }, [parsedBreakpoints, parsedCols, parsedResponsiveLayouts]);

  // ---------------------------------------------------------------- event log

  const [entries, setEntries] = useState<ILogEntry[]>([]);
  const sequenceRef = useRef(0);
  const [lastBreakpoint, setLastBreakpoint] = useState(``);
  const [lastColumns, setLastColumns] = useState(``);
  const [isDragging, setIsDragging] = useState(false);

  const record = useCallback((name: string, args: unknown[]): void => {
    sequenceRef.current += 1;
    const entry = { id: sequenceRef.current, name, payload: JSON.stringify(args.map(summarize)) };
    setEntries(current => [...current.slice(-1999), entry]);
  }, []);
  const log = useCallback((name: string, ...args: unknown[]): void => record(name, args), [record]);
  const logB = useCallback((name: string, ...args: unknown[]): void => record(`b:${name}`, args), [record]);

  // ---------------------------------------------------------------- item state

  const [itemTarget, setItemTarget] = useState(`0`);
  const [itemTri, setItemTri] = useState<Record<TItemTriKey, TTri>>({
    enableEditMode: `inherit`, isBounded: `inherit`, isDraggable: `inherit`, isMirrored: `inherit`, isResizable: `inherit`,
    showCloseButton: `inherit`, showResizeHandles: `inherit`, useBorderRadius: `inherit`,
  });
  const [itemBool, setItemBool] = useState<Record<TItemBooleanKey, boolean>>({ autoHeight: false, autoScroll: false, isStatic: false, preserveAspectRatio: false });
  const [itemSlots, setItemSlots] = useState({ header: false, resizeHandle: false });
  const [lineCount, setLineCount] = useState(1);
  const [itemNum, setItemNum] = useState<Record<TItemNumberKey, string>>({ borderRadiusPx: ``, maxH: ``, maxW: ``, minH: ``, minW: ``, zIndex: `` });
  const [itemText, setItemText] = useState<Record<TItemTextKey, string>>({ dragAllowFrom: ``, dragIgnoreFrom: ``, resizeHandleColor: ``, resizeIgnoreFrom: `` });
  const [activation, setActivation] = useState<{ mode: 'default' | 'number' | 'object' } & Record<TActivationKey, string>>({ mode: `default`, mouse: ``, pen: ``, touch: ``, value: `` });
  const [itemInheritHandles, setItemInheritHandles] = useState(true);
  const [itemResizeHandles, setItemResizeHandles] = useState<TResizeHandle[]>([...RESIZE_HANDLE_EDGES]);
  const [itemAria, setItemAria] = useState<Record<TAriaKey, string>>({ closeButton: ``, itemRoleDescription: ``, moveInstruction: ``, resizeInstruction: `` });
  const [layoutPatch, setLayoutPatch] = useState(`{}`);

  /**
   * The entry fields the `item-*` controls currently manage — only the ones that are NOT "inherit"/blank, so a
   * control that is not in use contributes nothing and the grid default (or the base entry) shows through.
   */
  const targetOverrides = useMemo((): Record<string, unknown> => {
    if(useLibraryDefaults) {
      return {};
    }
    const overrides: Record<string, unknown> = {};
    const assign = (key: string, value: unknown): void => {
      if(value !== undefined) {
        overrides[key] = value;
      }
    };
    ITEM_TRI_KEYS.forEach(key => assign(key, triValue(itemTri[key])));
    ITEM_BOOLEAN_KEYS.forEach(key => assign(key, itemBool[key] ? true : undefined));
    ITEM_NUMBER_KEYS.forEach(key => assign(key, numberOrUndefined(itemNum[key])));
    ITEM_TEXT_KEYS.forEach(key => assign(key, textOrUndefined(itemText[key])));
    if(activation.mode === `number`) {
      assign(`dragActivationDistance`, Number(activation.value || 0));
    } else if(activation.mode === `object`) {
      assign(`dragActivationDistance`, {
        mouse: numberOrUndefined(activation.mouse),
        pen: numberOrUndefined(activation.pen),
        touch: numberOrUndefined(activation.touch),
      });
    }
    if(!itemInheritHandles) {
      assign(`resizeHandles`, itemResizeHandles);
    }
    const ariaLabels: IGridAriaLabels = {};
    ARIA_KEYS.forEach(key => {
      if(itemAria[key] !== ``) {
        ariaLabels[key] = itemAria[key];
      }
    });
    if(Object.keys(ariaLabels).length > 0) {
      assign(`ariaLabels`, ariaLabels);
    }
    return overrides;
  }, [useLibraryDefaults, itemTri, itemBool, itemNum, itemText, activation, itemInheritHandles, itemResizeHandles, itemAria]);

  const overrideKeysRef = useRef<string[]>([]);
  overrideKeysRef.current = Object.keys(targetOverrides);
  const targetRef = useRef(itemTarget);
  targetRef.current = itemTarget;

  /** What `GridLayout` is given: the base layout with the target's overrides merged in. */
  const renderedLayout = useMemo(
    () => layout.map(entry => (String(entry.i) === itemTarget ? { ...entry, ...targetOverrides } : entry)),
    [layout, itemTarget, targetOverrides],
  );

  /** `GridLayout` hands back the layout it was given plus its own changes — strip the overrides again so they never bake into the base. */
  const handleLayoutChange = useCallback((next: TLayout): void => {
    log(`layout-change`, next);
    setLayout(previous => next.map(entry => {
      if(String(entry.i) !== targetRef.current || overrideKeysRef.current.length === 0) {
        return entry;
      }
      const base = previous.find(candidate => candidate.i === entry.i) as Record<string, unknown> | undefined;
      const clean = { ...entry } as Record<string, unknown>;
      overrideKeysRef.current.forEach(key => {
        if(base && key in base) {
          clean[key] = base[key];
        } else {
          delete clean[key];
        }
      });
      return clean as unknown as TLayout[number];
    }));
    // `log` is stable; the refs carry everything else that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  /**
   * Group move/resize and collision handling read these straight from the entry, so this is the one place to set them
   * on the base entry directly (as opposed to the managed `item-*` controls above, which only ever override).
   */
  const applyLayoutPatch = (): void => {
    let patch: Record<string, unknown>;
    try {
      patch = JSON.parse(layoutPatch) as Record<string, unknown>;
    } catch {
      return;
    }
    setLayout(current => current.map(entry => (String(entry.i) === itemTarget ? { ...entry, ...patch } : entry)));
  };

  // ---------------------------------------------------------------- outside drop

  const dropCounter = useRef(0);
  const onWidgetDragStart = (event: DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.setData(LAB_MIME, JSON.stringify({ label: `widget` }));
    event.dataTransfer.effectAllowed = `copy`;
  };
  const onIncompatibleDragStart = (event: DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.setData(`text/plain`, `incompatible`);
  };
  const onDroppedFromOutside = (payload: { dataTransfer: DataTransfer | null; h: number; w: number; x: number; y: number }): void => {
    log(`item-dropped-from-outside`, payload);
    dropCounter.current += 1;
    setLayout(current => [...current, { h: payload.h, i: `drop-${dropCounter.current}`, w: payload.w, x: payload.x, y: payload.y }]);
  };
  const onDroppedFromOutsideB = (payload: { dataTransfer: DataTransfer | null; h: number; w: number; x: number; y: number }): void => {
    logB(`item-dropped-from-outside`, payload);
    dropCounter.current += 1;
    setLayoutB(current => [...current, { h: payload.h, i: `drop-${dropCounter.current}`, w: payload.w, x: payload.x, y: payload.y }]);
  };

  // ---------------------------------------------------------------- methods / persistence

  const [methodId, setMethodId] = useState(`0`);
  const addCounter = useRef(0);
  const addItem = (): void => {
    addCounter.current += 1;
    setLayout(current => {
      const bottom = current.reduce((max, item) => Math.max(max, item.y + item.h), 0);
      return [...current, { h: 2, i: `added-${addCounter.current}`, w: 3, x: 0, y: bottom }];
    });
  };
  const removeLastItem = (): void => setLayout(current => current.slice(0, -1));
  const resetLayout = (): void => {
    setLayout(initialLayout());
    setLayoutB([]);
    setLineCount(1);
  };

  const presets = useLayoutPresets(`lab-presets`);
  const [presetNames, setPresetNames] = useState<string[]>(() => presets.listPresets());
  const [presetLoaded, setPresetLoaded] = useState<boolean | null>(null);
  const loadPresetResult = (name: string): void => {
    const loaded = presets.loadPreset(name);
    setPresetLoaded(loaded !== null);
    if(loaded) {
      setLayout(loaded);
    }
  };

  const storage = useLayoutStorage(`lab-storage`);
  const [storageHas, setStorageHas] = useState(() => storage.hasSaved());
  const [storageLoaded, setStorageLoaded] = useState<boolean | null>(null);
  const [svgOutput, setSvgOutput] = useState(``);

  // The imperative handle's `canUndo`/`canRedo`/`selectedItems` are snapshots refreshed when GridLayout commits, so they
  // are read after every commit (and only stored when something changed, to avoid a render loop).
  const [handleState, setHandleState] = useState({ canRedo: false, canUndo: false, selected: `` });
  const [measuredWidth, setMeasuredWidth] = useState(``);
  useEffect(() => {
    const handle = gridRef.current;
    const next = { canRedo: !!handle?.canRedo, canUndo: !!handle?.canUndo, selected: handle?.selectedItems?.join(`,`) ?? `` };
    setHandleState(current => (current.canRedo === next.canRedo && current.canUndo === next.canUndo && current.selected === next.selected ? current : next));
    const root = wrapRef.current?.querySelector(`.kdl-grid-layout`);
    const width = root ? String(Math.round(root.getBoundingClientRect().width / (stageScale || 1))) : ``;
    setMeasuredWidth(current => (current === width ? current : width));
  });

  // ---------------------------------------------------------------- binding

  const gridProps = useMemo((): Record<string, unknown> => {
    if(useLibraryDefaults) {
      return {};
    }
    const ariaLabels: IGridAriaLabels = {};
    ARIA_KEYS.forEach(key => {
      if(gridAria[key] !== ``) {
        ariaLabels[key] = gridAria[key];
      }
    });
    return {
      allowCrossGridDrag: grid.allowCrossGridDrag,
      allowOutsideDrop: grid.allowOutsideDrop,
      ariaLabels,
      autoSize: grid.autoSize,
      borderRadiusPx: grid.borderRadiusPx,
      breakpoints: parsedBreakpoints.value,
      colNum: grid.colNum,
      cols: parsedCols.value,
      compactType: grid.compactType,
      compactor: grid.compactorMode === `downward` ? downwardCompactor : null,
      disableExternalDrop: grid.disableExternalDrop,
      distributeEvenly: grid.distributeEvenly,
      enableEditMode: grid.enableEditMode,
      enableUndoRedo: grid.enableUndoRedo,
      heightMode: grid.heightMode === `` ? null : grid.heightMode,
      horizontalShift: grid.horizontalShift,
      isBounded: grid.isBounded,
      isDraggable: grid.isDraggable,
      isMirrored: grid.isMirrored,
      isResizable: grid.isResizable,
      layoutId: grid.layoutId === `` ? undefined : grid.layoutId,
      margin: [grid.marginX, grid.marginY],
      maxRows: grid.maxRows.trim() === `` ? Infinity : Number(grid.maxRows),
      multiSelect: grid.multiSelect,
      outsideDropAccept: grid.acceptOnlyLabWidgets ? acceptLabWidgetsOnly : undefined,
      outsideDropHeight: grid.outsideDropHeight,
      outsideDropWidth: grid.outsideDropWidth,
      preventCollision: grid.preventCollision,
      resizeHandleColor: grid.resizeHandleColor,
      resizeHandles: gridResizeHandles,
      responsive: grid.responsive,
      responsiveLayouts: parsedResponsiveLayouts.value,
      restoreOnDrag: grid.restoreOnDrag,
      rowHeight: grid.rowHeight,
      showAlignmentGuides: grid.showAlignmentGuides,
      showCloseButton: grid.showCloseButton,
      showGridLines: grid.showGridLines,
      showResizeHandles: grid.showResizeHandles,
      showSpacingGuides: grid.showSpacingGuides,
      snapThreshold: grid.snapThreshold,
      snapToGrid: grid.snapToGrid,
      transformScale: grid.transformScale,
      transitionDurationMs: grid.transitionDurationMs,
      transitionTimingFunction: grid.transitionTimingFunction,
      undoHistoryLimit: grid.undoHistoryLimit,
      useBorderRadius: grid.useBorderRadius,
      useCssTransforms: grid.useCssTransforms,
    };
  }, [useLibraryDefaults, grid, gridAria, gridResizeHandles, parsedBreakpoints, parsedCols, parsedResponsiveLayouts]);

  const gridBProps = {
    allowCrossGridDrag: gridB.allowCrossGridDrag,
    colNum: grid.colNum,
    compactType: grid.compactType as ECompactType,
    disableExternalDrop: gridB.disableExternalDrop,
    layoutId: `lab-grid-b`,
    margin: [grid.marginX, grid.marginY] as [number, number],
    rowHeight: grid.rowHeight,
    transitionDurationMs: 0,
  };

  // ---------------------------------------------------------------- small render helpers

  const checkbox = (testId: string, checked: boolean, onChange: (value: boolean) => void, label: string): ReactNode => (
    <label key={testId}>
      <input checked={checked} data-testid={testId} onChange={event => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
  const textInput = (testId: string, value: string, onChange: (value: string) => void, label: string): ReactNode => (
    <label key={testId}>
      {label}
      <input data-testid={testId} onChange={event => onChange(event.target.value)} type="text" value={value} />
    </label>
  );
  const button = (testId: string, onClick: () => void, label: string, disabled = false): ReactNode => (
    <button key={testId} data-testid={testId} disabled={disabled} onClick={onClick} type="button">{label}</button>
  );
  const toggleEdge = (current: TResizeHandle[], edge: TResizeHandle, on: boolean): TResizeHandle[] =>
    RESIZE_HANDLE_EDGES.filter(candidate => (candidate === edge ? on : current.includes(candidate)));

  const isTarget = (id: string | number): boolean => String(id) === itemTarget;
  const handle = (): IGridLayoutHandle | null => gridRef.current;

  return (
    <div>
      <h2>Props lab</h2>
      <div className="lab-page">
        <aside className="lab-side">
          <fieldset className="lab-fieldset">
            <legend>Lab</legend>
            {checkbox(`lab-use-library-defaults`, useLibraryDefaults, setUseLibraryDefaults, `bind nothing (library defaults)`)}
            {checkbox(`lab-show-grid-b`, showGridB, setShowGridB, `show second grid (B)`)}
            <label>
              stage width (px)
              <input data-testid="lab-stage-width" onChange={event => setStageWidth(Number(event.target.value))} type="number" value={stageWidth} />
            </label>
            <label>
              stage scale (CSS ancestor)
              <input data-testid="lab-stage-scale" onChange={event => setStageScale(Number(event.target.value))} step="0.1" type="number" value={stageScale} />
            </label>
            {button(`lab-clear-log`, () => setEntries([]), `Clear event log`)}
            {button(`lab-reset-layout`, resetLayout, `Reset layouts`)}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Grid — booleans</legend>
            {GRID_BOOLEAN_PROPS.map(name => checkbox(`grid-${name}`, grid[name], value => setGrid(name, value), name))}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Grid — numbers</legend>
            {GRID_NUMBER_PROPS.map(name => (
              <label key={name}>
                {name}
                <input
                  data-testid={`grid-${name}`}
                  onChange={event => setGrid(name, Number(event.target.value))}
                  step="any"
                  type="number"
                  value={grid[name]}
                />
              </label>
            ))}
            {textInput(`grid-maxRows`, grid.maxRows, value => setGrid(`maxRows`, value), `maxRows (blank = Infinity)`)}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Grid — choices &amp; text</legend>
            <label>
              heightMode
              <select data-testid="grid-heightMode" onChange={event => setGrid(`heightMode`, event.target.value as IGridState['heightMode'])} value={grid.heightMode}>
                <option value="">null (defer to autoSize)</option>
                <option value="auto">auto</option>
                <option value="fixed">fixed</option>
                <option value="scroll">scroll</option>
                <option value="fit">fit</option>
              </select>
            </label>
            <label>
              compactType
              <select data-testid="grid-compactType" onChange={event => setGrid(`compactType`, event.target.value)} value={grid.compactType}>
                {COMPACT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>
              compactor
              <select data-testid="grid-compactor" onChange={event => setGrid(`compactorMode`, event.target.value as IGridState['compactorMode'])} value={grid.compactorMode}>
                <option value="builtin">null (built-in)</option>
                <option value="downward">custom (downward)</option>
              </select>
            </label>
            {textInput(`grid-transitionTimingFunction`, grid.transitionTimingFunction, value => setGrid(`transitionTimingFunction`, value), `transitionTimingFunction`)}
            {textInput(`grid-resizeHandleColor`, grid.resizeHandleColor, value => setGrid(`resizeHandleColor`, value), `resizeHandleColor`)}
            {textInput(`grid-layoutId`, grid.layoutId, value => setGrid(`layoutId`, value), `layoutId`)}
            {checkbox(`grid-outsideDropAccept`, grid.acceptOnlyLabWidgets, value => setGrid(`acceptOnlyLabWidgets`, value), `outsideDropAccept (only the lab widget)`)}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Grid — resizeHandles</legend>
            {RESIZE_HANDLE_EDGES.map(edge => checkbox(`grid-resize-handle-${edge}`, gridResizeHandles.includes(edge), on => setGridResizeHandles(current => toggleEdge(current, edge, on)), edge))}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Grid — ariaLabels / responsive data</legend>
            {ARIA_KEYS.map(key => textInput(`grid-aria-${key}`, gridAria[key], value => setGridAria(current => ({ ...current, [key]: value })), key))}
            <label>
              breakpoints (JSON)
              <textarea data-testid="grid-breakpoints" onChange={event => setGrid(`breakpointsJson`, event.target.value)} rows={2} value={grid.breakpointsJson} />
            </label>
            <label>
              cols (JSON)
              <textarea data-testid="grid-cols" onChange={event => setGrid(`colsJson`, event.target.value)} rows={2} value={grid.colsJson} />
            </label>
            <label>
              responsiveLayouts (JSON)
              <textarea data-testid="grid-responsiveLayouts" onChange={event => setGrid(`responsiveLayoutsJson`, event.target.value)} rows={3} value={grid.responsiveLayoutsJson} />
            </label>
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Grid B (cross-grid target)</legend>
            {checkbox(`gridB-allowCrossGridDrag`, gridB.allowCrossGridDrag, value => setGridB(current => ({ ...current, allowCrossGridDrag: value })), `allowCrossGridDrag`)}
            {checkbox(`gridB-disableExternalDrop`, gridB.disableExternalDrop, value => setGridB(current => ({ ...current, disableExternalDrop: value })), `disableExternalDrop`)}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Item — target</legend>
            <label>
              target item
              <select data-testid="item-target" onChange={event => setItemTarget(event.target.value)} value={itemTarget}>
                {layout.map(item => <option key={String(item.i)} value={String(item.i)}>{String(item.i)}</option>)}
              </select>
            </label>
            <label>
              layout-entry patch (JSON, merged into the target&apos;s base entry)
              <textarea data-testid="lab-layout-patch" onChange={event => setLayoutPatch(event.target.value)} rows={2} value={layoutPatch} />
            </label>
            {button(`lab-apply-layout-patch`, applyLayoutPatch, `apply patch to target's layout entry`)}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Item — tri-state (inherit / true / false)</legend>
            {ITEM_TRI_KEYS.map(key => (
              <label key={key}>
                {key}
                <select data-testid={`item-${key}`} onChange={event => setItemTri(current => ({ ...current, [key]: event.target.value as TTri }))} value={itemTri[key]}>
                  <option value="inherit">inherit</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            ))}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Item — booleans</legend>
            {ITEM_BOOLEAN_KEYS.map(key => checkbox(`item-${key}`, itemBool[key], value => setItemBool(current => ({ ...current, [key]: value })), key))}
            {checkbox(`item-slot-header`, itemSlots.header, value => setItemSlots(current => ({ ...current, header: value })), `header (render prop)`)}
            {checkbox(`item-slot-resize-handle`, itemSlots.resizeHandle, value => setItemSlots(current => ({ ...current, resizeHandle: value })), `renderResizeHandle`)}
            {checkbox(`grid-slot-placeholder`, gridPlaceholderSlot, setGridPlaceholderSlot, `renderPlaceholder (grid)`)}
            {button(`item-add-line`, () => setLineCount(current => current + 1), `Add content line (target)`)}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Item — numbers &amp; text (blank = default)</legend>
            {ITEM_NUMBER_KEYS.map(key => textInput(`item-${key}`, itemNum[key], value => setItemNum(current => ({ ...current, [key]: value })), key))}
            {ITEM_TEXT_KEYS.map(key => textInput(`item-${key}`, itemText[key], value => setItemText(current => ({ ...current, [key]: value })), key))}
            <label>
              dragActivationDistance
              <select data-testid="item-dragActivationDistance-mode" onChange={event => setActivation(current => ({ ...current, mode: event.target.value as typeof activation.mode }))} value={activation.mode}>
                <option value="default">null (3px)</option>
                <option value="number">number</option>
                <option value="object">per pointer</option>
              </select>
            </label>
            {ACTIVATION_KEYS.map(key => textInput(`item-dragActivationDistance-${key}`, activation[key], value => setActivation(current => ({ ...current, [key]: value })), `activation.${key}`))}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Item — resizeHandles</legend>
            {checkbox(`item-resizeHandles-inherit`, itemInheritHandles, setItemInheritHandles, `inherit (null)`)}
            {RESIZE_HANDLE_EDGES.map(edge => checkbox(`item-resize-handle-${edge}`, itemResizeHandles.includes(edge), on => setItemResizeHandles(current => toggleEdge(current, edge, on)), edge))}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Item — ariaLabels</legend>
            {ARIA_KEYS.map(key => textInput(`item-aria-${key}`, itemAria[key], value => setItemAria(current => ({ ...current, [key]: value })), key))}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Exposed methods</legend>
            {button(`lab-compact-now`, () => handle()?.compactNow(), `compactNow`)}
            {button(`lab-rearrange`, () => handle()?.rearrange(), `rearrange`)}
            {button(`lab-duplicate`, () => handle()?.duplicateItem(itemTarget), `duplicateItem(target)`)}
            {button(`lab-undo`, () => handle()?.undo(), `undo`, !handleState.canUndo)}
            {button(`lab-redo`, () => handle()?.redo(), `redo`, !handleState.canRedo)}
            {ALIGN_EDGES.map(edge => button(`lab-align-${edge}`, () => handle()?.alignSelected(edge), `align ${edge}`))}
            {button(`lab-distribute-horizontal`, () => handle()?.distributeSelected(`horizontal`), `distribute horizontal`)}
            {button(`lab-distribute-vertical`, () => handle()?.distributeSelected(`vertical`), `distribute vertical`)}
            {textInput(`lab-method-id`, methodId, setMethodId, `item id`)}
            {button(`lab-select-item`, () => handle()?.selectItem(methodId), `selectItem`)}
            {button(`lab-deselect-item`, () => handle()?.deselectItem(methodId), `deselectItem`)}
            {button(`lab-toggle-item`, () => handle()?.toggleItemSelection(methodId), `toggleItemSelection`)}
            {button(`lab-clear-selection`, () => handle()?.clearSelection(), `clearSelection`)}
            {button(`lab-scroll-to-item`, () => { void handle()?.scrollToItem(methodId); }, `scrollToItem`)}
            {button(`lab-focus-item`, () => { void handle()?.focusItem(methodId); }, `focusItem`)}
            {button(`lab-add-item`, addItem, `add item`)}
            {button(`lab-remove-last-item`, removeLastItem, `remove last item`)}
            {button(`lab-load-align-layout`, () => setLayout(alignLayout()), `load align/distribute layout`)}
          </fieldset>

          <fieldset className="lab-fieldset">
            <legend>Presets / storage / SVG export</legend>
            {button(`lab-save-preset`, () => { presets.savePreset(`lab`, layout); setPresetNames(presets.listPresets()); }, `save preset "lab"`)}
            {button(`lab-load-preset`, () => loadPresetResult(`lab`), `load preset "lab"`)}
            {button(`lab-load-missing-preset`, () => loadPresetResult(`does-not-exist`), `load missing preset`)}
            {button(`lab-delete-preset`, () => { presets.deletePreset(`lab`); setPresetNames(presets.listPresets()); }, `delete preset "lab"`)}
            {button(`lab-save-storage`, () => { storage.save(layout); setStorageHas(storage.hasSaved()); }, `storage.save`)}
            {button(`lab-load-storage`, () => {
              const loaded = storage.load();
              setStorageLoaded(loaded !== null);
              if(loaded) {
                setLayout(loaded);
              }
            }, `storage.load`)}
            {button(`lab-clear-storage`, () => { storage.clear(); setStorageHas(storage.hasSaved()); }, `storage.clear`)}
            {button(`lab-export-svg`, () => setSvgOutput(handle()?.exportLayoutAsSvg() ?? ``), `exportLayoutAsSvg`)}
          </fieldset>

          <fieldset className="lab-fieldset lab-readouts">
            <legend>Readouts</legend>
            <div>layout: <code data-testid="lab-layout-json">{JSON.stringify(compactLayout(layout))}</code></div>
            <div>layout B: <code data-testid="lab-layout-b-json">{JSON.stringify(compactLayout(layoutB))}</code></div>
            <div>selected: <code data-testid="lab-selected">{handleState.selected}</code></div>
            <div>canUndo: <code data-testid="lab-can-undo">{String(handleState.canUndo)}</code></div>
            <div>canRedo: <code data-testid="lab-can-redo">{String(handleState.canRedo)}</code></div>
            <div>breakpoint: <code data-testid="lab-breakpoint">{lastBreakpoint}</code></div>
            <div>columns: <code data-testid="lab-columns">{lastColumns}</code></div>
            <div>measured width: <code data-testid="lab-grid-width">{measuredWidth}</code></div>
            <div>isDragging: <code data-testid="lab-is-dragging">{String(isDragging)}</code></div>
            <div>presets: <code data-testid="lab-presets">{presetNames.join(`,`)}</code></div>
            <div>preset load returned: <code data-testid="lab-preset-loaded">{String(presetLoaded)}</code></div>
            <div>storage has data: <code data-testid="lab-storage-has">{String(storageHas)}</code></div>
            <div>storage.load returned: <code data-testid="lab-storage-loaded">{String(storageLoaded)}</code></div>
            <div>json error: <code data-testid="lab-json-error">{jsonError}</code></div>
            <pre className="lab-svg" data-testid="lab-svg-output">{svgOutput}</pre>
          </fieldset>

          <ul className="lab-log" data-testid="event-log">
            {entries.map(entry => (
              <li key={entry.id} data-event={entry.name} data-payload={entry.payload}>{entry.name}</li>
            ))}
          </ul>
        </aside>

        <section className="lab-stage">
          <div className="lab-palette" data-testid="lab-palette">
            <div className="lab-widget" data-testid="lab-widget" draggable onDragStart={onWidgetDragStart}>⠿ widget</div>
            <div className="lab-widget lab-widget-other" data-testid="lab-widget-incompatible" draggable onDragStart={onIncompatibleDragStart}>⠿ incompatible</div>
          </div>

          <div
            ref={wrapRef}
            className="lab-grid-wrap"
            data-testid="lab-grid-wrap"
            style={{ transform: stageScale === 1 ? undefined : `scale(${stageScale})`, transformOrigin: `0 0`, width: `${stageWidth}px` }}
          >
            <GridLayout
              ref={gridRef}
              layout={renderedLayout}
              onBreakpointChange={(breakpoint, cols) => {
                setLastBreakpoint(breakpoint);
                log(`breakpoint-changed`, breakpoint, cols);
              }}
              onColumnsChanged={columns => {
                setLastColumns(String(columns));
                log(`columns-changed`, columns);
              }}
              onCrossGridDropRejected={payload => log(`cross-grid-drop-rejected`, payload)}
              onCrossGridItemDropped={payload => log(`cross-grid-item-dropped`, payload)}
              onDragEnd={id => {
                setIsDragging(false);
                log(`dragend`, id);
              }}
              onDragMove={id => log(`dragmove`, id)}
              onDragStart={id => {
                setIsDragging(true);
                log(`dragstart`, id);
              }}
              onItemClose={id => {
                log(`remove-grid-item`, id);
                setLayout(current => current.filter(item => item.i !== id));
              }}
              onLayoutChange={handleLayoutChange}
              onLayoutReady={ready => log(`layout-ready`, ready)}
              onMoveBlockedByCollision={id => log(`move-blocked-by-collision`, id)}
              onOutsideDrop={onDroppedFromOutside}
              onSelectionChanged={selected => log(`selection-changed`, selected)}
              renderPlaceholder={gridPlaceholderSlot
                ? (_placeholder, dragging) => <div className="lab-placeholder" data-dragging={String(dragging)} data-testid="lab-placeholder-content">custom placeholder</div>
                : undefined}
              {...gridProps}
            >
              {renderedLayout.map(item => (
                <GridItem
                  key={String(item.i)}
                  header={isTarget(item.i) && itemSlots.header ? <strong className="lab-header" data-testid="lab-header-content">header slot</strong> : undefined}
                  i={item.i}
                  onItemMoved={payload => log(`item-moved`, payload.i, payload.x, payload.y)}
                  onItemResized={payload => log(`item-resized`, payload.i, payload.h, payload.w, payload.height, payload.width)}
                  renderResizeHandle={isTarget(item.i) && itemSlots.resizeHandle
                    ? edge => <span className="lab-custom-handle" data-edge={edge} data-testid="lab-custom-handle">{edge}</span>
                    : undefined}
                >
                  <div className="fixture-item-content lab-item" data-testid={`lab-item-body-${item.i}`}>
                    Item {String(item.i)}
                    <button className="lab-inner-button" type="button">btn</button>
                    {isTarget(item.i) && Array.from({ length: lineCount }, (_, index) => <p key={index} className="lab-line">line {index + 1}</p>)}
                  </div>
                </GridItem>
              ))}
            </GridLayout>
          </div>

          {showGridB && (
            <div className="lab-grid-wrap lab-grid-b" data-testid="lab-grid-b-wrap" style={{ width: `${stageWidth}px` }}>
              <GridLayout
                layout={layoutB}
                onCrossGridDropRejected={payload => logB(`cross-grid-drop-rejected`, payload)}
                onCrossGridItemDropped={payload => logB(`cross-grid-item-dropped`, payload)}
                onDragEnd={id => logB(`dragend`, id)}
                onDragStart={id => logB(`dragstart`, id)}
                onLayoutChange={next => {
                  logB(`layout-change`, next);
                  setLayoutB(next);
                }}
                onOutsideDrop={onDroppedFromOutsideB}
                {...gridBProps}
              >
                {layoutB.map(item => (
                  <GridItem key={String(item.i)} i={item.i}>
                    <div className="fixture-item-content">B: {String(item.i)}</div>
                  </GridItem>
                ))}
              </GridLayout>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

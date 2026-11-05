import { AfterViewChecked, Component, ElementRef, NgZone, ViewChild, computed, inject, signal } from '@angular/core';
import { GridItemComponent } from '../../src/lib/grid-item.component';
import { GridItemHeaderDirective } from '../../src/lib/grid-item-header.directive';
import { GridLayoutComponent } from '../../src/lib/grid-layout.component';
import { GridLayoutPresetsService } from '../../src/lib/grid-layout-presets.service';
import { GridLayoutStorageService } from '../../src/lib/grid-layout-storage.service';
import { ECompactType, collides } from 'keystone-dashboard-layout-core';
import type {
  IBreakpoints,
  IColumns,
  ICompactor,
  IGridAriaLabels,
  TAlignEdge,
  TDragActivationDistance,
  TLayout,
  TResizeHandle,
} from 'keystone-dashboard-layout-core';

/**
 * A test fixture, not an example — the Angular counterpart of the React package's `e2e-fixture/scenarios/PropsLab.tsx` and
 * the Vue package's `demo/views/PropsLabView.vue`. Every `GridLayoutComponent` input is bound to a control (`grid-<prop>` test
 * ids), every output is logged, and every public method has a button, so each property can be switched on, driven in a real
 * browser and asserted against. The stage is a fixed 1200px wide, so pixel maths is deterministic. The test ids, the event-log
 * format and the readouts are the same as the React lab's, so `e2e/lab-helpers.ts` is shared in shape.
 *
 * Where Angular differs from React, and so from the React lab:
 *   - A `GridItemComponent` takes its per-item settings as INPUTS (`isStatic`, `minW`, ... — Vue's shape), not from the layout
 *     entry. The `item-*` controls therefore bind those inputs on the *target* item. The few settings the layout engine itself
 *     reads from the entry (`isStatic`, `isDraggable`, `isResizable`, `minW`/`maxW`/`minH`/`maxH`) are ALSO merged into the
 *     target's layout entry (and stripped again from what `layoutChange` hands back), exactly as the React lab does: a
 *     consumer of this library has to keep the two in step, and this is what lets collision and group-resize tests run.
 *   - "Bind nothing" (`lab-use-library-defaults`) renders a second, bare `<kdl-grid-layout>` with no input set at all, which is
 *     the only way to see an Angular input's own default (binding the default value would not test it).
 *   - The grid has no grid-wide `resizeHandles` input, so only the per-item one has controls.
 *   - `breakpointChanged` emits only the breakpoint name; there is no `columns` argument, and no `item-clicked`,
 *     `container-resized` or per-tick `resize` event.
 *   - `breakpoints`/`cols`/`responsiveLayouts` cannot be left unbound, so blank JSON falls back to a copy of the library's own
 *     default values below.
 *   - Output handlers write state through `later()`: `layoutChange` can be emitted from `ngOnChanges`, i.e. in the middle of
 *     the consumer's own change-detection pass, and writing the very state that pass is reading is an
 *     ExpressionChangedAfterItHasBeenChecked error. A microtask is invisible to anything driven by a user event.
 */

const RESIZE_HANDLE_EDGES: TResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const COMPACT_TYPES = Object.values(ECompactType);
const ALIGN_EDGES: TAlignEdge[] = ['left', 'right', 'top', 'bottom', 'center-x', 'center-y'];
const ARIA_KEYS = ['closeButton', 'itemRoleDescription', 'moveInstruction', 'resizeInstruction'] as const;
type TAriaKey = typeof ARIA_KEYS[number];
const LAB_MIME = `application/x-lab-widget`;
const PRESET_KEY = `lab-presets`;
const STORAGE_KEY = `lab-storage`;
const DEFAULT_DRAG_IGNORE_FROM = `a, button`;

/** The library's own defaults for the three inputs that cannot be left unbound (see this file's header). */
const DEFAULT_BREAKPOINTS: IBreakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxl: 1600, xl: 1400, xxs: 0 };
const DEFAULT_COLS: IColumns = { lg: 12, md: 10, sm: 6, xs: 4, xxl: 12, xl: 12, xxs: 2 };
const NO_RESPONSIVE_LAYOUTS: Record<string, TLayout> = {};

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

type TGridTextProp = 'breakpointsJson' | 'colsJson' | 'layoutId' | 'maxRows' | 'resizeHandleColor' | 'responsiveLayoutsJson' | 'transitionTimingFunction';

interface IGridState extends Record<TGridBooleanProp, boolean>, Record<TGridNumberProp, number>, Record<TGridTextProp, string> {
  acceptOnlyLabWidgets: boolean;
  compactType: string;
  compactorMode: 'builtin' | 'downward';
  heightMode: '' | 'auto' | 'fixed' | 'scroll' | 'fit';
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
type TActivationMode = 'default' | 'number' | 'object';

/** Every input of a `GridItemComponent` the item controls manage. */
interface IItemInputs {
  ariaLabels: IGridAriaLabels;
  autoHeight: boolean;
  autoScroll: boolean;
  borderRadiusPx: number | null;
  dragActivationDistance: TDragActivationDistance | null;
  dragAllowFrom: string | null;
  dragIgnoreFrom: string;
  enableEditMode: boolean | null;
  isBounded: boolean | null;
  isDraggable: boolean | null;
  isMirrored: boolean | null;
  isResizable: boolean | null;
  isStatic: boolean;
  maxH: number;
  maxW: number;
  minH: number;
  minW: number;
  preserveAspectRatio: boolean;
  resizeHandleColor: string | null;
  resizeHandles: TResizeHandle[] | null;
  resizeIgnoreFrom: string | null;
  showCloseButton: boolean | null;
  showResizeHandles: boolean | null;
  useBorderRadius: boolean | null;
  zIndex: number | null;
}

/** What every non-target item is bound to — the component's own defaults, spelled out. */
const DEFAULT_ITEM_INPUTS: IItemInputs = {
  ariaLabels: {},
  autoHeight: false,
  autoScroll: false,
  borderRadiusPx: null,
  dragActivationDistance: null,
  dragAllowFrom: null,
  dragIgnoreFrom: DEFAULT_DRAG_IGNORE_FROM,
  enableEditMode: null,
  isBounded: null,
  isDraggable: null,
  isMirrored: null,
  isResizable: null,
  isStatic: false,
  maxH: Infinity,
  maxW: Infinity,
  minH: 1,
  minW: 1,
  preserveAspectRatio: false,
  resizeHandleColor: null,
  resizeHandles: null,
  resizeIgnoreFrom: null,
  showCloseButton: null,
  showResizeHandles: null,
  useBorderRadius: null,
  zIndex: null,
};

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

interface IOutsideDropPayload {
  dataTransfer: DataTransfer | null;
  h: number;
  w: number;
  x: number;
  y: number;
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

@Component({
  imports: [GridItemComponent, GridItemHeaderDirective, GridLayoutComponent],
  selector: `app-props-lab`,
  standalone: true,
  template: `
    <div>
      <h2>Props lab</h2>
      <div class="lab-page">
        <aside class="lab-side">
          <fieldset class="lab-fieldset">
            <legend>Lab</legend>
            <label><input data-testid="lab-use-library-defaults" type="checkbox" [checked]="useLibraryDefaults()" (change)="useLibraryDefaults.set(isChecked($event))" />bind nothing (library defaults)</label>
            <label><input data-testid="lab-show-grid-b" type="checkbox" [checked]="showGridB()" (change)="showGridB.set(isChecked($event))" />show second grid (B)</label>
            <label>stage width (px)<input data-testid="lab-stage-width" type="number" [value]="stageWidth()" (input)="stageWidth.set(numberOf($event))" /></label>
            <label>stage scale (CSS ancestor)<input data-testid="lab-stage-scale" step="0.1" type="number" [value]="stageScale()" (input)="stageScale.set(numberOf($event))" /></label>
            <button data-testid="lab-clear-log" type="button" (click)="entries.set([])">Clear event log</button>
            <button data-testid="lab-reset-layout" type="button" (click)="resetLayout()">Reset layouts</button>
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Grid — booleans</legend>
            @for (name of gridBooleanProps; track name) {
              <label><input [attr.data-testid]="'grid-' + name" type="checkbox" [checked]="grid()[name]" (change)="setGrid(name, isChecked($event))" />{{ name }}</label>
            }
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Grid — numbers</legend>
            @for (name of gridNumberProps; track name) {
              <label>{{ name }}<input [attr.data-testid]="'grid-' + name" step="any" type="number" [value]="grid()[name]" (input)="setGrid(name, numberOf($event))" /></label>
            }
            <label>maxRows (blank = Infinity)<input data-testid="grid-maxRows" type="text" [value]="grid().maxRows" (input)="setGrid('maxRows', textOf($event))" /></label>
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Grid — choices &amp; text</legend>
            <label>heightMode
              <select data-testid="grid-heightMode" (change)="setHeightMode($event)">
                <option value="" [selected]="grid().heightMode === ''">null (defer to autoSize)</option>
                <option value="auto" [selected]="grid().heightMode === 'auto'">auto</option>
                <option value="fixed" [selected]="grid().heightMode === 'fixed'">fixed</option>
                <option value="scroll" [selected]="grid().heightMode === 'scroll'">scroll</option>
                <option value="fit" [selected]="grid().heightMode === 'fit'">fit</option>
              </select>
            </label>
            <label>compactType
              <select data-testid="grid-compactType" (change)="setGrid('compactType', textOf($event))">
                @for (type of compactTypes; track type) {
                  <option [value]="type" [selected]="grid().compactType === type">{{ type }}</option>
                }
              </select>
            </label>
            <label>compactor
              <select data-testid="grid-compactor" (change)="setCompactorMode($event)">
                <option value="builtin" [selected]="grid().compactorMode === 'builtin'">null (built-in)</option>
                <option value="downward" [selected]="grid().compactorMode === 'downward'">custom (downward)</option>
              </select>
            </label>
            <label>transitionTimingFunction<input data-testid="grid-transitionTimingFunction" type="text" [value]="grid().transitionTimingFunction" (input)="setGrid('transitionTimingFunction', textOf($event))" /></label>
            <label>resizeHandleColor<input data-testid="grid-resizeHandleColor" type="text" [value]="grid().resizeHandleColor" (input)="setGrid('resizeHandleColor', textOf($event))" /></label>
            <label>layoutId<input data-testid="grid-layoutId" type="text" [value]="grid().layoutId" (input)="setGrid('layoutId', textOf($event))" /></label>
            <label><input data-testid="grid-outsideDropAccept" type="checkbox" [checked]="grid().acceptOnlyLabWidgets" (change)="setGrid('acceptOnlyLabWidgets', isChecked($event))" />outsideDropAccept (only the lab widget)</label>
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Grid — ariaLabels / responsive data</legend>
            @for (key of ariaKeys; track key) {
              <label>{{ key }}<input [attr.data-testid]="'grid-aria-' + key" type="text" [value]="gridAria()[key]" (input)="setGridAria(key, textOf($event))" /></label>
            }
            <label>breakpoints (JSON)<textarea data-testid="grid-breakpoints" rows="2" [value]="grid().breakpointsJson" (input)="setGrid('breakpointsJson', textOf($event))"></textarea></label>
            <label>cols (JSON)<textarea data-testid="grid-cols" rows="2" [value]="grid().colsJson" (input)="setGrid('colsJson', textOf($event))"></textarea></label>
            <label>responsiveLayouts (JSON)<textarea data-testid="grid-responsiveLayouts" rows="3" [value]="grid().responsiveLayoutsJson" (input)="setGrid('responsiveLayoutsJson', textOf($event))"></textarea></label>
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Grid B (cross-grid target)</legend>
            <label><input data-testid="gridB-allowCrossGridDrag" type="checkbox" [checked]="gridB().allowCrossGridDrag" (change)="setGridB('allowCrossGridDrag', isChecked($event))" />allowCrossGridDrag</label>
            <label><input data-testid="gridB-disableExternalDrop" type="checkbox" [checked]="gridB().disableExternalDrop" (change)="setGridB('disableExternalDrop', isChecked($event))" />disableExternalDrop</label>
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Item — target</legend>
            <label>target item
              <select data-testid="item-target" (change)="itemTarget.set(textOf($event))">
                @for (entry of layout(); track entry.i) {
                  <option [value]="str(entry.i)" [selected]="str(entry.i) === itemTarget()">{{ str(entry.i) }}</option>
                }
              </select>
            </label>
            <label>layout-entry patch (JSON, merged into the target's base entry)<textarea data-testid="lab-layout-patch" rows="2" [value]="layoutPatch()" (input)="layoutPatch.set(textOf($event))"></textarea></label>
            <button data-testid="lab-apply-layout-patch" type="button" (click)="applyLayoutPatch()">apply patch to target's layout entry</button>
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Item — tri-state (inherit / true / false)</legend>
            @for (key of itemTriKeys; track key) {
              <label>{{ key }}
                <select [attr.data-testid]="'item-' + key" (change)="setItemTri(key, $event)">
                  <option value="inherit" [selected]="itemTri()[key] === 'inherit'">inherit</option>
                  <option value="true" [selected]="itemTri()[key] === 'true'">true</option>
                  <option value="false" [selected]="itemTri()[key] === 'false'">false</option>
                </select>
              </label>
            }
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Item — booleans</legend>
            @for (key of itemBooleanKeys; track key) {
              <label><input [attr.data-testid]="'item-' + key" type="checkbox" [checked]="itemBool()[key]" (change)="setItemBool(key, isChecked($event))" />{{ key }}</label>
            }
            <label><input data-testid="item-slot-header" type="checkbox" [checked]="itemSlots().header" (change)="setItemSlot('header', isChecked($event))" />header (projected content)</label>
            <label><input data-testid="item-slot-resize-handle" type="checkbox" [checked]="itemSlots().resizeHandle" (change)="setItemSlot('resizeHandle', isChecked($event))" />resizeHandle template</label>
            <label><input data-testid="grid-slot-placeholder" type="checkbox" [checked]="gridPlaceholderSlot()" (change)="gridPlaceholderSlot.set(isChecked($event))" />placeholder template (grid)</label>
            <button data-testid="item-add-line" type="button" (click)="lineCount.set(lineCount() + 1)">Add content line (target)</button>
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Item — numbers &amp; text (blank = default)</legend>
            @for (key of itemNumberKeys; track key) {
              <label>{{ key }}<input [attr.data-testid]="'item-' + key" type="text" [value]="itemNum()[key]" (input)="setItemNum(key, textOf($event))" /></label>
            }
            @for (key of itemTextKeys; track key) {
              <label>{{ key }}<input [attr.data-testid]="'item-' + key" type="text" [value]="itemText()[key]" (input)="setItemText(key, textOf($event))" /></label>
            }
            <label>dragActivationDistance
              <select data-testid="item-dragActivationDistance-mode" (change)="setActivationMode($event)">
                <option value="default" [selected]="activation().mode === 'default'">null (3px)</option>
                <option value="number" [selected]="activation().mode === 'number'">number</option>
                <option value="object" [selected]="activation().mode === 'object'">per pointer</option>
              </select>
            </label>
            @for (key of activationKeys; track key) {
              <label>activation.{{ key }}<input [attr.data-testid]="'item-dragActivationDistance-' + key" type="text" [value]="activation()[key]" (input)="setActivation(key, textOf($event))" /></label>
            }
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Item — resizeHandles</legend>
            <label><input data-testid="item-resizeHandles-inherit" type="checkbox" [checked]="itemInheritHandles()" (change)="itemInheritHandles.set(isChecked($event))" />inherit (null)</label>
            @for (edge of resizeHandleEdges; track edge) {
              <label><input [attr.data-testid]="'item-resize-handle-' + edge" type="checkbox" [checked]="itemResizeHandles().includes(edge)" (change)="setItemResizeHandle(edge, isChecked($event))" />{{ edge }}</label>
            }
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Item — ariaLabels</legend>
            @for (key of ariaKeys; track key) {
              <label>{{ key }}<input [attr.data-testid]="'item-aria-' + key" type="text" [value]="itemAria()[key]" (input)="setItemAria(key, textOf($event))" /></label>
            }
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Exposed methods</legend>
            <button data-testid="lab-compact-now" type="button" (click)="mainGrid?.compactNow()">compactNow</button>
            <button data-testid="lab-rearrange" type="button" (click)="mainGrid?.rearrange()">rearrange</button>
            <button data-testid="lab-duplicate" type="button" (click)="mainGrid?.duplicateItem(itemTarget())">duplicateItem(target)</button>
            <button data-testid="lab-undo" type="button" [disabled]="!handleState().canUndo" (click)="mainGrid?.undo()">undo</button>
            <button data-testid="lab-redo" type="button" [disabled]="!handleState().canRedo" (click)="mainGrid?.redo()">redo</button>
            @for (edge of alignEdges; track edge) {
              <button [attr.data-testid]="'lab-align-' + edge" type="button" (click)="mainGrid?.alignSelected(edge)">align {{ edge }}</button>
            }
            <button data-testid="lab-distribute-horizontal" type="button" (click)="mainGrid?.distributeSelected('horizontal')">distribute horizontal</button>
            <button data-testid="lab-distribute-vertical" type="button" (click)="mainGrid?.distributeSelected('vertical')">distribute vertical</button>
            <label>item id<input data-testid="lab-method-id" type="text" [value]="methodId()" (input)="methodId.set(textOf($event))" /></label>
            <button data-testid="lab-select-item" type="button" (click)="mainGrid?.selectItem(methodId())">selectItem</button>
            <button data-testid="lab-deselect-item" type="button" (click)="mainGrid?.deselectItem(methodId())">deselectItem</button>
            <button data-testid="lab-toggle-item" type="button" (click)="mainGrid?.toggleItemSelection(methodId())">toggleItemSelection</button>
            <button data-testid="lab-clear-selection" type="button" (click)="mainGrid?.clearSelection()">clearSelection</button>
            <button data-testid="lab-scroll-to-item" type="button" (click)="mainGrid?.scrollToItem(methodId())">scrollToItem</button>
            <button data-testid="lab-focus-item" type="button" (click)="mainGrid?.focusItem(methodId())">focusItem</button>
            <button data-testid="lab-add-item" type="button" (click)="addItem()">add item</button>
            <button data-testid="lab-remove-last-item" type="button" (click)="removeLastItem()">remove last item</button>
            <button data-testid="lab-load-align-layout" type="button" (click)="layout.set(alignLayout())">load align/distribute layout</button>
          </fieldset>

          <fieldset class="lab-fieldset">
            <legend>Presets / storage / SVG export</legend>
            <button data-testid="lab-save-preset" type="button" (click)="savePreset()">save preset "lab"</button>
            <button data-testid="lab-load-preset" type="button" (click)="loadPreset('lab')">load preset "lab"</button>
            <button data-testid="lab-load-missing-preset" type="button" (click)="loadPreset('does-not-exist')">load missing preset</button>
            <button data-testid="lab-delete-preset" type="button" (click)="deletePreset()">delete preset "lab"</button>
            <button data-testid="lab-save-storage" type="button" (click)="saveStorage()">storage.save</button>
            <button data-testid="lab-load-storage" type="button" (click)="loadStorage()">storage.load</button>
            <button data-testid="lab-clear-storage" type="button" (click)="clearStorage()">storage.clear</button>
            <button data-testid="lab-export-svg" type="button" (click)="svgOutput.set(mainGrid?.exportLayoutAsSvg() ?? '')">exportLayoutAsSvg</button>
          </fieldset>

          <fieldset class="lab-fieldset lab-readouts">
            <legend>Readouts</legend>
            <div>layout: <code data-testid="lab-layout-json">{{ layoutJson() }}</code></div>
            <div>layout B: <code data-testid="lab-layout-b-json">{{ layoutBJson() }}</code></div>
            <div>selected: <code data-testid="lab-selected">{{ handleState().selected }}</code></div>
            <div>canUndo: <code data-testid="lab-can-undo">{{ handleState().canUndo }}</code></div>
            <div>canRedo: <code data-testid="lab-can-redo">{{ handleState().canRedo }}</code></div>
            <div>breakpoint: <code data-testid="lab-breakpoint">{{ lastBreakpoint() }}</code></div>
            <div>columns: <code data-testid="lab-columns">{{ lastColumns() }}</code></div>
            <div>measured width: <code data-testid="lab-grid-width">{{ measuredWidth() }}</code></div>
            <div>isDragging: <code data-testid="lab-is-dragging">{{ isDragging() }}</code></div>
            <div>presets: <code data-testid="lab-presets">{{ presetNames().join(',') }}</code></div>
            <div>preset load returned: <code data-testid="lab-preset-loaded">{{ str(presetLoaded()) }}</code></div>
            <div>storage has data: <code data-testid="lab-storage-has">{{ storageHas() }}</code></div>
            <div>storage.load returned: <code data-testid="lab-storage-loaded">{{ str(storageLoaded()) }}</code></div>
            <div>json error: <code data-testid="lab-json-error">{{ jsonError() }}</code></div>
            <pre class="lab-svg" data-testid="lab-svg-output">{{ svgOutput() }}</pre>
          </fieldset>

          <ul class="lab-log" data-testid="event-log">
            @for (entry of entries(); track entry.id) {
              <li [attr.data-event]="entry.name" [attr.data-payload]="entry.payload">{{ entry.name }}</li>
            }
          </ul>
        </aside>

        <section class="lab-stage">
          <div class="lab-palette" data-testid="lab-palette">
            <div class="lab-widget" data-testid="lab-widget" draggable="true" (dragstart)="onWidgetDragStart($event)">⠿ widget</div>
            <div class="lab-widget lab-widget-other" data-testid="lab-widget-incompatible" draggable="true" (dragstart)="onIncompatibleDragStart($event)">⠿ incompatible</div>
          </div>

          <div #wrap class="lab-grid-wrap" data-testid="lab-grid-wrap" style="transform-origin: 0 0"
               [style.transform]="stageScale() === 1 ? null : 'scale(' + stageScale() + ')'" [style.width.px]="stageWidth()">
            @if (useLibraryDefaults()) {
              <kdl-grid-layout
                #mainGrid
                [layout]="renderedLayout()"
                (breakpointChanged)="onBreakpointChanged($event)"
                (columnsChanged)="onColumnsChanged($event)"
                (crossGridDropRejected)="logLater('cross-grid-drop-rejected', $event)"
                (crossGridItemDropped)="logLater('cross-grid-item-dropped', $event)"
                (dragEnd)="onDragEnd($event)"
                (dragMove)="logLater('dragmove', $event)"
                (dragStart)="onDragStart($event)"
                (itemDroppedFromOutside)="onDroppedFromOutside($event)"
                (layoutChange)="handleLayoutChange($event)"
                (layoutReady)="logLater('layout-ready', $event)"
                (moveBlockedByCollision)="logLater('move-blocked-by-collision', $event)"
                (selectionChanged)="logLater('selection-changed', $event)"
              >
                @for (entry of renderedLayout(); track entry.i) {
                  <kdl-grid-item
                    [h]="entry.h" [i]="entry.i" [w]="entry.w" [x]="entry.x" [y]="entry.y"
                    (itemMoved)="onItemMoved($event)" (itemResized)="onItemResized($event)" (removeItem)="onItemClose($event)"
                  >
                    <div class="fixture-item-content lab-item" [attr.data-testid]="'lab-item-body-' + entry.i">Item {{ entry.i }}<button class="lab-inner-button" type="button">btn</button></div>
                  </kdl-grid-item>
                }
              </kdl-grid-layout>
            } @else {
              <kdl-grid-layout
                #mainGrid
                [allowCrossGridDrag]="grid().allowCrossGridDrag"
                [allowOutsideDrop]="grid().allowOutsideDrop"
                [ariaLabels]="gridAriaLabels()"
                [autoSize]="grid().autoSize"
                [borderRadiusPx]="grid().borderRadiusPx"
                [breakpoints]="breakpointsInput()"
                [colNum]="grid().colNum"
                [cols]="colsInput()"
                [compactType]="compactTypeInput()"
                [compactor]="compactorInput()"
                [disableExternalDrop]="grid().disableExternalDrop"
                [distributeEvenly]="grid().distributeEvenly"
                [enableEditMode]="grid().enableEditMode"
                [enableUndoRedo]="grid().enableUndoRedo"
                [heightMode]="heightModeInput()"
                [horizontalShift]="grid().horizontalShift"
                [isBounded]="grid().isBounded"
                [isDraggable]="grid().isDraggable"
                [isMirrored]="grid().isMirrored"
                [isResizable]="grid().isResizable"
                [layout]="renderedLayout()"
                [layoutId]="layoutIdInput()"
                [margin]="marginInput()"
                [maxRows]="maxRowsInput()"
                [multiSelect]="grid().multiSelect"
                [outsideDropAccept]="outsideDropAcceptInput()"
                [outsideDropHeight]="grid().outsideDropHeight"
                [outsideDropWidth]="grid().outsideDropWidth"
                [preventCollision]="grid().preventCollision"
                [resizeHandleColor]="grid().resizeHandleColor"
                [responsive]="grid().responsive"
                [responsiveLayouts]="responsiveLayoutsInput()"
                [restoreOnDrag]="grid().restoreOnDrag"
                [rowHeight]="grid().rowHeight"
                [showAlignmentGuides]="grid().showAlignmentGuides"
                [showCloseButton]="grid().showCloseButton"
                [showGridLines]="grid().showGridLines"
                [showResizeHandles]="grid().showResizeHandles"
                [showSpacingGuides]="grid().showSpacingGuides"
                [snapThreshold]="grid().snapThreshold"
                [snapToGrid]="grid().snapToGrid"
                [transformScale]="grid().transformScale"
                [transitionDurationMs]="grid().transitionDurationMs"
                [transitionTimingFunction]="grid().transitionTimingFunction"
                [undoHistoryLimit]="grid().undoHistoryLimit"
                [useBorderRadius]="grid().useBorderRadius"
                [useCssTransforms]="grid().useCssTransforms"
                (breakpointChanged)="onBreakpointChanged($event)"
                (columnsChanged)="onColumnsChanged($event)"
                (crossGridDropRejected)="logLater('cross-grid-drop-rejected', $event)"
                (crossGridItemDropped)="logLater('cross-grid-item-dropped', $event)"
                (dragEnd)="onDragEnd($event)"
                (dragMove)="logLater('dragmove', $event)"
                (dragStart)="onDragStart($event)"
                (itemDroppedFromOutside)="onDroppedFromOutside($event)"
                (layoutChange)="handleLayoutChange($event)"
                (layoutReady)="logLater('layout-ready', $event)"
                (moveBlockedByCollision)="logLater('move-blocked-by-collision', $event)"
                (selectionChanged)="logLater('selection-changed', $event)"
              >
                @if (gridPlaceholderSlot()) {
                  <ng-template #placeholder let-placeholder let-dragging="isDragging">
                    <div class="lab-placeholder" data-testid="lab-placeholder-content" [attr.data-dragging]="dragging">custom placeholder</div>
                  </ng-template>
                }
                @for (entry of renderedLayout(); track entry.i) {
                  @let inputs = isTarget(entry.i) ? targetInputs() : defaultItemInputs;
                  <kdl-grid-item
                    [ariaLabels]="inputs.ariaLabels"
                    [autoHeight]="inputs.autoHeight"
                    [autoScroll]="inputs.autoScroll"
                    [borderRadiusPx]="inputs.borderRadiusPx"
                    [dragActivationDistance]="inputs.dragActivationDistance"
                    [dragAllowFrom]="inputs.dragAllowFrom"
                    [dragIgnoreFrom]="inputs.dragIgnoreFrom"
                    [enableEditMode]="inputs.enableEditMode"
                    [h]="entry.h"
                    [i]="entry.i"
                    [isBounded]="inputs.isBounded"
                    [isDraggable]="inputs.isDraggable"
                    [isMirrored]="inputs.isMirrored"
                    [isResizable]="inputs.isResizable"
                    [isStatic]="inputs.isStatic"
                    [maxH]="inputs.maxH"
                    [maxW]="inputs.maxW"
                    [minH]="inputs.minH"
                    [minW]="inputs.minW"
                    [preserveAspectRatio]="inputs.preserveAspectRatio"
                    [resizeHandleColor]="inputs.resizeHandleColor"
                    [resizeHandles]="inputs.resizeHandles"
                    [resizeIgnoreFrom]="inputs.resizeIgnoreFrom"
                    [showCloseButton]="inputs.showCloseButton"
                    [showResizeHandles]="inputs.showResizeHandles"
                    [useBorderRadius]="inputs.useBorderRadius"
                    [w]="entry.w"
                    [x]="entry.x"
                    [y]="entry.y"
                    [zIndex]="inputs.zIndex"
                    (itemMoved)="onItemMoved($event)"
                    (itemResized)="onItemResized($event)"
                    (removeItem)="onItemClose($event)"
                  >
                    @if (isTarget(entry.i) && itemSlots().header) {
                      <strong class="lab-header" data-testid="lab-header-content" kdlGridItemHeader>header slot</strong>
                    }
                    @if (isTarget(entry.i) && itemSlots().resizeHandle) {
                      <ng-template #resizeHandle let-edge>
                        <span class="lab-custom-handle" data-testid="lab-custom-handle" [attr.data-edge]="edge">{{ edge }}</span>
                      </ng-template>
                    }
                    <div class="fixture-item-content lab-item" [attr.data-testid]="'lab-item-body-' + entry.i">
                      Item {{ entry.i }}<button class="lab-inner-button" type="button">btn</button>
                      @if (isTarget(entry.i)) {
                        @for (line of lines(); track line) {
                          <p class="lab-line">line {{ line }}</p>
                        }
                      }
                    </div>
                  </kdl-grid-item>
                }
              </kdl-grid-layout>
            }
          </div>

          @if (showGridB()) {
            <div class="lab-grid-wrap lab-grid-b" data-testid="lab-grid-b-wrap" [style.width.px]="stageWidth()">
              <kdl-grid-layout
                [allowCrossGridDrag]="gridB().allowCrossGridDrag"
                [colNum]="grid().colNum"
                [compactType]="compactTypeInput()"
                [disableExternalDrop]="gridB().disableExternalDrop"
                layoutId="lab-grid-b"
                [layout]="layoutB()"
                [margin]="marginInput()"
                [rowHeight]="grid().rowHeight"
                [transitionDurationMs]="0"
                (crossGridDropRejected)="logLaterB('cross-grid-drop-rejected', $event)"
                (crossGridItemDropped)="logLaterB('cross-grid-item-dropped', $event)"
                (dragEnd)="logLaterB('dragend', $event)"
                (dragStart)="logLaterB('dragstart', $event)"
                (itemDroppedFromOutside)="onDroppedFromOutsideB($event)"
                (layoutChange)="onLayoutChangeB($event)"
              >
                @for (entry of layoutB(); track entry.i) {
                  <kdl-grid-item [h]="entry.h" [i]="entry.i" [w]="entry.w" [x]="entry.x" [y]="entry.y">
                    <div class="fixture-item-content">B: {{ entry.i }}</div>
                  </kdl-grid-item>
                }
              </kdl-grid-layout>
            </div>
          }
        </section>
      </div>
    </div>
  `,
})
export class PropsLabComponent implements AfterViewChecked {
  private readonly presets = inject(GridLayoutPresetsService);
  private readonly storage = inject(GridLayoutStorageService);
  private readonly zone = inject(NgZone);

  // Template-facing constants.
  readonly gridBooleanProps = GRID_BOOLEAN_PROPS;
  readonly gridNumberProps = GRID_NUMBER_PROPS;
  readonly compactTypes = COMPACT_TYPES;
  readonly ariaKeys = ARIA_KEYS;
  readonly alignEdges = ALIGN_EDGES;
  readonly resizeHandleEdges = RESIZE_HANDLE_EDGES;
  readonly itemTriKeys = ITEM_TRI_KEYS;
  readonly itemBooleanKeys = ITEM_BOOLEAN_KEYS;
  readonly itemNumberKeys = ITEM_NUMBER_KEYS;
  readonly itemTextKeys = ITEM_TEXT_KEYS;
  readonly activationKeys = ACTIVATION_KEYS;
  readonly defaultItemInputs = DEFAULT_ITEM_INPUTS;
  readonly alignLayout = alignLayout;
  readonly str = (value: unknown): string => String(value);

  @ViewChild(`mainGrid`) mainGrid?: GridLayoutComponent;
  @ViewChild(`wrap`) private readonly wrap?: ElementRef<HTMLElement>;

  // ---------------------------------------------------------------- state

  readonly layout = signal<TLayout>(initialLayout());
  readonly layoutB = signal<TLayout>([]);
  readonly useLibraryDefaults = signal(false);
  readonly showGridB = signal(false);
  readonly stageScale = signal(1);
  readonly stageWidth = signal(1200);
  readonly grid = signal<IGridState>(defaultGridState());
  readonly gridB = signal({ allowCrossGridDrag: false, disableExternalDrop: false });
  readonly gridAria = signal<Record<TAriaKey, string>>({ closeButton: ``, itemRoleDescription: ``, moveInstruction: ``, resizeInstruction: `` });
  readonly gridPlaceholderSlot = signal(false);

  readonly entries = signal<ILogEntry[]>([]);
  private sequence = 0;
  readonly lastBreakpoint = signal(``);
  readonly lastColumns = signal(``);
  readonly isDragging = signal(false);

  readonly itemTarget = signal(`0`);
  readonly itemTri = signal<Record<TItemTriKey, TTri>>({
    enableEditMode: `inherit`, isBounded: `inherit`, isDraggable: `inherit`, isMirrored: `inherit`, isResizable: `inherit`,
    showCloseButton: `inherit`, showResizeHandles: `inherit`, useBorderRadius: `inherit`,
  });
  readonly itemBool = signal<Record<TItemBooleanKey, boolean>>({ autoHeight: false, autoScroll: false, isStatic: false, preserveAspectRatio: false });
  readonly itemSlots = signal({ header: false, resizeHandle: false });
  readonly lineCount = signal(1);
  readonly itemNum = signal<Record<TItemNumberKey, string>>({ borderRadiusPx: ``, maxH: ``, maxW: ``, minH: ``, minW: ``, zIndex: `` });
  readonly itemText = signal<Record<TItemTextKey, string>>({ dragAllowFrom: ``, dragIgnoreFrom: ``, resizeHandleColor: ``, resizeIgnoreFrom: `` });
  readonly activation = signal<{ mode: TActivationMode } & Record<TActivationKey, string>>({ mode: `default`, mouse: ``, pen: ``, touch: ``, value: `` });
  readonly itemInheritHandles = signal(true);
  readonly itemResizeHandles = signal<TResizeHandle[]>([...RESIZE_HANDLE_EDGES]);
  readonly itemAria = signal<Record<TAriaKey, string>>({ closeButton: ``, itemRoleDescription: ``, moveInstruction: ``, resizeInstruction: `` });
  readonly layoutPatch = signal(`{}`);
  readonly methodId = signal(`0`);

  readonly presetNames = signal<string[]>(this.presets.listPresets(PRESET_KEY));
  readonly presetLoaded = signal<boolean | null>(null);
  readonly storageHas = signal(this.storage.hasSaved(STORAGE_KEY));
  readonly storageLoaded = signal<boolean | null>(null);
  readonly svgOutput = signal(``);

  readonly handleState = signal({ canRedo: false, canUndo: false, selected: `` });
  readonly measuredWidth = signal(``);

  private dropCounter = 0;
  private addCounter = 0;

  // ---------------------------------------------------------------- derived (computed, so every bound reference is stable between changes)

  private readonly parsedBreakpoints = computed(() => parseJson<IBreakpoints>(this.grid().breakpointsJson));
  private readonly parsedCols = computed(() => parseJson<IColumns>(this.grid().colsJson));
  private readonly parsedResponsiveLayouts = computed(() => parseJson<Record<string, TLayout>>(this.grid().responsiveLayoutsJson));
  readonly jsonError = computed(() => {
    const failed: string[] = [];
    if(this.parsedBreakpoints().failed) {
      failed.push(`breakpoints`);
    }
    if(this.parsedCols().failed) {
      failed.push(`cols`);
    }
    if(this.parsedResponsiveLayouts().failed) {
      failed.push(`responsiveLayouts`);
    }
    return failed.length === 0 ? `` : `invalid JSON: ${failed.join(`, `)}`;
  });

  readonly breakpointsInput = computed(() => this.parsedBreakpoints().value ?? DEFAULT_BREAKPOINTS);
  readonly colsInput = computed(() => this.parsedCols().value ?? DEFAULT_COLS);
  readonly responsiveLayoutsInput = computed(() => this.parsedResponsiveLayouts().value ?? NO_RESPONSIVE_LAYOUTS);
  readonly marginInput = computed((): [number, number] => [this.grid().marginX, this.grid().marginY]);
  readonly maxRowsInput = computed(() => (this.grid().maxRows.trim() === `` ? Infinity : Number(this.grid().maxRows)));
  readonly layoutIdInput = computed(() => (this.grid().layoutId === `` ? null : this.grid().layoutId));
  readonly compactTypeInput = computed(() => this.grid().compactType as ECompactType);
  readonly compactorInput = computed((): ICompactor | null => (this.grid().compactorMode === `downward` ? downwardCompactor : null));
  readonly heightModeInput = computed((): 'auto' | 'fixed' | 'scroll' | 'fit' | null => {
    const mode = this.grid().heightMode;
    return mode === `` ? null : mode;
  });
  readonly outsideDropAcceptInput = computed(() => (this.grid().acceptOnlyLabWidgets ? acceptLabWidgetsOnly : null));
  readonly gridAriaLabels = computed((): IGridAriaLabels => {
    const labels: IGridAriaLabels = {};
    ARIA_KEYS.forEach(key => {
      if(this.gridAria()[key] !== ``) {
        labels[key] = this.gridAria()[key];
      }
    });
    return labels;
  });

  /** What the target item's inputs are bound to: every control that is in use, everything else at the component's own default. */
  readonly targetInputs = computed((): IItemInputs => {
    const tri = this.itemTri();
    const bool = this.itemBool();
    const num = this.itemNum();
    const text = this.itemText();
    const activation = this.activation();
    const ariaLabels: IGridAriaLabels = {};
    ARIA_KEYS.forEach(key => {
      if(this.itemAria()[key] !== ``) {
        ariaLabels[key] = this.itemAria()[key];
      }
    });
    let dragActivationDistance: TDragActivationDistance | null = null;
    if(activation.mode === `number`) {
      dragActivationDistance = Number(activation.value || 0);
    } else if(activation.mode === `object`) {
      dragActivationDistance = {
        mouse: numberOrUndefined(activation.mouse),
        pen: numberOrUndefined(activation.pen),
        touch: numberOrUndefined(activation.touch),
      } as TDragActivationDistance;
    }
    return {
      ariaLabels,
      autoHeight: bool.autoHeight,
      autoScroll: bool.autoScroll,
      borderRadiusPx: numberOrUndefined(num.borderRadiusPx) ?? null,
      dragActivationDistance,
      dragAllowFrom: textOrUndefined(text.dragAllowFrom) ?? null,
      dragIgnoreFrom: textOrUndefined(text.dragIgnoreFrom) ?? DEFAULT_DRAG_IGNORE_FROM,
      enableEditMode: triValue(tri.enableEditMode) ?? null,
      isBounded: triValue(tri.isBounded) ?? null,
      isDraggable: triValue(tri.isDraggable) ?? null,
      isMirrored: triValue(tri.isMirrored) ?? null,
      isResizable: triValue(tri.isResizable) ?? null,
      isStatic: bool.isStatic,
      maxH: numberOrUndefined(num.maxH) ?? Infinity,
      maxW: numberOrUndefined(num.maxW) ?? Infinity,
      minH: numberOrUndefined(num.minH) ?? 1,
      minW: numberOrUndefined(num.minW) ?? 1,
      preserveAspectRatio: bool.preserveAspectRatio,
      resizeHandleColor: textOrUndefined(text.resizeHandleColor) ?? null,
      resizeHandles: this.itemInheritHandles() ? null : this.itemResizeHandles(),
      resizeIgnoreFrom: textOrUndefined(text.resizeIgnoreFrom) ?? null,
      showCloseButton: triValue(tri.showCloseButton) ?? null,
      showResizeHandles: triValue(tri.showResizeHandles) ?? null,
      useBorderRadius: triValue(tri.useBorderRadius) ?? null,
      zIndex: numberOrUndefined(num.zIndex) ?? null,
    };
  });

  /** The entry fields the layout engine reads that the item controls currently manage — only those that are NOT at their default. */
  private readonly entryOverrides = computed((): Record<string, unknown> => {
    if(this.useLibraryDefaults()) {
      return {};
    }
    const inputs = this.targetInputs();
    const overrides: Record<string, unknown> = {};
    if(inputs.isStatic) {
      overrides[`isStatic`] = true;
    }
    if(inputs.isDraggable !== null) {
      overrides[`isDraggable`] = inputs.isDraggable;
    }
    if(inputs.isResizable !== null) {
      overrides[`isResizable`] = inputs.isResizable;
    }
    const num = this.itemNum();
    (['minW', 'maxW', 'minH', 'maxH'] as const).forEach(key => {
      const value = numberOrUndefined(num[key]);
      if(value !== undefined) {
        overrides[key] = value;
      }
    });
    return overrides;
  });

  /** What the grid is given: the base layout with the target's entry overrides merged in. */
  readonly renderedLayout = computed((): TLayout => {
    const overrides = this.entryOverrides();
    if(Object.keys(overrides).length === 0) {
      return this.layout();
    }
    return this.layout().map(entry => (String(entry.i) === this.itemTarget() ? { ...entry, ...overrides } : entry));
  });

  readonly lines = computed(() => Array.from({ length: this.lineCount() }, (_, index) => index + 1));
  readonly layoutJson = computed(() => JSON.stringify(compactLayout(this.layout())));
  readonly layoutBJson = computed(() => JSON.stringify(compactLayout(this.layoutB())));

  // ---------------------------------------------------------------- lifecycle

  /**
   * The grid's `canUndo`/`canRedo`/selection and its measured width are plain fields on the component, changed by its own
   * code (some of it during this very change-detection pass), so they are copied into signals a microtask later and only when
   * something differs.
   *
   * The microtask is scheduled OUTSIDE the Angular zone, and the signals are written back inside it only on a real change.
   * Inside the zone, a finished microtask is itself the trigger for another change-detection pass, which would schedule
   * another microtask here, and so on forever whether or not anything had changed: the page never returns to the event loop.
   */
  ngAfterViewChecked(): void {
    this.zone.runOutsideAngular(() => {
      void Promise.resolve().then(() => this.syncReadouts());
    });
  }

  private syncReadouts(): void {
    const mainGrid = this.mainGrid;
    const next = {
      canRedo: !!mainGrid?.canRedo,
      canUndo: !!mainGrid?.canUndo,
      selected: mainGrid ? Array.from(mainGrid.selectedItemIds).join(`,`) : ``,
    };
    const current = this.handleState();
    if(current.canRedo !== next.canRedo || current.canUndo !== next.canUndo || current.selected !== next.selected) {
      this.zone.run(() => this.handleState.set(next));
    }
    const root = this.wrap?.nativeElement.querySelector(`.kdl-grid-layout`);
    const width = root ? String(Math.round(root.getBoundingClientRect().width / (this.stageScale() || 1))) : ``;
    if(width !== this.measuredWidth()) {
      this.zone.run(() => this.measuredWidth.set(width));
    }
  }

  // ---------------------------------------------------------------- event log

  /** Runs `write` in a microtask — see this file's header for why output handlers do not write state synchronously. */
  later(write: () => void): void {
    void Promise.resolve().then(write);
  }

  private record(name: string, args: unknown[]): void {
    this.sequence += 1;
    const entry = { id: this.sequence, name, payload: JSON.stringify(args.map(summarize)) };
    this.entries.update(current => [...current.slice(-1999), entry]);
  }

  log(name: string, ...args: unknown[]): void {
    this.record(name, args);
  }

  logB(name: string, ...args: unknown[]): void {
    this.record(`b:${name}`, args);
  }

  /** `log` a microtask later, for an output binding (a template cannot contain an arrow function). */
  logLater(name: string, payload: unknown): void {
    this.later(() => this.log(name, payload));
  }

  /** `logB` a microtask later, for an output binding on grid B. */
  logLaterB(name: string, payload: unknown): void {
    this.later(() => this.logB(name, payload));
  }

  // ---------------------------------------------------------------- input helpers (typed so the template stays strict)

  isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  textOf(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  numberOf(event: Event): number {
    return Number(this.textOf(event));
  }

  isTarget(id: string | number): boolean {
    return String(id) === this.itemTarget();
  }

  // ---------------------------------------------------------------- grid / item state setters

  setGrid<K extends keyof IGridState>(key: K, value: IGridState[K]): void {
    this.grid.update(current => ({ ...current, [key]: value }));
  }

  setHeightMode(event: Event): void {
    this.setGrid(`heightMode`, this.textOf(event) as IGridState[`heightMode`]);
  }

  setCompactorMode(event: Event): void {
    this.setGrid(`compactorMode`, this.textOf(event) as IGridState[`compactorMode`]);
  }

  setGridB(key: `allowCrossGridDrag` | `disableExternalDrop`, value: boolean): void {
    this.gridB.update(current => ({ ...current, [key]: value }));
  }

  setGridAria(key: TAriaKey, value: string): void {
    this.gridAria.update(current => ({ ...current, [key]: value }));
  }

  setItemTri(key: TItemTriKey, event: Event): void {
    this.itemTri.update(current => ({ ...current, [key]: this.textOf(event) as TTri }));
  }

  setItemBool(key: TItemBooleanKey, value: boolean): void {
    this.itemBool.update(current => ({ ...current, [key]: value }));
  }

  setItemSlot(key: `header` | `resizeHandle`, value: boolean): void {
    this.itemSlots.update(current => ({ ...current, [key]: value }));
  }

  setItemNum(key: TItemNumberKey, value: string): void {
    this.itemNum.update(current => ({ ...current, [key]: value }));
  }

  setItemText(key: TItemTextKey, value: string): void {
    this.itemText.update(current => ({ ...current, [key]: value }));
  }

  setActivationMode(event: Event): void {
    this.activation.update(current => ({ ...current, mode: this.textOf(event) as TActivationMode }));
  }

  setActivation(key: TActivationKey, value: string): void {
    this.activation.update(current => ({ ...current, [key]: value }));
  }

  setItemResizeHandle(edge: TResizeHandle, on: boolean): void {
    this.itemResizeHandles.update(current => RESIZE_HANDLE_EDGES.filter(candidate => (candidate === edge ? on : current.includes(candidate))));
  }

  setItemAria(key: TAriaKey, value: string): void {
    this.itemAria.update(current => ({ ...current, [key]: value }));
  }

  // ---------------------------------------------------------------- layout events

  /** The layout the grid hands back is the one it was given plus its own changes — strip the target's entry overrides again so they never bake into the base. */
  handleLayoutChange(next: TLayout): void {
    this.later(() => {
      this.log(`layout-change`, next);
      const overrideKeys = Object.keys(this.entryOverrides());
      const target = this.itemTarget();
      this.layout.update(previous => next.map(entry => {
        if(String(entry.i) !== target || overrideKeys.length === 0) {
          return entry;
        }
        const base = previous.find(candidate => candidate.i === entry.i) as Record<string, unknown> | undefined;
        const clean = { ...entry } as Record<string, unknown>;
        overrideKeys.forEach(key => {
          if(base && key in base) {
            clean[key] = base[key];
          } else {
            delete clean[key];
          }
        });
        return clean as unknown as TLayout[number];
      }));
    });
  }

  onLayoutChangeB(next: TLayout): void {
    this.later(() => {
      this.logB(`layout-change`, next);
      this.layoutB.set(next);
    });
  }

  onBreakpointChanged(breakpoint: string): void {
    this.later(() => {
      this.lastBreakpoint.set(breakpoint);
      this.log(`breakpoint-changed`, breakpoint);
    });
  }

  onColumnsChanged(columns: number): void {
    this.later(() => {
      this.lastColumns.set(String(columns));
      this.log(`columns-changed`, columns);
    });
  }

  onDragStart(id: string | number): void {
    this.later(() => {
      this.isDragging.set(true);
      this.log(`dragstart`, id);
    });
  }

  onDragEnd(id: string | number): void {
    this.later(() => {
      this.isDragging.set(false);
      this.log(`dragend`, id);
    });
  }

  onItemMoved(payload: { i: string | number; x: number; y: number }): void {
    this.later(() => this.log(`item-moved`, payload.i, payload.x, payload.y));
  }

  onItemResized(payload: { i: string | number; h: number; w: number; height: number; width: number }): void {
    this.later(() => this.log(`item-resized`, payload.i, payload.h, payload.w, payload.height, payload.width));
  }

  onItemClose(id: string | number): void {
    this.later(() => {
      this.log(`remove-grid-item`, id);
      this.layout.update(current => current.filter(entry => entry.i !== id));
    });
  }

  // ---------------------------------------------------------------- outside drop

  onWidgetDragStart(event: DragEvent): void {
    event.dataTransfer?.setData(LAB_MIME, JSON.stringify({ label: `widget` }));
    if(event.dataTransfer) {
      event.dataTransfer.effectAllowed = `copy`;
    }
  }

  onIncompatibleDragStart(event: DragEvent): void {
    event.dataTransfer?.setData(`text/plain`, `incompatible`);
  }

  onDroppedFromOutside(payload: IOutsideDropPayload): void {
    this.later(() => {
      this.log(`item-dropped-from-outside`, payload);
      this.dropCounter += 1;
      const id = `drop-${this.dropCounter}`;
      this.layout.update(current => [...current, { h: payload.h, i: id, w: payload.w, x: payload.x, y: payload.y }]);
    });
  }

  onDroppedFromOutsideB(payload: IOutsideDropPayload): void {
    this.later(() => {
      this.logB(`item-dropped-from-outside`, payload);
      this.dropCounter += 1;
      const id = `drop-${this.dropCounter}`;
      this.layoutB.update(current => [...current, { h: payload.h, i: id, w: payload.w, x: payload.x, y: payload.y }]);
    });
  }

  // ---------------------------------------------------------------- methods / persistence

  addItem(): void {
    this.addCounter += 1;
    const id = `added-${this.addCounter}`;
    this.layout.update(current => {
      const bottom = current.reduce((max, entry) => Math.max(max, entry.y + entry.h), 0);
      return [...current, { h: 2, i: id, w: 3, x: 0, y: bottom }];
    });
  }

  removeLastItem(): void {
    this.layout.update(current => current.slice(0, -1));
  }

  resetLayout(): void {
    this.layout.set(initialLayout());
    this.layoutB.set([]);
    this.lineCount.set(1);
  }

  /** Merges the patch into the *base layout entry* of the target — permanent, unlike the managed `item-*` controls, which only override. */
  applyLayoutPatch(): void {
    let patch: Record<string, unknown>;
    try {
      patch = JSON.parse(this.layoutPatch()) as Record<string, unknown>;
    } catch {
      return;
    }
    const target = this.itemTarget();
    this.layout.update(current => current.map(entry => (String(entry.i) === target ? { ...entry, ...patch } : entry)));
  }

  savePreset(): void {
    this.presets.savePreset(PRESET_KEY, `lab`, this.layout());
    this.presetNames.set(this.presets.listPresets(PRESET_KEY));
  }

  loadPreset(name: string): void {
    const loaded = this.presets.loadPreset(PRESET_KEY, name);
    this.presetLoaded.set(loaded !== null);
    if(loaded) {
      this.layout.set(loaded);
    }
  }

  deletePreset(): void {
    this.presets.deletePreset(PRESET_KEY, `lab`);
    this.presetNames.set(this.presets.listPresets(PRESET_KEY));
  }

  saveStorage(): void {
    this.storage.save(STORAGE_KEY, this.layout());
    this.storageHas.set(this.storage.hasSaved(STORAGE_KEY));
  }

  loadStorage(): void {
    const loaded = this.storage.load(STORAGE_KEY);
    this.storageLoaded.set(loaded !== null);
    if(loaded) {
      this.layout.set(loaded);
    }
  }

  clearStorage(): void {
    this.storage.clear(STORAGE_KEY);
    this.storageHas.set(this.storage.hasSaved(STORAGE_KEY));
  }
}

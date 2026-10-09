import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SimpleChanges } from '@angular/core';
import { ECompactType } from 'keystone-dashboard-layout-core';
import type { ICompactor, TLayout } from 'keystone-dashboard-layout-core';
import { GridEventBusService } from './grid-event-bus.service';
import { GridLayoutComponent } from './grid-layout.component';

/**
 * Targets mutants that survived the Stryker run against
 * `grid-layout.component.ts` (see `reports/mutation/mutation.json`).
 * Kept separate from `grid-layout.component.spec.ts` on purpose: that
 * file is organised by feature phase, this one by *which behaviour a
 * surviving mutant proved was never pinned down*. Every test below
 * fails against at least one specific surviving mutant.
 */
describe(`GridLayoutComponent — mutation-testing gap coverage`, () => {
  let fixture: ComponentFixture<GridLayoutComponent>;
  let component: GridLayoutComponent;

  const layout: TLayout = [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 3, i: `1`, w: 2, x: 2, y: 0 },
  ];

  const fourInARow: TLayout = [
    { h: 2, i: `a`, w: 2, x: 0, y: 0 },
    { h: 2, i: `b`, w: 2, x: 2, y: 0 },
    { h: 2, i: `c`, w: 2, x: 4, y: 0 },
    { h: 2, i: `d`, w: 2, x: 6, y: 0 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GridLayoutComponent] }).compileComponents();
    fixture = TestBed.createComponent(GridLayoutComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  /** Same helper as `grid-layout.component.spec.ts` — see that file's own comment for why `ngOnChanges` is driven by hand. */
  const setInputs = (inputs: Partial<GridLayoutComponent>): void => {
    Object.assign(component, inputs);
    component.ngOnChanges({ layout: {} } as unknown as SimpleChanges);
    fixture.detectChanges();
  };

  const getEventBus = (): GridEventBusService => fixture.debugElement.injector.get(GridEventBusService);

  const changeLayoutExternally = (next: TLayout): void => {
    component.layout = next;
    component.ngOnChanges({ layout: { firstChange: false } } as unknown as SimpleChanges);
  };

  const workingLayoutOf = (): TLayout => (component as unknown as { workingLayout: TLayout }).workingLayout;

  const click = (id: string, shiftKey = false): void => {
    getEventBus().emitItemClicked({ ctrlKey: false, i: id, metaKey: false, shiftKey });
  };

  const drag = (eventType: `dragstart` | `dragmove` | `dragend`, id: string, x: number, y: number): void => {
    getEventBus().emitItemDrag({ clientX: 0, clientY: 0, eventType, h: 2, i: id, w: 2, x, y });
  };

  describe(`ngOnChanges routes each input only to its own handlers`, () => {
    type TSpyName =
      | `resolveResponsiveColNum`
      | `setColNum`
      | `setCrossGridDragEnabled`
      | `setGridDefaults`
      | `setMargin`
      | `setOutsideDropEnabled`
      | `setRowHeight`
      | `setTransformScale`
      | `setUseCssTransforms`
      | `updateContainerHeight`;

    const gridDefaultKeys = [
      `isDraggable`, `isResizable`, `isBounded`, `isMirrored`, `maxRows`,
      `useBorderRadius`, `borderRadiusPx`, `showCloseButton`, `ariaLabels`, `enableEditMode`,
    ];
    const containerHeightKeys = [
      `autoSize`, `heightMode`, `transitionDurationMs`, `transitionTimingFunction`, `showResizeHandles`, `resizeHandleColor`,
    ];

    const cases: [string, boolean, TSpyName[]][] = [
      [`layout`, true, [`updateContainerHeight`]],
      [`colNum`, true, [`setColNum`]],
      [`rowHeight`, false, [`setRowHeight`, `updateContainerHeight`]],
      [`margin`, false, [`setMargin`, `updateContainerHeight`]],
      [`useCssTransforms`, false, [`setUseCssTransforms`]],
      [`transformScale`, false, [`setTransformScale`]],
      ...gridDefaultKeys.map((key): [string, boolean, TSpyName[]] => [key, false, [`setGridDefaults`]]),
      ...containerHeightKeys.map((key): [string, boolean, TSpyName[]] => [key, false, [`updateContainerHeight`]]),
      [`breakpoints`, false, [`resolveResponsiveColNum`]],
      [`cols`, false, [`resolveResponsiveColNum`]],
      [`responsive`, false, [`resolveResponsiveColNum`]],
      [`responsive`, true, []],
      [`allowCrossGridDrag`, false, [`setCrossGridDragEnabled`]],
      [`allowCrossGridDrag`, true, []],
      [`allowOutsideDrop`, false, [`setOutsideDropEnabled`]],
      [`allowOutsideDrop`, true, []],
    ];

    it.each(cases)(`Should route a "%s" change (firstChange: %s) only to its own handlers`, (key, firstChange, expected) => {
      setInputs({ colNum: 12, layout });
      const bus = getEventBus();
      const internals = component as unknown as Record<string, () => void>;
      const spies: Record<TSpyName, jest.SpyInstance> = {
        resolveResponsiveColNum: jest.spyOn(internals, `resolveResponsiveColNum`),
        setColNum: jest.spyOn(bus, `setColNum`),
        setCrossGridDragEnabled: jest.spyOn(internals, `setCrossGridDragEnabled`),
        setGridDefaults: jest.spyOn(bus, `setGridDefaults`),
        setMargin: jest.spyOn(bus, `setMargin`),
        setOutsideDropEnabled: jest.spyOn(internals, `setOutsideDropEnabled`),
        setRowHeight: jest.spyOn(bus, `setRowHeight`),
        setTransformScale: jest.spyOn(bus, `setTransformScale`),
        setUseCssTransforms: jest.spyOn(bus, `setUseCssTransforms`),
        updateContainerHeight: jest.spyOn(internals, `updateContainerHeight`),
      };

      component.ngOnChanges({ [key]: { firstChange } } as unknown as SimpleChanges);

      (Object.keys(spies) as TSpyName[]).forEach(name => {
        expect([name, spies[name].mock.calls.length]).toEqual([name, expected.includes(name) ? 1 : 0]);
      });
    });

    it(`Should not emit columnsChanged for a colNum change flagged firstChange, but should for a later one`, () => {
      setInputs({ colNum: 12, layout });
      const emitted: number[] = [];
      component.columnsChanged.subscribe((value: number) => emitted.push(value));

      component.ngOnChanges({ colNum: { firstChange: true } } as unknown as SimpleChanges);
      expect(emitted).toEqual([]);

      component.colNum = 8;
      component.ngOnChanges({ colNum: { firstChange: false } } as unknown as SimpleChanges);
      expect(emitted).toEqual([8]);
    });

    it(`Should not re-sync workingLayout from the layout input when an unrelated input changes`, () => {
      setInputs({ colNum: 12, layout });
      drag(`dragmove`, `0`, 6, 0);
      expect(workingLayoutOf().find(item => item.i === `0`)?.x).toBe(6);

      component.ngOnChanges({ rowHeight: { firstChange: false } } as unknown as SimpleChanges);

      expect(workingLayoutOf().find(item => item.i === `0`)?.x).toBe(6);
    });
  });

  describe(`external layout changes`, () => {
    it(`Should record an undo point when the layout input's length changes and enableUndoRedo is on`, () => {
      setInputs({ colNum: 12, enableUndoRedo: true, layout });

      changeLayoutExternally([...layout, { h: 2, i: `2`, w: 2, x: 6, y: 0 }]);

      expect(component.canUndo).toBe(true);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      component.undo();
      expect(emitted.at(-1)?.length).toBe(2);
    });

    it(`Should not record an undo point for a length change when enableUndoRedo is off`, () => {
      setInputs({ colNum: 12, enableUndoRedo: false, layout });

      changeLayoutExternally([...layout, { h: 2, i: `2`, w: 2, x: 6, y: 0 }]);

      expect(component.canUndo).toBe(false);
    });

    it(`Should not record an undo point when the layout input changes but its length does not`, () => {
      setInputs({ colNum: 12, enableUndoRedo: true, layout });

      changeLayoutExternally(layout.map(item => ({ ...item, x: item.x + 1 })));

      expect(component.canUndo).toBe(false);
    });

    it(`Should emit layoutChange when auto-compaction of an external layout change actually moves something`, () => {
      const movingCompactor: ICompactor = { compact: (current: TLayout) => current.map(item => ({ ...item, y: 9 })), type: `moving` };
      setInputs({ colNum: 12, compactor: movingCompactor, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      // Positions differ from the rendered layout, so this is a genuinely new layout and gets compacted. (A copy with
      // identical positions is an echo of what is already shown and is deliberately left alone: see the echo tests below.)
      changeLayoutExternally(layout.map(item => ({ ...item, x: item.x + 1 })));

      expect(emitted.length).toBe(1);
      expect(emitted[0].every(item => item.y === 9)).toBe(true);
    });

    it(`Should not compact a layout that only echoes the one already rendered`, () => {
      const movingCompactor: ICompactor = { compact: (current: TLayout) => current.map(item => ({ ...item, y: 9 })), type: `moving` };
      setInputs({ colNum: 12, compactor: movingCompactor, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      changeLayoutExternally([...layout]);

      expect(emitted.length).toBe(0);
      expect(workingLayoutOf().every(item => item.y === 0)).toBe(true);
    });

    it(`Should still compact when only the size of an item differs from the rendered layout`, () => {
      const movingCompactor: ICompactor = { compact: (current: TLayout) => current.map(item => ({ ...item, y: 9 })), type: `moving` };
      setInputs({ colNum: 12, compactor: movingCompactor, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      changeLayoutExternally(layout.map(item => ({ ...item, w: item.w + 1 })));

      expect(emitted.length).toBe(1);
    });

    it(`Should still compact when the same items arrive in a different order`, () => {
      const movingCompactor: ICompactor = { compact: (current: TLayout) => current.map(item => ({ ...item, y: 9 })), type: `moving` };
      setInputs({ colNum: 12, compactor: movingCompactor, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      changeLayoutExternally([...layout].reverse());

      expect(emitted.length).toBe(1);
    });

    it(`Should not undo restoreOnDrag when the layout it produced is applied straight back to the layout input`, () => {
      const stacked: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }, { h: 2, i: `b`, w: 2, x: 0, y: 2 }];
      setInputs({ colNum: 12, layout: stacked, restoreOnDrag: true });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      // Drag "a" away: with restoreOnDrag, "b" keeps the row it had before the drag instead of rising into the gap.
      drag(`dragstart`, `a`, 0, 0);
      drag(`dragmove`, `a`, 6, 0);
      drag(`dragend`, `a`, 6, 0);
      expect(workingLayoutOf().find(item => item.i === `b`)?.y).toBe(2);
      const emittedBeforeEcho = emitted.length;

      // What a consumer binding `(layoutChange)="layout = $event"` does with the layout it has just been given.
      changeLayoutExternally(emitted.at(-1)!);

      expect(workingLayoutOf().find(item => item.i === `b`)?.y).toBe(2);
      expect(emitted.length).toBe(emittedBeforeEcho);
    });

    describe(`responsiveLayouts supplied after mount`, () => {
      const supplied: Record<string, TLayout> = { md: [{ h: 3, i: `0`, w: 3, x: 0, y: 0 }] };

      const changeResponsiveLayouts = (next: Record<string, TLayout>): void => {
        component.responsiveLayouts = next;
        component.ngOnChanges({ responsiveLayouts: { firstChange: false } } as unknown as SimpleChanges);
      };

      it(`Should replace the per-breakpoint cache when the input's content changes`, () => {
        setInputs({ colNum: 12, layout, responsive: true });
        expect(component.layouts).toEqual({});

        changeResponsiveLayouts(supplied);

        expect(component.layouts[`md`]).toEqual(supplied[`md`]);
      });

      it(`Should hold a copy of what was supplied, not the consumer's own arrays`, () => {
        setInputs({ colNum: 12, layout, responsive: true });

        changeResponsiveLayouts(supplied);

        expect(component.layouts[`md`]).not.toBe(supplied[`md`]);
      });

      it(`Should keep per-breakpoint edits when a new object with identical content arrives`, () => {
        setInputs({ colNum: 12, layout, responsive: true, responsiveLayouts: supplied });
        const edited: TLayout = [{ h: 5, i: `0`, w: 5, x: 0, y: 0 }];
        component.layouts[`md`] = edited;

        // A fresh reference with the same content, as a template that builds the object inline hands over on every pass.
        changeResponsiveLayouts(JSON.parse(JSON.stringify(supplied)) as Record<string, TLayout>);

        expect(component.layouts[`md`]).toBe(edited);
      });

      it(`Should re-seed when the content differs from what was last seeded, even though the new object is the same size`, () => {
        setInputs({ colNum: 12, layout, responsive: true, responsiveLayouts: supplied });
        const replacement: Record<string, TLayout> = { md: [{ h: 4, i: `0`, w: 4, x: 0, y: 0 }] };

        changeResponsiveLayouts(replacement);

        expect(component.layouts[`md`]).toEqual(replacement[`md`]);
      });

      it(`Should leave the cache alone on the input's first change, which ngOnInit already seeded`, () => {
        setInputs({ colNum: 12, layout, responsive: true, responsiveLayouts: supplied });
        const edited: TLayout = [{ h: 5, i: `0`, w: 5, x: 0, y: 0 }];
        component.layouts[`md`] = edited;

        component.responsiveLayouts = { md: [{ h: 9, i: `0`, w: 9, x: 0, y: 0 }] };
        component.ngOnChanges({ responsiveLayouts: { firstChange: true } } as unknown as SimpleChanges);

        expect(component.layouts[`md`]).toBe(edited);
      });
    });

    it(`Should not emit layoutChange when auto-compaction of an external layout change leaves everything where it was`, () => {
      const identityCompactor: ICompactor = { compact: (current: TLayout) => current.map(item => ({ ...item })), type: `identity` };
      setInputs({ colNum: 12, compactor: identityCompactor, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      changeLayoutExternally([...layout]);

      expect(emitted.length).toBe(0);
    });
  });

  describe(`undo/redo bookkeeping`, () => {
    it(`Should not capture a pre-gesture snapshot while enableUndoRedo is off, even if it's switched on before the gesture ends`, () => {
      setInputs({ colNum: 12, enableUndoRedo: false, layout });

      drag(`dragstart`, `0`, 0, 0);
      component.enableUndoRedo = true;
      drag(`dragend`, `0`, 6, 0);

      expect(component.canUndo).toBe(false);
    });

    it(`Should not record an undo point for a dragend that had no preceding dragstart`, () => {
      setInputs({ colNum: 12, enableUndoRedo: true, layout });

      drag(`dragend`, `0`, 6, 0);

      expect(component.canUndo).toBe(false);
    });

    it(`Should not record an undo point when compactNow() leaves the layout exactly as it was`, () => {
      const identityCompactor: ICompactor = { compact: (current: TLayout) => current, type: `identity` };
      setInputs({ colNum: 12, compactor: identityCompactor, enableUndoRedo: true, layout });

      component.compactNow();

      expect(component.canUndo).toBe(false);
    });

    it(`Should clear canRedo again once a new change is committed after an undo`, () => {
      setInputs({ colNum: 12, enableUndoRedo: true, layout });
      drag(`dragstart`, `0`, 0, 0);
      drag(`dragend`, `0`, 6, 0);
      component.undo();
      expect(component.canRedo).toBe(true);

      drag(`dragstart`, `0`, 0, 0);
      drag(`dragend`, `0`, 4, 0);

      expect(component.canRedo).toBe(false);
    });

    it(`Should report canUndo true after a redo(), and false again after the matching undo()`, () => {
      setInputs({ colNum: 12, enableUndoRedo: true, layout });
      drag(`dragstart`, `0`, 0, 0);
      drag(`dragend`, `0`, 6, 0);

      component.undo();
      expect(component.canUndo).toBe(false);

      component.redo();
      expect(component.canUndo).toBe(true);
      expect(component.canRedo).toBe(false);
    });
  });

  describe(`multiSelect range anchor survives or resets with the layout`, () => {
    it(`Should reset the Shift-click anchor once the anchor's own item is removed from the layout`, () => {
      setInputs({ colNum: 12, layout: fourInARow, multiSelect: true });
      click(`a`);
      changeLayoutExternally(fourInARow.filter(item => item.i !== `a`));

      // With the stale anchor "a" gone, the first Shift-click is a plain
      // select (anchor becomes "c"), so the second Shift-click extends
      // from "c" to "d". A stale anchor would instead select only "d".
      click(`c`, true);
      click(`d`, true);

      expect([...component.selectedItemIds].sort()).toEqual([`c`, `d`]);
    });

    it(`Should keep the Shift-click anchor when a different item is removed from the layout`, () => {
      setInputs({ colNum: 12, layout: fourInARow, multiSelect: true });
      click(`a`);
      changeLayoutExternally(fourInARow.filter(item => item.i !== `d`));

      click(`c`, true);

      expect([...component.selectedItemIds].sort()).toEqual([`a`, `b`, `c`]);
    });
  });

  describe(`resize and drag collision signalling`, () => {
    const sideBySide: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 3, y: 0 },
    ];

    it(`Should clamp only the width, leaving the height alone, when a resize collides with a neighbour at the same y`, () => {
      setInputs({ colNum: 12, layout: sideBySide, preventCollision: true });
      const emitted: TLayout[] = [];
      const blocked: (string | number)[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      component.moveBlockedByCollision.subscribe((id: string | number) => blocked.push(id));

      getEventBus().emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      getEventBus().emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 4, x: 0, y: 0 });

      const itemA = emitted.at(-1)?.find(item => item.i === `a`);
      expect(itemA).toMatchObject({ h: 2, w: 3 });
      expect(blocked).toEqual([`a`]);
    });

    it(`Should not emit moveBlockedByCollision for a drag tick that never tried to move the item`, () => {
      setInputs({ colNum: 12, layout });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe((id: string | number) => blocked.push(id));

      drag(`dragmove`, `0`, 0, 0);

      expect(blocked).toEqual([]);
    });

    it(`Should ignore a drag for an unknown item id without emitting any drag output`, () => {
      setInputs({ colNum: 12, layout });
      const seen: (string | number)[] = [];
      component.dragStart.subscribe((id: string | number) => seen.push(id));
      component.dragMove.subscribe((id: string | number) => seen.push(id));
      component.dragEnd.subscribe((id: string | number) => seen.push(id));

      drag(`dragstart`, `nope`, 0, 0);
      drag(`dragmove`, `nope`, 0, 0);
      drag(`dragend`, `nope`, 0, 0);

      expect(seen).toEqual([]);
    });

    it(`Should ignore a resize for an unknown item id without starting a drag placeholder`, () => {
      setInputs({ colNum: 12, layout });

      getEventBus().emitItemResize({ eventType: `resizemove`, h: 2, i: `nope`, w: 2, x: 0, y: 0 });

      expect(component.isDragging).toBe(false);
      expect(component.placeholder).toBeNull();
    });
  });

  describe(`responsive`, () => {
    it(`Should keep colNum as the effective column count while responsive is on but the container is still unmeasured`, () => {
      setInputs({ colNum: 12, layout, responsive: true });
      const breakpoints: TBreakpointsLike[] = [];
      component.breakpointChanged.subscribe((value: TBreakpointsLike) => breakpoints.push(value));

      // jsdom never measures the container (offsetWidth stays 0), so the
      // responsive pass only runs when something asks for it — here, a
      // post-mount change to `responsive`/`breakpoints`/`cols`.
      component.ngOnChanges({ responsive: { firstChange: false } } as unknown as SimpleChanges);

      expect((component as unknown as { effectiveColNum: number }).effectiveColNum).toBe(12);
      expect(breakpoints).toEqual([]);
    });
  });

  describe(`the compactType reaches the compactor from every call site`, () => {
    const makeSpyCompactor = (): { compactor: ICompactor; contexts: { compactType?: ECompactType }[] } => {
      const contexts: { compactType?: ECompactType }[] = [];
      const compactor: ICompactor = {
        compact: (current: TLayout, _cols: number, context) => {
          contexts.push(context as { compactType?: ECompactType });
          return current;
        },
        type: `spy`,
      };
      return { compactor, contexts };
    };

    it(`Should pass compactType to the compactor on a drag tick`, () => {
      const { compactor, contexts } = makeSpyCompactor();
      setInputs({ colNum: 12, compactType: ECompactType.HORIZONTAL, compactor, layout });

      drag(`dragmove`, `0`, 6, 0);

      expect(contexts.at(-1)?.compactType).toBe(ECompactType.HORIZONTAL);
    });

    it(`Should pass compactType to the compactor on a resize tick`, () => {
      const { compactor, contexts } = makeSpyCompactor();
      setInputs({ colNum: 12, compactType: ECompactType.HORIZONTAL, compactor, layout });

      getEventBus().emitItemResize({ eventType: `resizemove`, h: 2, i: `0`, w: 1, x: 0, y: 0 });

      expect(contexts.at(-1)?.compactType).toBe(ECompactType.HORIZONTAL);
    });

    it(`Should pass compactType to the compactor when auto-compacting an external layout change`, () => {
      const { compactor, contexts } = makeSpyCompactor();
      setInputs({ colNum: 12, compactType: ECompactType.HORIZONTAL, compactor, layout });
      contexts.length = 0;

      // A genuinely new layout (the same positions would be an echo of what is already rendered, which is not compacted).
      changeLayoutExternally(layout.map(item => ({ ...item, x: item.x + 1 })));

      expect(contexts.at(-1)?.compactType).toBe(ECompactType.HORIZONTAL);
    });

    it(`Should pass the configured compactType to the compactor from compactNow()`, () => {
      const { compactor, contexts } = makeSpyCompactor();
      setInputs({ colNum: 12, compactType: ECompactType.HORIZONTAL, compactor, layout });

      component.compactNow();

      expect(contexts.at(-1)?.compactType).toBe(ECompactType.HORIZONTAL);
    });

    it(`Should pass VERTICAL, not NONE, to the compactor from compactNow() when compactType is NONE`, () => {
      const { compactor, contexts } = makeSpyCompactor();
      setInputs({ colNum: 12, compactType: ECompactType.NONE, compactor, layout });

      component.compactNow();

      expect(contexts.at(-1)?.compactType).toBe(ECompactType.VERTICAL);
    });

    it(`Should pass compactType to the compactor after an align command`, () => {
      const { compactor, contexts } = makeSpyCompactor();
      const spread: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputs({ colNum: 12, compactType: ECompactType.HORIZONTAL, compactor, layout: spread, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      contexts.length = 0;

      component.alignSelected(`left`);

      expect(contexts.at(-1)?.compactType).toBe(ECompactType.HORIZONTAL);
    });
  });

  describe(`alignSelected and preventCollision`, () => {
    const withBlocker: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 4, y: 4 },
      { h: 2, i: `blocker`, w: 2, x: 0, y: 4 },
    ];

    const alignLeftWith = (inputs: Partial<GridLayoutComponent>, startLayout: TLayout): TLayout => {
      setInputs({ colNum: 12, compactType: ECompactType.NONE, layout: startLayout, multiSelect: true, ...inputs });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      component.alignSelected(`left`);
      return emitted[0];
    };

    it(`Should skip an adjustment that would land on a non-selected item when preventCollision is on`, () => {
      const result = alignLeftWith({ preventCollision: true }, withBlocker);

      expect(result.find(item => item.i === `b`)?.x).toBe(4);
    });

    it(`Should still apply that same adjustment when preventCollision is off`, () => {
      const result = alignLeftWith({ preventCollision: false }, withBlocker);

      expect(result.find(item => item.i === `b`)?.x).toBe(0);
    });

    it(`Should not treat an item's own current position as a collision with its adjusted position`, () => {
      const overlappingItself: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 1, y: 4 },
      ];

      const result = alignLeftWith({ preventCollision: true }, overlappingItself);

      expect(result.find(item => item.i === `b`)?.x).toBe(0);
    });

    it(`Should leave x untouched when an adjustment only sets y (a top-align)`, () => {
      const spread: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputs({ colNum: 12, compactType: ECompactType.NONE, layout: spread, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.alignSelected(`top`);

      const itemB = emitted[0].find(item => item.i === `b`);
      expect(itemB?.y).toBe(0);
      expect(itemB?.x).toBe(6);
    });

    it(`Should still apply an adjustment that collides with nothing when preventCollision is on and other, unrelated items exist`, () => {
      const withFarAwayItem: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 4 },
        { h: 2, i: `far`, w: 2, x: 8, y: 8 },
      ];

      const result = alignLeftWith({ preventCollision: true }, withFarAwayItem);

      expect(result.find(item => item.i === `b`)?.x).toBe(0);
    });
  });

  describe(`outside drop`, () => {
    const dispatchDragEvent = (
      element: HTMLElement,
      type: string,
      init: { clientX?: number; clientY?: number; dataTransfer?: DataTransfer | null } = {},
    ): Event => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, `clientX`, { value: init.clientX ?? 0 });
      Object.defineProperty(event, `clientY`, { value: init.clientY ?? 0 });
      Object.defineProperty(event, `dataTransfer`, { value: init.dataTransfer ?? null });
      element.dispatchEvent(event);
      return event;
    };

    const mockDataTransfer = { getData: () => `` } as unknown as DataTransfer;

    const setupOutsideDrop = (inputs: Partial<GridLayoutComponent> = {}): HTMLDivElement => {
      setInputs({ allowOutsideDrop: true, colNum: 12, layout: [], margin: [10, 10], rowHeight: 100, ...inputs });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      containerDiv.getBoundingClientRect = () => ({
        bottom: 500, height: 500, left: 0, right: 1220, top: 0, width: 1220, x: 0, y: 0, toJSON: () => ({}),
      });
      component.containerWidth = 1220;
      return containerDiv;
    };

    const toggleOff = (): void => {
      component.allowOutsideDrop = false;
      component.ngOnChanges({ allowOutsideDrop: { firstChange: false } } as unknown as SimpleChanges);
    };

    it(`Should stop reacting to dragover once allowOutsideDrop is switched off`, () => {
      const containerDiv = setupOutsideDrop();
      toggleOff();

      const event = dispatchDragEvent(containerDiv, `dragover`, { clientX: 101, clientY: 0 });

      expect(event.defaultPrevented).toBe(false);
    });

    it(`Should stop reacting to dragleave once allowOutsideDrop is switched off`, () => {
      const containerDiv = setupOutsideDrop();
      toggleOff();

      const event = dispatchDragEvent(containerDiv, `dragleave`);

      expect(event.defaultPrevented).toBe(false);
    });

    it(`Should stop emitting itemDroppedFromOutside on drop once allowOutsideDrop is switched off`, () => {
      const containerDiv = setupOutsideDrop();
      const dropped: unknown[] = [];
      component.itemDroppedFromOutside.subscribe(payload => dropped.push(payload));
      toggleOff();

      const event = dispatchDragEvent(containerDiv, `drop`, { clientX: 101, clientY: 0, dataTransfer: mockDataTransfer });

      expect(dropped).toEqual([]);
      expect(event.defaultPrevented).toBe(false);
    });

    it(`Should ignore a dragover entirely when outsideDropAccept rejects it`, () => {
      const containerDiv = setupOutsideDrop({ outsideDropAccept: () => false });

      const event = dispatchDragEvent(containerDiv, `dragover`, { clientX: 101, clientY: 0 });

      expect(event.defaultPrevented).toBe(false);
      expect(component.isDragging).toBe(false);
      expect(component.placeholder).toBeNull();
    });

    it(`Should ignore a drop entirely when outsideDropAccept rejects it`, () => {
      const containerDiv = setupOutsideDrop({ outsideDropAccept: () => false });
      const dropped: unknown[] = [];
      component.itemDroppedFromOutside.subscribe(payload => dropped.push(payload));

      const event = dispatchDragEvent(containerDiv, `drop`, { clientX: 101, clientY: 0, dataTransfer: mockDataTransfer });

      expect(dropped).toEqual([]);
      expect(event.defaultPrevented).toBe(false);
    });

    it(`Should stop dragging once a drop completes`, () => {
      const containerDiv = setupOutsideDrop();
      dispatchDragEvent(containerDiv, `dragover`, { clientX: 101, clientY: 0 });
      expect(component.isDragging).toBe(true);

      dispatchDragEvent(containerDiv, `drop`, { clientX: 101, clientY: 0, dataTransfer: mockDataTransfer });

      expect(component.isDragging).toBe(false);
    });

    it(`Should detach the outside-drop listeners when the component is destroyed`, () => {
      const containerDiv = setupOutsideDrop();

      fixture.destroy();
      const event = dispatchDragEvent(containerDiv, `dragover`, { clientX: 101, clientY: 0 });

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe(`guide labels and styles`, () => {
    it(`Should pluralise the X-axis spacing label for a gap wider than one column`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 0 },
      ];
      setInputs({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showSpacingGuides: true });

      drag(`dragmove`, `a`, 2, 0);

      expect(component.spacingIndicatorStyles.some(indicator => indicator.label === `2 cols`)).toBe(true);
    });

    it(`Should pluralise the Y-axis spacing label for a gap taller than one row`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 0, y: 6 },
      ];
      setInputs({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, rowHeight: 100, showSpacingGuides: true });

      drag(`dragmove`, `a`, 0, 2);

      expect(component.spacingIndicatorStyles.some(indicator => indicator.label === `2 rows`)).toBe(true);
    });

    it(`Should give an X-axis alignment guide its full-height, zero-top, one-pixel-wide style`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 4 },
      ];
      setInputs({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showAlignmentGuides: true });

      drag(`dragmove`, `a`, 4, 0);

      const guide = component.alignmentGuideStyles.find(candidate => candidate.width === `1px`);
      expect(guide).toMatchObject({ height: `100%`, top: `0`, width: `1px` });
    });

    it(`Should give a Y-axis alignment guide its one-pixel-tall, zero-left, full-width style`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 6 },
      ];
      setInputs({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showAlignmentGuides: true });

      drag(`dragmove`, `a`, 0, 6);

      const guide = component.alignmentGuideStyles.find(candidate => candidate.width === `100%`);
      expect(guide).toMatchObject({ height: `1px`, left: `0`, width: `100%` });
    });
  });

  describe(`container style`, () => {
    it(`Should always carry isolation and position, whichever heightMode is active`, () => {
      setInputs({ heightMode: `auto`, layout });

      expect(component.containerStyle[`isolation`]).toBe(`isolate`);
      expect(component.containerStyle[`position`]).toBe(`relative`);
    });

    it(`Should not even declare a height or overflow-y key when the mode is fixed`, () => {
      setInputs({ heightMode: `fixed`, layout });

      expect(`height` in component.containerStyle).toBe(false);
      expect(`overflow-y` in component.containerStyle).toBe(false);
    });

    it(`Should declare overflow-y but no height key when the mode is scroll`, () => {
      setInputs({ heightMode: `scroll`, layout });

      expect(`height` in component.containerStyle).toBe(false);
      expect(component.containerStyle[`overflow-y`]).toBe(`auto`);
    });

    it(`Should declare a height but no overflow-y key when the mode is auto`, () => {
      setInputs({ heightMode: `auto`, layout });

      expect(`height` in component.containerStyle).toBe(true);
      expect(`overflow-y` in component.containerStyle).toBe(false);
    });
  });

  describe(`remaining guards and imperative-API gaps`, () => {
    const twoApart: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 6, y: 0 },
    ];
    const alignedPair: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 4, y: 4 },
    ];

    it(`Should build the exported SVG from the grid's own measured width and row height`, () => {
      setInputs({ colNum: 12, containerWidth: 1220, layout, rowHeight: 100 });
      const wide = component.exportLayoutAsSvg();

      component.containerWidth = 600;
      const narrow = component.exportLayoutAsSvg();
      component.rowHeight = 50;
      const shorter = component.exportLayoutAsSvg();

      expect(narrow).not.toBe(wide);
      expect(shorter).not.toBe(narrow);
      expect(component.exportLayoutAsSvg({ containerWidth: 300 })).not.toBe(shorter);
    });

    it(`Should replace the selection on a plain click instead of adding to it`, () => {
      setInputs({ colNum: 12, layout: fourInARow, multiSelect: true });

      click(`a`);
      click(`c`);

      expect([...component.selectedItemIds]).toEqual([`c`]);
    });

    it(`Should show alignment guides already on dragstart`, () => {
      setInputs({ colNum: 12, containerWidth: 1220, layout: alignedPair, showAlignmentGuides: true });

      drag(`dragstart`, `a`, 4, 0);

      expect(component.alignmentGuideStyles.length).toBeGreaterThan(0);
    });

    it(`Should not report a blocked move for a drag tick that moved the item vertically only`, () => {
      setInputs({ colNum: 12, layout });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe((id: string | number) => blocked.push(id));

      drag(`dragmove`, `0`, 0, 3);

      expect(blocked).toEqual([]);
    });

    describe(`group move and resize only apply while multiSelect is on`, () => {
      it(`Should not move other selected items on a drag once multiSelect has been switched off`, () => {
        setInputs({ colNum: 12, compactType: ECompactType.NONE, layout: fourInARow, multiSelect: true });
        component.selectItem(`a`);
        component.toggleItemSelection(`b`);
        component.multiSelect = false;

        drag(`dragstart`, `a`, 0, 0);
        drag(`dragmove`, `a`, 0, 4);

        expect(workingLayoutOf().find(item => item.i === `b`)).toMatchObject({ x: 2, y: 0 });
      });

      it(`Should not resize other selected items on a resize once multiSelect has been switched off`, () => {
        setInputs({ colNum: 12, compactType: ECompactType.NONE, layout: twoApart, multiSelect: true });
        component.selectItem(`a`);
        component.toggleItemSelection(`b`);
        component.multiSelect = false;

        getEventBus().emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
        getEventBus().emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 4, x: 0, y: 0 });

        expect(workingLayoutOf().find(item => item.i === `b`)).toMatchObject({ w: 2 });
      });
    });

    describe(`spacing indicators and guide styles`, () => {
      it(`Should not compute spacing indicators at all when showSpacingGuides is off`, () => {
        setInputs({ colNum: 12, containerWidth: 1220, layout: twoApart, showSpacingGuides: false });

        drag(`dragmove`, `a`, 2, 0);

        expect(component.spacingIndicatorStyles).toEqual([]);
      });

      it(`Should empty both guide lists again once the drag ends`, () => {
        setInputs({ colNum: 12, containerWidth: 1220, layout: twoApart, showAlignmentGuides: true, showSpacingGuides: true });
        drag(`dragmove`, `a`, 2, 0);
        expect(component.spacingIndicatorStyles.length).toBeGreaterThan(0);

        drag(`dragend`, `a`, 2, 0);

        expect(component.spacingIndicatorStyles).toEqual([]);
        expect(component.alignmentGuideStyles).toEqual([]);
      });

      it(`Should produce no guide or indicator styles while the container is still unmeasured`, () => {
        // Without the guard, core's calcColWidth() throws for a width below 1 — inside an RxJS
        // subscriber, which RxJS reports from a timer rather than rethrowing, so the styles would
        // stay empty either way. Asserting that no deferred error surfaces is what actually pins
        // the early return down.
        jest.useFakeTimers();
        try {
          setInputs({ colNum: 12, containerWidth: 0, layout: alignedPair, showAlignmentGuides: true });
          drag(`dragmove`, `a`, 4, 0);

          expect(() => jest.runAllTimers()).not.toThrow();
          expect(component.alignmentGuideStyles).toEqual([]);
        } finally {
          jest.useRealTimers();
        }
      });

      it(`Should produce no spacing indicator styles while the container is still unmeasured`, () => {
        jest.useFakeTimers();
        try {
          setInputs({ colNum: 12, containerWidth: 0, layout: twoApart, showSpacingGuides: true });
          drag(`dragmove`, `a`, 2, 0);

          expect(() => jest.runAllTimers()).not.toThrow();
          expect(component.spacingIndicatorStyles).toEqual([]);
        } finally {
          jest.useRealTimers();
        }
      });

      it(`Should still produce alignment guide styles for a container that is exactly 1px wide`, () => {
        setInputs({ colNum: 12, containerWidth: 1, layout: alignedPair, showAlignmentGuides: true });
        drag(`dragmove`, `a`, 4, 0);
        expect(component.alignmentGuideStyles.length).toBeGreaterThan(0);
      });

      it(`Should still produce spacing indicator styles for a container that is exactly 1px wide`, () => {
        setInputs({ colNum: 12, containerWidth: 1, layout: twoApart, showSpacingGuides: true });
        drag(`dragmove`, `a`, 2, 0);
        expect(component.spacingIndicatorStyles.length).toBeGreaterThan(0);
      });
    });
  });
});

/** `TBreakpoint` is a plain string-literal union in `keystone-dashboard-layout-core`; a local alias keeps this file's own import list small. */
type TBreakpointsLike = string;

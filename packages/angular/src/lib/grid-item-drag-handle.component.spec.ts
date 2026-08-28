import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GridItemDragHandleComponent } from './grid-item-drag-handle.component';

describe(`GridItemDragHandleComponent`, () => {
  let fixture: ComponentFixture<GridItemDragHandleComponent>;
  let component: GridItemDragHandleComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridItemDragHandleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GridItemDragHandleComponent);
    component = fixture.componentInstance;
  });

  it(`Should default text to 'x', matching Vue's own default exactly`, () => {
    fixture.detectChanges();

    expect(component.text).toBe(`x`);
  });

  it(`Should render the configured text inside a button`, () => {
    component.text = `⠿`;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(`button`) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe(`⠿`);
  });

  it(`Should render a separate .kdl-draggable-handle span, distinct from the button — the actual draggable hit-area, not the button itself`, () => {
    fixture.detectChanges();

    const handle = fixture.nativeElement.querySelector(`.kdl-draggable-handle`);
    expect(handle).toBeTruthy();
    // Confirmed via a direct source read of Vue's own CustomDragElement.
    // vue: the handle is a sibling of the button, not a wrapper around
    // it or a child of it.
    expect(fixture.nativeElement.querySelector(`button .kdl-draggable-handle`)).toBeFalsy();
  });

  it(`Should render both the button and the handle inside a single .kdl-drag-element-text wrapper`, () => {
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector(`.kdl-drag-element-text`);
    expect(wrapper?.querySelector(`button`)).toBeTruthy();
    expect(wrapper?.querySelector(`.kdl-draggable-handle`)).toBeTruthy();
  });
});

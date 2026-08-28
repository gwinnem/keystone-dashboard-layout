import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GridItemCloseButtonComponent } from './grid-item-close-button.component';

describe(`GridItemCloseButtonComponent`, () => {
  let fixture: ComponentFixture<GridItemCloseButtonComponent>;
  let component: GridItemCloseButtonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridItemCloseButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GridItemCloseButtonComponent);
    component = fixture.componentInstance;
  });

  it(`Should emit removeGridItem with the configured i when clicked`, () => {
    component.i = `my-item`;
    fixture.detectChanges();
    const removed: (string | number)[] = [];
    component.removeGridItem.subscribe(id => removed.push(id));

    const button = fixture.nativeElement.querySelector(`button`) as HTMLButtonElement;
    button.click();

    expect(removed).toEqual([`my-item`]);
  });

  it(`Should render a button with an aria-label of "Close"`, () => {
    component.i = `0`;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(`button`) as HTMLButtonElement;
    expect(button.getAttribute(`aria-label`)).toBe(`Close`);
  });

  it(`Should render a separate, aria-hidden icon span inside the button`, () => {
    component.i = `0`;
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector(`button .kdl-custom-close-button-icon`);
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute(`aria-hidden`)).toBe(`true`);
  });

  it(`Should emit the correct id for a numeric i, not just a string one`, () => {
    component.i = 42;
    fixture.detectChanges();
    const removed: (string | number)[] = [];
    component.removeGridItem.subscribe(id => removed.push(id));

    const button = fixture.nativeElement.querySelector(`button`) as HTMLButtonElement;
    button.click();

    expect(removed).toEqual([42]);
  });
});

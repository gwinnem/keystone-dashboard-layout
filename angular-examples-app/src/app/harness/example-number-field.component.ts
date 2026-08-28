import { Component, Input, Output, EventEmitter } from '@angular/core';

/** Same shape as astro-docs's own harness-angular/example-number-field — see ExampleToggleComponent's own doc comment for why this is duplicated rather than shared. */
@Component({
  selector: 'example-number-field',
  standalone: true,
  template: `
    <label class="number-field">
      <span class="number-field__label">{{ label }}</span>
      <input
        class="number-field__input"
        type="number"
        [value]="value"
        [attr.min]="min"
        [attr.max]="max"
        [attr.step]="step"
        (change)="onChange($event)"
      />
    </label>
  `,
})
export class ExampleNumberFieldComponent {
  @Input({ required: true }) value = 0;
  @Input({ required: true }) label = '';
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() step = 1;
  @Output() valueChange = new EventEmitter<number>();

  onChange(event: Event): void {
    this.valueChange.emit(Number((event.target as HTMLInputElement).value));
  }
}

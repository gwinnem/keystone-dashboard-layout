import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * Same shape as astro-docs's own harness-angular/example-toggle
 * (the abandoned Astro-island attempt) — duplicated here since this
 * is a genuinely separate app, not importable across that boundary.
 * `[checked]`/`(checkedChange)` — Angular has no v-model-equivalent
 * two-way sugar for a plain component, so both directions are wired
 * explicitly by the consumer.
 */
@Component({
  selector: 'example-toggle',
  standalone: true,
  template: `
    <label class="toggle">
      <input type="checkbox" [checked]="checked" (change)="onChange($event)" />
      <span class="toggle__track"><span class="toggle__thumb"></span></span>
      <span class="toggle__label">{{ label }}</span>
    </label>
  `,
})
export class ExampleToggleComponent {
  @Input({ required: true }) checked = false;
  @Input({ required: true }) label = '';
  @Output() checkedChange = new EventEmitter<boolean>();

  onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}

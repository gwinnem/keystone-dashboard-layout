import { Component } from '@angular/core';

/**
 * Landing page for the '' route — navigation now lives in the
 * sidebar (app.component.ts), so this is just a welcome message.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <h1>Keystone Dashboard Layout — Angular Examples</h1>
    <p>Pick an example from the sidebar to see it live.</p>
  `,
})
export class HomeComponent {}

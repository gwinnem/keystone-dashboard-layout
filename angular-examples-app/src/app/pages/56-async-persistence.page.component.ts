import { Component } from '@angular/core';
import { ExampleTryItComponent } from '../harness/example-try-it.component';
import { AsyncPersistenceDemoComponent } from '../examples/56-async-persistence.component';

@Component({
  selector: 'app-async-persistence-page',
  standalone: true,
  imports: [ExampleTryItComponent, AsyncPersistenceDemoComponent],
  template: `
    <h1>Async persistence</h1>
    <p>
      Save the layout to a backend that answers with a promise. This demo uses
      an in-memory stand-in for a server: pick a latency, or tick "Server is
      down" and save, to see how a failing store is reported.
    </p>

    <example-try-it filename="56-async-persistence.component.ts" sourceUrl="/examples-source/56-async-persistence.component.ts">
      <app-async-persistence-demo></app-async-persistence-demo>
    </example-try-it>

    <p>
      <code>GridLayoutAsyncStorageService</code> takes any <code>IAsyncLayoutStorage</code>
      — <code>createHttpStorage</code>, <code>createIndexedDbStorage</code>, or your own.
      Nothing rejects: a failing store resolves <code>false</code> / <code>null</code> and is
      emitted on <code>errors$</code>. Writes are queued, so a slow earlier save can never
      overwrite a later one.
    </p>
  `,
  styles: [`code { background: var(--kg-ink-3); border-radius: 4px; font-family: var(--kg-font-mono); font-size: 0.9em; padding: 2px 5px; }`],
})
export class AsyncPersistencePageComponent {}

import { Component, Input, OnInit } from '@angular/core';

/**
 * Angular version of astro-docs's own ExampleTryIt.astro card shell —
 * same look (toolbar, filename, Preview/Source tabs, copy button,
 * footer), reimplemented with real Angular component state (a plain
 * `activeTab` property) for the tab switching, rather than Astro's own
 * vanilla-JS DOM-querying <script> tag, since that's the idiomatic
 * way to do it from inside a genuine Angular component. `<ng-content>`
 * carries the live preview. `sourceUrl` points at the real component
 * file, copied verbatim into the build output as a static asset (see
 * angular.json's own "examples-source" glob) and fetched at runtime —
 * deliberately not a duplicated string constant, so the displayed
 * source can never drift from the actual, real component code.
 */
@Component({
  selector: 'example-try-it',
  standalone: true,
  template: `
    <div class="try-it">
      <div class="try-it__card">
        <div class="try-it__toolbar">
          <span class="try-it__filename">{{ filename }}</span>
          <div class="try-it__tabs">
            <button
              type="button"
              class="try-it__tab"
              [class.is-active]="activeTab === 'preview'"
              (click)="activeTab = 'preview'"
            >Preview</button>
            <button
              type="button"
              class="try-it__tab"
              [class.is-active]="activeTab === 'source'"
              (click)="activeTab = 'source'"
            >Source</button>
          </div>
        </div>

        @if (activeTab === 'preview') {
          <div class="try-it__panel">
            <div class="try-it__stage">
              <ng-content></ng-content>
            </div>
          </div>
        } @else {
          <div class="try-it__panel try-it__panel--source">
            <button type="button" class="try-it__copy" [class.is-copied]="copied" (click)="copySource()">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
            <pre>{{ source ?? 'Loading source\u2026' }}</pre>
          </div>
        }

        <div class="try-it__footer">
          <span>Live, running component — this page, this app.</span>
        </div>
      </div>
    </div>
  `,
})
export class ExampleTryItComponent implements OnInit {
  @Input({ required: true }) filename = '';
  @Input({ required: true }) sourceUrl = '';
  activeTab: 'preview' | 'source' = 'preview';
  copied = false;
  source: string | null = null;

  ngOnInit(): void {
    fetch(this.sourceUrl)
      .then((response) => response.text())
      .then((text) => {
        this.source = text;
      })
      .catch(() => {
        this.source = 'Could not load source.';
      });
  }

  copySource(): void {
    if (!this.source) return;
    navigator.clipboard
      .writeText(this.source)
      .then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 1500);
      })
      .catch(() => {
        // Clipboard access can fail (permissions, insecure context) —
        // silently doing nothing is preferable to throwing, matching
        // astro-docs's own copy-button failure handling.
      });
  }
}

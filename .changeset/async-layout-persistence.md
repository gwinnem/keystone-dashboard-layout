---
'keystone-dashboard-layout-core': minor
'keystone-dashboard-layout-vue': minor
'keystone-dashboard-layout-react': minor
'keystone-dashboard-layout-angular': minor
---

Add asynchronous layout persistence, alongside (not replacing) the existing synchronous storage helpers. Core exports the `IAsyncLayoutStorage` interface, ready-made `createHttpStorage`, `createIndexedDbStorage` and `createMemoryAsyncStorage` stores, and `createAsyncLayoutPersistence`, which queues writes so a slow earlier save can never overwrite a later one and never rejects (failures go to a callback and the method resolves `false`/`null`). Each framework gets a thin wrapper: `useAsyncLayoutStorage` for Vue (ref-bound, with `autoLoad`/`autoSave`) and React (plain values in and out, with `autoSave`), both exposing `isLoading`, `isSaving` and `error`, and `GridLayoutAsyncStorageService` for Angular, which reports failures on `errors$`.

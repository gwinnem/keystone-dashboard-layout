# Working notes for Claude

## Commands

- Never put `cd` in a command given to the user. The user always runs commands from the package directory they are working in (for example `packages/react`), so give the bare command, such as `pnpm exec playwright test props- --project=chromium`.
- Give one command per request where one will do (for example a single `playwright test <filter>` rather than several). Add a name filter only when narrowing down a failure.

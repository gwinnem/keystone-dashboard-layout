# Removing Husky and lint-staged

This document records the steps taken to remove Husky and the pre-commit
lint/format hook (`lint-staged`) from this repository.

## 1. `package.json` changes (already applied)

- Removed the `"prepare": "husky"` script.
- Removed `husky` and `lint-staged` from `devDependencies`.
- Removed the `"lint-staged": { ... }` config block.

## 2. Delete the `.husky` directory

```powershell
Remove-Item -Recurse -Force .husky
```

## 3. Uninstall the packages

```powershell
pnpm remove husky lint-staged
```

This updates `pnpm-lock.yaml` and prunes `node_modules` to match the
already-edited `package.json`.

## 4. Clear the git hooks path (if set)

Husky v9 typically points git at `.husky/_` via `core.hooksPath`. Check and
unset it so git falls back to the default `.git/hooks`:

```powershell
git config --get core.hooksPath
git config --unset core.hooksPath
```

## 5. Stage and commit

```powershell
git add package.json pnpm-lock.yaml
git status
```

Confirm `.husky/` shows as deleted and `pnpm-lock.yaml` is updated, then
commit as usual.

## Result

`git commit` no longer runs any pre-commit hook — nothing lints or formats
staged files automatically. If a lighter-weight safety net (e.g.
`prettier --check` only, without ESLint) is wanted later, it can be
reintroduced selectively.

# Deployment & Branch Management

## Overwriting a branch with another (no conflicts, no lost changes)

Use this when a feature/fix branch should completely replace a target branch
(e.g. `fix/checking-implementations` -> `develop`).

### Pre-conditions

- All work on the source branch must be committed (nothing staged, nothing unstaged).
- The pre-push hook restrictions for the target branch must be disabled or
  bypassed - see [Temporarily disabling force-push restrictions](#temporarily-disabling-force-push-restrictions).

### Steps

```bash
# 1. Make sure source branch is clean
git status

# 2. Switch to the target branch
git switch develop

# 3. Reset target to match source exactly
git reset --hard fix/checking-implementations

# 4. Force push to both remotes
git push --force origin develop
git push --force personal develop
```

`git reset --hard <source>` moves the target branch pointer to the exact same
commit as the source - no merge commit, no conflicts, histories become identical.

---

## Temporarily disabling force-push restrictions

The pre-push hook at `.husky/pre-push` blocks force pushes to `develop` and
`main` by default. To allow a one-off force push:

1. Open `.husky/pre-push`.
2. Comment out the `merge-base --is-ancestor` check and `check_heavy_files`
   call for the relevant branch (develop or main).
3. Commit the change.
4. Perform the force push.
5. Revert the hook change and commit again once done.

---

## Remotes

| Alias      | URL                                              | Notes         |
| ---------- | ------------------------------------------------ | ------------- |
| `origin`   | `git@github.com:debridger/debridgers-repo.git`   | Org remote    |
| `personal` | `git@github.com:Olorunshogo/debridgers-repo.git` | Personal fork |

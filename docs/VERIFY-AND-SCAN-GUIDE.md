# Verifying the Backdoor, and Scanning Your Own Machine

**Date:** 2026-08-28
**Applies to:** 8 repositories across 6 organisations

This document does three things:

1. Gives you a **history-level scan** to run on your own machine
2. Shows you how to **verify for yourself** that a specific commit is infected
3. Lists **every affected commit** so you can check any of them

---

## Read this first: nobody here is being accused

The commits below are ordinary, legitimate work — bug fixes and features. The malware wrote
itself into a build config file on disk, `git add` staged it along with the real changes, and
it was committed without anyone seeing it. It hides behind ~700 spaces at the end of a line,
so it is invisible in an editor and shows as a one-line change in a diff.

**Your name on this list means your machine was compromised. It does not mean you did
anything wrong.** The list exists so we know which machines to clean.

---

## Part 1 — The scan you should run

### Why the filesystem scan is not enough

A `grep` over your folders only checks **the branch you have checked out right now**.

Four of the eight infected repositories — `agromart`, `Swiftmedix`, `alleyv2` and
`albatross-frontend` — had **completely clean working directories**. The backdoor was sitting
on other branches. A filesystem scan reports "clean" and you push infected code the next time
you switch branches.

**You must scan git history.**

### Step 1: get the scanner

Save the file `scan-git-history.py` (shared alongside this document) anywhere convenient.
It needs Python 3 and `git`. It reads only — it changes nothing.

### Step 2: run it

```bash
# one repository
python3 scan-git-history.py ~/code/my-project

# every repository in a folder
python3 scan-git-history.py ~/code/*/

# the repo you are currently in
cd ~/code/my-project && python3 scan-git-history.py
```

### Step 3: read the result

```
CLEAN     api-albatross-v2  (3111 blobs checked)
```

```
INFECTED  alley-mobile-app  (2 infected blobs of 696 checked)
    file: tailwind.config.js
        36f1745  2026-05-14 17:05  Arome8240 <arome8240@gmail.com>
        a7ce4a8  2026-07-25 14:20  Arome8240 <arome8240@gmail.com>
        6e5a745  2026-08-10 13:06  Arome8240 <arome8240@gmail.com>
```

It exits `1` if anything was found, so you can use it in CI.

**Run it on every repository you have, not just work ones.** This has been found in personal
projects too.

### What it looks for

| Pattern                                       | What it is                                      |
| --------------------------------------------- | ----------------------------------------------- |
| `global.o = '7-....'`                         | the marker, both spacings                       |
| `_$_NNNN = (function`                         | the string descrambler                          |
| `eth_getBlockByNumber`                        | the blockchain C2 lookup                        |
| `eth.drpc.org`, `ethereum-rpc.publicnode.com` | the RPC endpoints used to find the payload host |

---

## Part 2 — Verify a specific commit yourself

Do not take this document's word for it. Every claim below is reproducible in a few seconds.

### Check 1 — is this commit infected?

```bash
git show <commit>:<path> | grep -qE "global\.o *= *'7-" && echo INFECTED || echo clean
```

Real example:

```bash
cd alley-mobile-app
git show 36f1745:tailwind.config.js | grep -qE "global\.o *= *'7-" && echo INFECTED || echo clean
# -> INFECTED
```

### Check 2 — see it with your own eyes

```bash
git show <commit>:<path> | grep -n "global.o"
```

To find the hidden line — the payload is one enormous line:

```bash
git show <commit>:<path> | awk '{ if (length($0) > 500) print NR": "length($0)" characters" }'
```

A config file with a 6,000-character line is not normal.

### Check 3 — which campaign ID

```bash
git show <commit>:<path> | grep -oE "global\.o *= *'7-[a-z0-9]+'" | head -1
```

Each infected **project** got its own sequential ID (see the table below).

### Check 4 — was the commit rebased?

Author date is preserved through a rebase; committer date is not. If they differ by a lot,
the commit object was rewritten later and the author date is not proof of when the content
existed.

```bash
git show -s --format='authored  %ad%ncommitted %cd' --date=iso <commit>
```

### Check 5 — see the diff as the reviewer saw it

```bash
git show <commit> -- <path>
```

This is the important one. It usually shows `1 insertion, 1 deletion` on a file nobody
reviews — which is exactly why this went unnoticed for four months.

---

## Part 3 — Every affected repository and commit

**8 repositories · 182 infecting commits · 11 developers**

| Repo               | Organisation         | Campaign ID         | Commits | Files | First      | Last       |
| ------------------ | -------------------- | ------------------- | ------- | ----- | ---------- | ---------- |
| albatross-frontend | Albatross-Live       | `7-c1277`           | 4       | 1     | 2026-08-04 | 2026-08-17 |
| alley-mobile-app   | alleybookings        | `7-c1278`           | 3       | 1     | 2026-05-14 | 2026-08-10 |
| AlleyBackend       | alleybookings        | `7-c1279`           | 8       | 1     | 2026-05-05 | 2026-08-07 |
| alleyv2            | alleybookings        | `7-c1280`           | 8       | 1     | 2026-05-07 | 2026-08-10 |
| next-safe-haven    | nexttech-innovators  | `7-c1283 / 7-d3769` | 5       | 1     | 2026-06-16 | 2026-07-30 |
| Stayar-V2          | Stayar-Tech-LTD      | `7-c1287`           | 91      | 11    | 2026-06-08 | 2026-08-27 |
| Swiftmedix         | swiftmedixtechnology | `7-c1288`           | 48      | 17    | 2026-05-30 | 2026-08-15 |
| agromart           | thebuidl-grid        | `7-c1289`           | 15      | 1     | 2026-05-05 | 2026-07-28 |

### The campaign IDs are a counter — and there are gaps

Sorted: `1277, 1278, 1279, 1280, 1283, 1287, 1288, 1289`.

One ID per infected project, allocated in sequence. **`1281`, `1282`, `1284`, `1285` and
`1286` are missing** — five further infected projects exist that were not on the machine
this analysis was run from. If you find one, its ID will likely be one of those five.

### Machines that need cleaning

| Commits | Developer                                                     | Repositories                                                  |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| 61      | Praise Ogunleye <praiseleye.pl@gmail.com>                     | AlleyBackend, Stayar-V2, Swiftmedix, alleyv2, next-safe-haven |
| 30      | unrealtim-tech <jigah4thjuly@gmail.com>                       | Stayar-V2                                                     |
| 30      | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com>              | Stayar-V2                                                     |
| 17      | Biglad22 <emmanuelaberuagba22@gmail.com>                      | Stayar-V2, Swiftmedix                                         |
| 13      | Akshola00 <akinniyishola07@gmail.com>                         | agromart                                                      |
| 10      | Stephanie Nwankwo <badviruscoder@gmail.com>                   | Stayar-V2                                                     |
| 8       | Arome8240 <arome8240@gmail.com>                               | AlleyBackend, alley-mobile-app, alleyv2                       |
| 4       | Abdulhaq <abduldev.spider@gmail.com>                          | albatross-frontend                                            |
| 4       | Stephen Nkwocha <chinedustevenkwocha@gmail.com>               | AlleyBackend, alleyv2                                         |
| 2       | Techlateef <techlateef@gmail.com>                             | next-safe-haven                                               |
| 2       | macnelson9 <michaelofatu@gmail.com>                           | agromart                                                      |
| 1       | Praise Ogunleye <63259841+Praizleye@users.noreply.github.com> | next-safe-haven                                               |

---

### albatross-frontend

`git@github.com:Albatross-Live/albatross-frontend.git` — campaign ID `7-c1277`

**Infected files (1):**

- `eslint.config.mjs`

**Verify any of these:**

```bash
git show ccb614e:eslint.config.mjs | grep -qE "global\\.o *= *'7-" && echo INFECTED || echo clean
```

**Infecting commits (4):**

| Commit    | Date             | Committed by                         | File                |
| --------- | ---------------- | ------------------------------------ | ------------------- |
| `ccb614e` | 2026-08-04 08:26 | Abdulhaq <abduldev.spider@gmail.com> | `eslint.config.mjs` |
| `835ed23` | 2026-08-04 10:03 | Abdulhaq <abduldev.spider@gmail.com> | `eslint.config.mjs` |
| `d45981f` | 2026-08-13 17:06 | Abdulhaq <abduldev.spider@gmail.com> | `eslint.config.mjs` |
| `f471832` | 2026-08-17 20:39 | Abdulhaq <abduldev.spider@gmail.com> | `eslint.config.mjs` |

---

### alley-mobile-app

`git@github.com:alleybookings/alley-mobile-app.git` — campaign ID `7-c1278`

**Infected files (1):**

- `tailwind.config.js`

**Verify any of these:**

```bash
git show 36f1745:tailwind.config.js | grep -qE "global\\.o *= *'7-" && echo INFECTED || echo clean
```

**Infecting commits (3):**

| Commit    | Date             | Committed by                    | File                 |
| --------- | ---------------- | ------------------------------- | -------------------- |
| `36f1745` | 2026-05-14 17:05 | Arome8240 <arome8240@gmail.com> | `tailwind.config.js` |
| `a7ce4a8` | 2026-07-25 14:20 | Arome8240 <arome8240@gmail.com> | `tailwind.config.js` |
| `6e5a745` | 2026-08-10 13:06 | Arome8240 <arome8240@gmail.com> | `tailwind.config.js` |

---

### AlleyBackend

`git@github.com:alleybookings/AlleyBackend.git` — campaign ID `7-c1279`

**Infected files (1):**

- `apps/listers/webpack.config.js`

**Verify any of these:**

```bash
git show 5252719:apps/listers/webpack.config.js | grep -qE "global\\.o *= *'7-" && echo INFECTED || echo clean
```

**Infecting commits (8):**

| Commit    | Date             | Committed by                                    | File                             |
| --------- | ---------------- | ----------------------------------------------- | -------------------------------- |
| `5252719` | 2026-05-05 13:04 | Praise Ogunleye <praiseleye.pl@gmail.com>       | `apps/listers/webpack.config.js` |
| `4ebd28e` | 2026-05-19 18:43 | Praise Ogunleye <praiseleye.pl@gmail.com>       | `apps/listers/webpack.config.js` |
| `47cc951` | 2026-05-29 16:18 | Praise Ogunleye <praiseleye.pl@gmail.com>       | `apps/listers/webpack.config.js` |
| `a97c22a` | 2026-07-08 11:04 | Stephen Nkwocha <chinedustevenkwocha@gmail.com> | `apps/listers/webpack.config.js` |
| `0d1e071` | 2026-07-13 12:44 | Stephen Nkwocha <chinedustevenkwocha@gmail.com> | `apps/listers/webpack.config.js` |
| `28f65e0` | 2026-07-16 11:26 | Praise Ogunleye <praiseleye.pl@gmail.com>       | `apps/listers/webpack.config.js` |
| `952f27f` | 2026-07-30 11:04 | Stephen Nkwocha <chinedustevenkwocha@gmail.com> | `apps/listers/webpack.config.js` |
| `607a465` | 2026-08-07 11:33 | Arome8240 <arome8240@gmail.com>                 | `apps/listers/webpack.config.js` |

---

### alleyv2

`git@github.com:alleybookings/alleyv2.git` — campaign ID `7-c1280`

**Infected files (1):**

- `postcss.config.mjs`

**Verify any of these:**

```bash
git show b6d4e12:postcss.config.mjs | grep -qE "global\\.o *= *'7-" && echo INFECTED || echo clean
```

**Infecting commits (8):**

| Commit    | Date             | Committed by                                    | File                 |
| --------- | ---------------- | ----------------------------------------------- | -------------------- |
| `b6d4e12` | 2026-05-07 10:22 | Praise Ogunleye <praiseleye.pl@gmail.com>       | `postcss.config.mjs` |
| `dd579e2` | 2026-05-07 11:22 | Arome8240 <arome8240@gmail.com>                 | `postcss.config.mjs` |
| `932db2c` | 2026-05-15 14:46 | Arome8240 <arome8240@gmail.com>                 | `postcss.config.mjs` |
| `544ca42` | 2026-06-18 09:20 | Arome8240 <arome8240@gmail.com>                 | `postcss.config.mjs` |
| `1c3d647` | 2026-07-14 11:52 | Praise Ogunleye <praiseleye.pl@gmail.com>       | `postcss.config.mjs` |
| `e3f8b63` | 2026-07-17 17:40 | Stephen Nkwocha <chinedustevenkwocha@gmail.com> | `postcss.config.mjs` |
| `a2ac1da` | 2026-08-06 13:17 | Praise Ogunleye <praiseleye.pl@gmail.com>       | `postcss.config.mjs` |
| `761b067` | 2026-08-10 12:38 | Arome8240 <arome8240@gmail.com>                 | `postcss.config.mjs` |

---

### next-safe-haven

`git@github.com:nexttech-innovators/next-safe-haven.git` — campaign ID `7-c1283 / 7-d3769`

**Infected files (1):**

- `eslint.config.mjs`

**Verify any of these:**

```bash
git show 9aaace1:eslint.config.mjs | grep -qE "global\\.o *= *'7-" && echo INFECTED || echo clean
```

**Infecting commits (5):**

| Commit    | Date             | Committed by                                                  | File                |
| --------- | ---------------- | ------------------------------------------------------------- | ------------------- |
| `9aaace1` | 2026-06-16 23:45 | Techlateef <techlateef@gmail.com>                             | `eslint.config.mjs` |
| `74f89df` | 2026-06-24 23:14 | Praise Ogunleye <praiseleye.pl@gmail.com>                     | `eslint.config.mjs` |
| `c0ad22d` | 2026-07-12 21:03 | Praise Ogunleye <praiseleye.pl@gmail.com>                     | `eslint.config.mjs` |
| `0101130` | 2026-07-12 21:04 | Praise Ogunleye <63259841+Praizleye@users.noreply.github.com> | `eslint.config.mjs` |
| `98e80d6` | 2026-07-30 15:21 | Techlateef <techlateef@gmail.com>                             | `eslint.config.mjs` |

---

### Stayar-V2

`git@github.com:Stayar-Tech-LTD/Stayar-V2.git` — campaign ID `7-c1287`

**Infected files (11):**

- `apps/landing-page/postcss.config.cjs`
- `apps/stayar-admin/postcss.config.js`
- `apps/stayar-backend-e2e/eslint.config.mjs`
- `apps/stayar-backend/webpack.config.js`
- `apps/stayar-tenant/postcss.config.js`
- `eslint.config.mjs`
- `libs/shared/theme/eslint.config.mjs`
- `libs/shared/theme/src/lib/tailwind.config.cjs`
- `libs/shared/theme/src/lib/tailwind.config.js`
- `libs/shared/ui/postcss.config.js`
- `libs/stayar-api/eslint.config.mjs`

**Verify any of these:**

```bash
git show 9608a3f:apps/landing-page/postcss.config.cjs | grep -qE "global\\.o *= *'7-" && echo INFECTED || echo clean
```

**Infecting commits (91):**

| Commit    | Date             | Committed by                                     | File                                            |
| --------- | ---------------- | ------------------------------------------------ | ----------------------------------------------- |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/landing-page/postcss.config.cjs`          |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-admin/postcss.config.js`           |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-backend/webpack.config.js`         |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-tenant/postcss.config.js`          |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `eslint.config.mjs`                             |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/theme/eslint.config.mjs`           |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/ui/postcss.config.js`              |
| `9608a3f` | 2026-06-08 17:27 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/stayar-api/eslint.config.mjs`             |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/landing-page/postcss.config.cjs`          |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-admin/postcss.config.js`           |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-backend/webpack.config.js`         |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-tenant/postcss.config.js`          |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `eslint.config.mjs`                             |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/theme/eslint.config.mjs`           |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/ui/postcss.config.js`              |
| `0841dbb` | 2026-06-25 17:30 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/stayar-api/eslint.config.mjs`             |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/landing-page/postcss.config.cjs`          |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/landing-page/postcss.config.cjs`          |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-admin/postcss.config.js`           |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-admin/postcss.config.js`           |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-backend/webpack.config.js`         |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-backend/webpack.config.js`         |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-tenant/postcss.config.js`          |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `apps/stayar-tenant/postcss.config.js`          |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `eslint.config.mjs`                             |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `eslint.config.mjs`                             |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/theme/eslint.config.mjs`           |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/theme/eslint.config.mjs`           |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/ui/postcss.config.js`              |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/shared/ui/postcss.config.js`              |
| `d123261` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/stayar-api/eslint.config.mjs`             |
| `96aae35` | 2026-07-15 14:40 | unrealtim-tech <jigah4thjuly@gmail.com>          | `libs/stayar-api/eslint.config.mjs`             |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/landing-page/postcss.config.cjs`          |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-admin/postcss.config.js`           |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-backend/webpack.config.js`         |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-tenant/postcss.config.js`          |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `eslint.config.mjs`                             |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/theme/eslint.config.mjs`           |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/ui/postcss.config.js`              |
| `b918668` | 2026-07-17 08:46 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/stayar-api/eslint.config.mjs`             |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `apps/landing-page/postcss.config.cjs`          |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `apps/stayar-admin/postcss.config.js`           |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `apps/stayar-backend/webpack.config.js`         |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `apps/stayar-tenant/postcss.config.js`          |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `eslint.config.mjs`                             |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `libs/shared/theme/eslint.config.mjs`           |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `libs/shared/ui/postcss.config.js`              |
| `8999398` | 2026-08-09 15:32 | Stephanie Nwankwo <badviruscoder@gmail.com>      | `libs/stayar-api/eslint.config.mjs`             |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/landing-page/postcss.config.cjs`          |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-admin/postcss.config.js`           |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-backend/webpack.config.js`         |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `apps/stayar-tenant/postcss.config.js`          |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `eslint.config.mjs`                             |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/theme/eslint.config.mjs`           |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/shared/ui/postcss.config.js`              |
| `fdd9944` | 2026-08-14 20:03 | Olorunshogo Moses BAMTEFA <shownzy001@gmail.com> | `libs/stayar-api/eslint.config.mjs`             |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/landing-page/postcss.config.cjs`          |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/stayar-admin/postcss.config.js`           |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/stayar-backend/webpack.config.js`         |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/stayar-tenant/postcss.config.js`          |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `eslint.config.mjs`                             |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `libs/shared/theme/eslint.config.mjs`           |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `libs/shared/ui/postcss.config.js`              |
| `cf22597` | 2026-08-17 00:22 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `libs/stayar-api/eslint.config.mjs`             |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/landing-page/postcss.config.cjs`          |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/stayar-admin/postcss.config.js`           |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/stayar-backend-e2e/eslint.config.mjs`     |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/stayar-backend/webpack.config.js`         |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `apps/stayar-tenant/postcss.config.js`          |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `eslint.config.mjs`                             |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `libs/shared/theme/eslint.config.mjs`           |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `libs/shared/theme/src/lib/tailwind.config.js`  |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `libs/shared/ui/postcss.config.js`              |
| `e2edf0f` | 2026-08-17 14:11 | Praise Ogunleye <praiseleye.pl@gmail.com>        | `libs/stayar-api/eslint.config.mjs`             |
| `b2cab69` | 2026-08-27 14:08 | Biglad22 <emmanuelaberuagba22@gmail.com>         | `libs/shared/theme/src/lib/tailwind.config.cjs` |

---

### Swiftmedix

`git@github.com:swiftmedixtechnology/swiftmedix.git` — campaign ID `7-c1288`

**Infected files (17):**

- `apps/api-gateway-e2e/eslint.config.mjs`
- `apps/api-gateway/webpack.config.js`
- `apps/authenticator-ms/webpack.config.js`
- `apps/back-office-backend/webpack.config.js`
- `apps/back-office-frontend/postcss.config.js`
- `apps/consultant-backend/webpack.config.js`
- `apps/files-service-backend/webpack.config.js`
- `apps/individual-consultant-backend/webpack.config.js`
- `apps/logistics-ms/webpack.config.js`
- `apps/messaging/webpack.config.js`
- `apps/notification-service/webpack.config.js`
- `apps/payments/webpack.config.js`
- `apps/redis/webpack.config.js`
- `apps/store-backend/webpack.config.js`
- `eslint.config.mjs`
- `libs/nest-lib/eslint.config.mjs`
- `packages/util/eslint.config.mjs`

**Verify any of these:**

```bash
git show fc42da8b:apps/api-gateway-e2e/eslint.config.mjs | grep -qE "global\\.o *= *'7-" && echo INFECTED || echo clean
```

**Infecting commits (48):**

| Commit     | Date             | Committed by                              | File                                                   |
| ---------- | ---------------- | ----------------------------------------- | ------------------------------------------------------ |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/api-gateway-e2e/eslint.config.mjs`               |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/api-gateway/webpack.config.js`                   |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/authenticator-ms/webpack.config.js`              |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/back-office-backend/webpack.config.js`           |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/back-office-frontend/postcss.config.js`          |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/consultant-backend/webpack.config.js`            |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/files-service-backend/webpack.config.js`         |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/individual-consultant-backend/webpack.config.js` |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/messaging/webpack.config.js`                     |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/notification-service/webpack.config.js`          |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/payments/webpack.config.js`                      |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/redis/webpack.config.js`                         |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `apps/store-backend/webpack.config.js`                 |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `eslint.config.mjs`                                    |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `libs/nest-lib/eslint.config.mjs`                      |
| `fc42da8b` | 2026-05-30 16:30 | Biglad22 <emmanuelaberuagba22@gmail.com>  | `packages/util/eslint.config.mjs`                      |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/api-gateway-e2e/eslint.config.mjs`               |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/api-gateway/webpack.config.js`                   |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/authenticator-ms/webpack.config.js`              |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/back-office-backend/webpack.config.js`           |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/back-office-frontend/postcss.config.js`          |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/consultant-backend/webpack.config.js`            |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/files-service-backend/webpack.config.js`         |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/individual-consultant-backend/webpack.config.js` |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/messaging/webpack.config.js`                     |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/notification-service/webpack.config.js`          |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/payments/webpack.config.js`                      |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/redis/webpack.config.js`                         |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/store-backend/webpack.config.js`                 |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `eslint.config.mjs`                                    |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `libs/nest-lib/eslint.config.mjs`                      |
| `3f25a483` | 2026-06-11 19:24 | Praise Ogunleye <praiseleye.pl@gmail.com> | `packages/util/eslint.config.mjs`                      |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/api-gateway-e2e/eslint.config.mjs`               |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/api-gateway/webpack.config.js`                   |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/authenticator-ms/webpack.config.js`              |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/back-office-backend/webpack.config.js`           |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/back-office-frontend/postcss.config.js`          |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/files-service-backend/webpack.config.js`         |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/individual-consultant-backend/webpack.config.js` |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/logistics-ms/webpack.config.js`                  |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/messaging/webpack.config.js`                     |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/notification-service/webpack.config.js`          |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/payments/webpack.config.js`                      |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/redis/webpack.config.js`                         |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `apps/store-backend/webpack.config.js`                 |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `eslint.config.mjs`                                    |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `libs/nest-lib/eslint.config.mjs`                      |
| `edafd93a` | 2026-08-15 23:19 | Praise Ogunleye <praiseleye.pl@gmail.com> | `packages/util/eslint.config.mjs`                      |

---

### agromart

`git@github.com:thebuidl-grid/agromart-service.git` — campaign ID `7-c1289`

**Infected files (1):**

- `eslint.config.mjs`

**Verify any of these:**

```bash
git show d6aa995:eslint.config.mjs | grep -qE "global\\.o *= *'7-" && echo INFECTED || echo clean
```

**Infecting commits (15):**

| Commit    | Date             | Committed by                          | File                |
| --------- | ---------------- | ------------------------------------- | ------------------- |
| `d6aa995` | 2026-05-05 13:04 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `69eea39` | 2026-07-22 11:32 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `26617b9` | 2026-07-22 11:47 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `03216c4` | 2026-07-23 15:37 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `272bf97` | 2026-07-23 18:04 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `ed63ce0` | 2026-07-23 18:14 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `3e053b3` | 2026-07-23 18:29 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `301ee5f` | 2026-07-23 18:45 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `0dc7d9e` | 2026-07-24 11:07 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `3e276e9` | 2026-07-24 12:52 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `b68a4ca` | 2026-07-24 13:14 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `87c220e` | 2026-07-24 14:23 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |
| `42a49aa` | 2026-07-27 23:06 | macnelson9 <michaelofatu@gmail.com>   | `eslint.config.mjs` |
| `828d371` | 2026-07-28 12:19 | macnelson9 <michaelofatu@gmail.com>   | `eslint.config.mjs` |
| `6b94ec4` | 2026-07-28 20:53 | Akshola00 <akinniyishola07@gmail.com> | `eslint.config.mjs` |

---

## What to do if your scan finds something

1. **Stop building** in that repository — every build runs the payload.
2. **Report it** with the repo name and campaign ID, especially if the ID is one of the five
   missing ones.
3. **Clean the config files** — delete from `global.o` to end of file, and remove any injected
   `createRequire` shim at the top of `.mjs` files.
4. **Do not delete your lockfile.** No malicious npm package has been found. Un-pinning
   dependencies adds risk. Use `rm -rf node_modules && pnpm install --frozen-lockfile`.
5. **Rotate your credentials** — GitHub tokens, SSH keys, npm tokens, cloud logins, and
   anything in local `.env` files.
6. **Rebase your branches** onto a cleaned `main`/`develop` before your next build.

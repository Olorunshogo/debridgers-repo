#!/usr/bin/env bash
#
# EtherHiding backdoor scanner, machine level. Read-only: changes nothing.
#
# The repository scanner answers "is this project infected". This answers the
# question that matters more: "is this machine still writing the payload". The
# malware writes into a build config on disk, so a clean repository proves
# nothing about the source of the write.
#
# Covers, under $HOME by default:
#   every git repository, all objects, reachable and not
#   loose files outside any repository
#   node_modules trees, where a poisoned dependency would sit
#   the pnpm, npm and yarn caches, which survive a reinstall
#
# Usage:
#   bash scripts/scan-machine.sh                  # $HOME
#   bash scripts/scan-machine.sh ~/Projects ~/work
#
# Exit code 1 if anything is found.

set -uo pipefail

# === Signatures
#
# Assembled from fragments so this file cannot match itself. See the note in
# scan-backdoor.sh, which uses the same set.
SIG_MARK="global\.o[[:space:]]*=[[:space:]]*'7""-"
SIG_DESCRAMBLE='_\$_[0-9]{4}[[:space:]]*=[[:space:]]*\(function'
SIG_RPC_CALL="eth_get""BlockByNumber"
SIG_HOST_A="ethereum-rpc""\.publicnode\.com"
SIG_HOST_B="eth""\.drpc\.org"

# Only these two are proof. The RPC call and the two hosts below are ordinary
# JSON-RPC: every ethers, hardhat and web3 install carries them, and so does a
# browser wallet extension. On the first real run they produced about thirty
# false positives against zero true ones, so they no longer fail anything.
PATTERN="${SIG_MARK}|${SIG_DESCRAMBLE}"
WEAK_PATTERN="${SIG_RPC_CALL}|${SIG_HOST_A}|${SIG_HOST_B}"

# The detection tooling and its guide quote the markers by necessity.
SELF_RE="EtherHiding backdoor scanner|Verifying the Backdoor|scan-backdoor\.sh|scan-machine\.sh"

# Directories that are noise rather than signal. A dependency tree, a browser
# profile and the trash all contain legitimate web3 code, and none of them is
# where this campaign writes.
PRUNE_RE='/node_modules/|/\.Trash/|/\.local/share/Trash/|/BraveSoftware/|/google-chrome/|/chromium/|/\.mozilla/|/\.cache/|/\.pnpm-store/|/\.npm/|/\.nvm/'

ROOTS=("$@")
[ ${#ROOTS[@]} -eq 0 ] && ROOTS=("$HOME")

REPOS_SCANNED=0
REPOS_INFECTED=0
FILES_INFECTED=0

hr() { printf '%s\n' "------------------------------------------------------------"; }

# === Git repositories
#
# Whole object store per repository, not the checked-out branch. Four of the
# eight repositories in this campaign had clean working directories and were
# infected on branches nobody had checked out.

scan_repos() {
  local root="$1" gitdir repo hits
  while IFS= read -r gitdir; do
    repo="$(dirname "$gitdir")"
    REPOS_SCANNED=$((REPOS_SCANNED + 1))

    hits=$(git -C "$repo" cat-file --batch-all-objects --buffer --batch 2>/dev/null \
      | grep -acE "$PATTERN" || true)
    [ "${hits:-0}" -eq 0 ] && continue

    # Drop the tooling's own blobs before calling it a finding.
    local real=""
    while read -r sha; do
      git -C "$repo" cat-file blob "$sha" 2>/dev/null | grep -qaE "$SELF_RE" && continue
      real="$real $sha"
    done < <(git -C "$repo" cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype)' 2>/dev/null \
      | awk '$2 == "blob" { print $1 }' \
      | while read -r s; do
          git -C "$repo" cat-file blob "$s" 2>/dev/null | grep -qaE "$PATTERN" && echo "$s"
        done)

    [ -z "${real// /}" ] && continue

    REPOS_INFECTED=$((REPOS_INFECTED + 1))
    echo "INFECTED REPO  $repo"

    local named sha path
    named=$(git -C "$repo" rev-list --objects --all 2>/dev/null | awk 'NF > 1')
    for sha in $real; do
      path=$(printf '%s\n' "$named" | awk -v s="$sha" '$1 == s { $1=""; sub(/^ /,""); print; exit }')
      if [ -n "$path" ]; then
        echo "    file: $path"
        git -C "$repo" log --all --format='        %h  %ad  %an <%ae>' \
            --date=format:'%Y-%m-%d %H:%M' --diff-filter=AM -- "$path" 2>/dev/null | head -20
      else
        echo "    blob: $sha  (unreachable, left by a rebase or deleted branch)"
      fi
    done
  done < <(find "$root" -type d -name .git -prune 2>/dev/null)
}

# === Files on disk
#
# Outside git entirely, plus node_modules and the package caches. A repository
# rewrite does not touch any of these, and a reinstall restores from the cache.

scan_files() {
  local root="$1" f
  while IFS= read -r f; do
    printf '%s\n' "$f" | grep -qE "$PRUNE_RE" && continue
    grep -qaE "$SELF_RE" "$f" 2>/dev/null && continue
    echo "INFECTED FILE  $f"
    FILES_INFECTED=$((FILES_INFECTED + 1))
  done < <(
    grep -rlaE "$PATTERN" "$root" \
      --include='*.js'  --include='*.cjs' --include='*.mjs' \
      --include='*.ts'  --include='*.tsx' --include='*.mts' --include='*.cts' \
      --include='*.json' --include='*.yaml' --include='*.yml' --include='*.sh' \
      --exclude-dir=.git \
      2>/dev/null
  )
}

# === Run

echo "Scanning: ${ROOTS[*]}"
echo "This reads only. Nothing is modified or deleted."
hr

for root in "${ROOTS[@]}"; do
  [ -d "$root" ] || { echo "skip, not a directory: $root"; continue; }
  scan_repos "$root"
  scan_files "$root"
done

hr
printf 'repositories scanned : %s\n' "$REPOS_SCANNED"
printf 'repositories infected: %s\n' "$REPOS_INFECTED"
printf 'files infected       : %s\n' "$FILES_INFECTED"

if [ "$REPOS_INFECTED" -eq 0 ] && [ "$FILES_INFECTED" -eq 0 ]; then
  hr
  echo "Nothing found matching this campaign's markers."
  echo "That is not proof of safety: a variant with different strings passes."
  exit 0
fi

hr
cat <<'NEXT'
FOUND. Removing the files is the smaller half of this.

The payload is a loader that fetches and runs code from a remote host, so treat
everything readable by this account as taken, and rotate rather than inspect:

  SSH keys                 ~/.ssh, and their GitHub, GitLab and server copies
  GitHub and npm tokens    ~/.npmrc, ~/.config/gh, CI secrets
  .env files               every project, and the live values in the provider
  payment keys             Paystack in this project, live and test
  browser sessions         sign out everywhere, then change the password

For each infected repository, the blobs live in history and a rebase does not
remove them. Use scripts/clean-backdoor.sh there, then force-push, and tell
everyone to reset rather than pull.
NEXT
exit 1

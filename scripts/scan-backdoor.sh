#!/usr/bin/env bash
#
# EtherHiding backdoor scanner, repository level. Read-only: changes nothing.
#
# The payload writes itself into a build config file on disk, `git add` sweeps
# it up with real work, and it hides behind roughly 700 trailing spaces so an
# editor shows nothing and the diff reads as one changed line.
#
# A filesystem grep only covers the branch that happens to be checked out. Four
# of the eight repositories in this campaign passed a filesystem scan and were
# infected on other branches, so the default mode walks every object in the
# database instead, including unreachable ones left behind by a rebase.
#
# Modes:
#   --all                every object in the repository (default)
#   --staged             what `git commit` is about to record, for pre-commit
#   --range <A..B>       objects introduced by a range, for pre-push
#   --worktree           tracked files as they sit on disk right now
#   --strict             also fail on the contextual web3 signatures
#
# Exit code 1 if anything is found, so hooks and CI can gate on it.

set -euo pipefail

# === Signatures
#
# Split by strength, because they are not equally meaningful.
#
# DEFINITIVE: the campaign's own marker and its string descrambler. Nothing
# legitimate carries these.
#
# CONTEXTUAL: the JSON-RPC call and the two RPC hosts the loader uses to find
# its payload. Every ethers, hardhat and web3 install on earth also contains
# them, and a browser wallet extension matches on all three. Treating these as
# proof produced about thirty false positives on the first real run, which is
# precisely how a scanner gets ignored.
#
# Assembled from fragments so this file cannot match itself.
SIG_MARK="global\.o[[:space:]]*=[[:space:]]*'7""-"
SIG_DESCRAMBLE='_\$_[0-9]{4}[[:space:]]*=[[:space:]]*\(function'
SIG_RPC_CALL="eth_get""BlockByNumber"
SIG_HOST_A="ethereum-rpc""\.publicnode\.com"
SIG_HOST_B="eth""\.drpc\.org"

# What a finding means. Only these fail the run.
PATTERN="${SIG_MARK}|${SIG_DESCRAMBLE}"
# Worth a look, never a failure on its own.
WEAK_PATTERN="${SIG_RPC_CALL}|${SIG_HOST_A}|${SIG_HOST_B}"

# --strict promotes the contextual set, for a repository that has no business
# touching a blockchain at all. This one does not, so it is not the default.
STRICT=0

# The detection tooling and its documentation quote the markers by necessity.
is_self() {
  case "$1" in
    scripts/scan-backdoor.sh|scripts/scan-machine.sh|\
    docs/scan-git-history.py|docs/VERIFY-AND-SCAN-GUIDE.md) return 0 ;;
    *) return 1 ;;
  esac
}

# A blob with no reachable path is judged by content instead.
is_self_blob() {
  git cat-file blob "$1" 2>/dev/null \
    | grep -qaE "EtherHiding backdoor scanner|Verifying the Backdoor|scan-backdoor\.sh"
}

MODE="all"
RANGE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --all)      MODE="all" ;;
    --staged)   MODE="staged" ;;
    --worktree) MODE="worktree" ;;
    --range)    MODE="range"; RANGE="${2:-}"; shift ;;
    --strict)   STRICT=1 ;;
    -h|--help)  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)          echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

[ "$STRICT" -eq 1 ] && PATTERN="${PATTERN}|${WEAK_PATTERN}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "not a git repository" >&2
  exit 2
fi

REPO_NAME="$(basename "$(git rev-parse --show-toplevel)")"
FOUND=0

# === Reporting

report_blob() {
  # A blob matched. Name the paths it was ever stored under, and the commits
  # that carry it, so the finding can be verified by hand rather than trusted.
  local sha="$1" path="$2"
  echo "    file: $path"
  git log --all --format='        %h  %ad  %an <%ae>' --date=format:'%Y-%m-%d %H:%M' \
      --diff-filter=AM -- "$path" 2>/dev/null \
    | head -40
}

# === Modes

scan_all() {
  # Pass one: stream every object through a single grep. This is a yes or no in
  # a second or two, and it covers unreachable objects that `rev-list` cannot
  # see, which is where a rebased-away infection survives.
  local hits total
  hits=$(git cat-file --batch-all-objects --buffer --batch 2>/dev/null \
    | grep -acE "$PATTERN" || true)
  total=$(git cat-file --batch-all-objects --batch-check 2>/dev/null | wc -l)

  if [ "${hits:-0}" -eq 0 ]; then
    printf 'CLEAN     %s  (%s objects checked)\n' "$REPO_NAME" "$total"
    return 0
  fi

  # Pass two: only now is it worth naming blobs. The tooling and the guide quote
  # the markers, so their blobs are dropped here rather than reported forever.
  local infected self_seen=0
  infected=$(git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype)' 2>/dev/null \
    | awk '$2 == "blob" { print $1 }' \
    | while read -r sha; do
        if git cat-file blob "$sha" 2>/dev/null | grep -qaE "$PATTERN"; then echo "$sha"; fi
      done)

  local named real=""
  named=$(git rev-list --objects --all 2>/dev/null | awk 'NF > 1')

  local sha path
  for sha in $infected; do
    if is_self_blob "$sha"; then
      self_seen=$((self_seen + 1))
      continue
    fi
    real="$real $sha"
  done

  if [ -z "${real// /}" ]; then
    printf 'CLEAN     %s  (%s objects checked, %s tooling blob(s) skipped)\n' \
      "$REPO_NAME" "$total" "$self_seen"
    return 0
  fi

  printf 'INFECTED  %s  (%s objects checked)\n' "$REPO_NAME" "$total"
  FOUND=1
  for sha in $real; do
    path=$(printf '%s\n' "$named" | awk -v s="$sha" '$1 == s { $1=""; sub(/^ /,""); print; exit }')
    if [ -n "$path" ]; then
      report_blob "$sha" "$path"
    else
      # Unreachable: left behind by a rebase, amend or deleted branch. It is
      # still in the database, still pushable, and still fetchable by SHA.
      echo "    blob: $sha  (UNREACHABLE - no ref points at it; a rebase or deleted branch left it)"
    fi
  done
}

scan_staged() {
  local bad=0 f
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    is_self "$f" && continue
    if git show ":$f" 2>/dev/null | grep -qaE "$PATTERN"; then
      echo "INFECTED  staged: $f"
      bad=1
    fi
  done < <(git diff --cached --name-only --diff-filter=ACM)

  if [ "$bad" -eq 1 ]; then
    FOUND=1
  else
    echo "CLEAN     staged changes"
  fi
}

scan_range() {
  [ -n "$RANGE" ] || { echo "--range needs A..B" >&2; exit 2; }
  local bad=0
  while read -r sha path; do
    [ -n "${path:-}" ] || continue
    is_self "$path" && continue
    if git cat-file blob "$sha" 2>/dev/null | grep -qaE "$PATTERN"; then
      echo "INFECTED  $path  (blob $sha)"
      bad=1
    fi
  done < <(git rev-list --objects "$RANGE" 2>/dev/null)

  if [ "$bad" -eq 1 ]; then
    FOUND=1
  else
    echo "CLEAN     range $RANGE"
  fi
}

scan_worktree() {
  local bad=0 f
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    is_self "$f" && continue
    if grep -qaE "$PATTERN" "$f" 2>/dev/null; then
      echo "INFECTED  worktree: $f"
      bad=1
    fi
  done < <(git ls-files)

  if [ "$bad" -eq 1 ]; then
    FOUND=1
  else
    echo "CLEAN     working tree"
  fi
}

case "$MODE" in
  all)      scan_all ;;
  staged)   scan_staged ;;
  range)    scan_range ;;
  worktree) scan_worktree ;;
esac

if [ "$FOUND" -eq 1 ]; then
  cat >&2 <<'WARN'

This matches the markers of one known campaign. It is a tripwire, not proof of
safety: a variant with different strings passes it unnoticed.

Do not push. See docs/VERIFY-AND-SCAN-GUIDE.md, and run scripts/scan-machine.sh
over the rest of this machine, because the source of the write is the machine
rather than the repository.
WARN
  exit 1
fi

exit 0

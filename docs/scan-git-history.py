#!/usr/bin/env python3
"""
EtherHiding backdoor scanner - GIT HISTORY level.

A filesystem scan only checks the branch you have checked out RIGHT NOW.
This checks every blob in every branch, tag and commit in the repository.
Four repositories that passed a filesystem scan were found infected by this one.

Usage:
    python3 scan-git-history.py                  # scan repo in current directory
    python3 scan-git-history.py /path/to/repo
    python3 scan-git-history.py ~/code/*/        # scan many repos

Exit code 1 if anything is found.
"""
import subprocess, sys, re, os, glob

EXTS = ('.js', '.cjs', '.mjs', '.ts', '.tsx', '.mts', '.cts',
        '.json', '.yaml', '.yml', '.sh')

# global.o='7-xxxx'  (both spacings) | the decoder | the blockchain C2 calls
PATTERN = re.compile(
    rb"global\.o\s*=\s*'7-"
    rb"|_\$_\d{4}\s*=\s*\(function"
    rb"|eth_getBlockByNumber"
    rb"|ethereum-rpc\.publicnode\.com"
    rb"|eth\.drpc\.org"
)

def scan(repo):
    repo = os.path.abspath(os.path.expanduser(repo))
    if not os.path.isdir(os.path.join(repo, '.git')):
        return None
    try:
        objs = subprocess.run(['git', 'rev-list', '--objects', '--all'],
                              cwd=repo, capture_output=True, text=True,
                              errors='replace', timeout=600).stdout
    except Exception as e:
        print(f"  ! {repo}: {e}")
        return None
    blob2path = {}
    for line in objs.split('\n'):
        if ' ' not in line:
            continue
        sha, path = line.split(' ', 1)
        if path.endswith(EXTS):
            blob2path.setdefault(sha, set()).add(path)
    if not blob2path:
        return (0, {})
    p = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=repo,
                         stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    p.stdin.write(('\n'.join(blob2path) + '\n').encode())
    p.stdin.close()
    bad, out = {}, p.stdout
    while True:
        hdr = out.readline()
        if not hdr:
            break
        parts = hdr.split()
        if len(parts) < 3:
            continue
        sha, typ, size = parts[0].decode(), parts[1].decode(), int(parts[2])
        data = out.read(size); out.read(1)
        if typ == 'blob' and PATTERN.search(data):
            bad[sha] = sorted(blob2path.get(sha, []))
    p.wait()
    return (len(blob2path), bad)

def commits_for(repo, path, blobs):
    """Which commits carry an infected version of this path."""
    hits = []
    log = subprocess.run(
        ['git', 'log', '--all', '--format=%H|%h|%ad|%an <%ae>',
         '--date=format:%Y-%m-%d %H:%M', '--diff-filter=AM', '--', path],
        cwd=repo, capture_output=True, text=True, errors='replace').stdout
    for line in log.strip().split('\n'):
        if not line:
            continue
        full, short, date, who = line.split('|', 3)
        blob = subprocess.run(['git', 'rev-parse', f'{full}:{path}'],
                              cwd=repo, capture_output=True, text=True).stdout.strip()
        if blob in blobs:
            hits.append((short, date, who))
    return hits

def main():
    targets = sys.argv[1:] or ['.']
    expanded = []
    for t in targets:
        expanded.extend(glob.glob(os.path.expanduser(t)) or [t])
    found_any = False
    for repo in expanded:
        r = scan(repo)
        if r is None:
            continue
        n, bad = r
        name = os.path.basename(os.path.abspath(repo)) or repo
        if not bad:
            print(f"CLEAN     {name}  ({n} blobs checked)")
            continue
        found_any = True
        paths = sorted({p for ps in bad.values() for p in ps})
        print(f"INFECTED  {name}  ({len(bad)} infected blobs of {n} checked)")
        for path in paths:
            print(f"    file: {path}")
            for short, date, who in commits_for(repo, path, set(bad)):
                print(f"        {short}  {date}  {who}")
    sys.exit(1 if found_any else 0)

if __name__ == '__main__':
    main()

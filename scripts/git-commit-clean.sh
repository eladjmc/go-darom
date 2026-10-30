#!/usr/bin/env bash
# Commit with a message file, then strip any injected Co-authored-by / trailers.
set -euo pipefail
MSG_FILE="${1:?usage: git-commit-clean.sh /path/to/msg.txt}"
if [[ ! -f "$MSG_FILE" ]]; then
  echo "message file not found: $MSG_FILE" >&2
  exit 1
fi

git commit -F "$MSG_FILE"

CLEANED="$(git log -1 --pretty=%B | sed -E '/^[[:space:]]*Co-authored-by:/Id; /^[[:space:]]*Signed-off-by:[[:space:]]*Cursor/Id')"
# Drop trailing blank lines
CLEANED="$(printf '%s\n' "$CLEANED" | awk 'n==1 && NF==0 { next } { if (NF) { for(i=1;i<=n;i++) print b[i]; n=0; print } else { n++; b[n]=$0 } }')"
ORIG="$(git log -1 --pretty=%B)"
if [[ "$CLEANED" != "$ORIG" ]]; then
  printf '%s\n' "$CLEANED" > "${MSG_FILE}.cleaned"
  git commit --amend -F "${MSG_FILE}.cleaned"
  rm -f "${MSG_FILE}.cleaned"
fi

if git log -1 --pretty=%B | grep -qiE '^[[:space:]]*Co-authored-by:.*[Cc]ursor'; then
  echo "ERROR: Cursor co-author trailer still present after clean amend" >&2
  exit 1
fi

git log -1 --pretty=full

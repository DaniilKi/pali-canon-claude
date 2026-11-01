#!/usr/bin/env bash
# Model-level evaluation with the Codex CLI (issue #48): asks each question with `codex exec`, with this
# repository's MCP server configured, saves the final answers and grades them by checking that every expected
# citation (and every answer_must_match pattern) appears. Needs Codex, a signed-in account and network; it
# costs model usage, so CI does not run it.
#
#   evals/codex/run.sh [--category c] [--all] [--model m]
#
# STATUS (2026-11-01): written from the Codex CLI's documented `codex exec` options (-c config overrides,
# --output-last-message, --sandbox, --skip-git-repo-check) but NOT run here (no Codex CLI on the machine that
# wrote it). If your Codex version names an option differently, adjust CODEX_ARGS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PROMPT_ARGS=()
MODEL_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --category) PROMPT_ARGS+=("$1" "$2"); shift 2 ;;
    --all) PROMPT_ARGS+=("$1"); shift ;;
    --model) MODEL_ARGS+=(--model "$2"); shift 2 ;;
    *) echo "Unknown option $1" >&2; exit 2 ;;
  esac
done

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="evals/codex/results/$STAMP"
mkdir -p "$OUT/answers"
node evals/model-grading.mjs prompts "$OUT/prompts" "${PROMPT_ARGS[@]+"${PROMPT_ARGS[@]}"}"

SERVER="$ROOT/server/index.cjs"
# Git Bash on Windows: give Codex a C:/... path rather than /c/...
if command -v cygpath > /dev/null 2>&1; then SERVER="$(cygpath -m "$SERVER")"; fi
CODEX_ARGS=(
  --skip-git-repo-check
  --sandbox read-only
  -c 'approval_policy="never"'
  -c 'mcp_servers.pali-canon.command="node"'
  -c "mcp_servers.pali-canon.args=[\"$SERVER\"]"
  -c 'mcp_servers.pali-canon.startup_timeout_sec=60'
)

for prompt in "$OUT"/prompts/*.txt; do
  id="$(basename "$prompt" .txt)"
  echo "== $id"
  if ! codex exec "${CODEX_ARGS[@]}" "${MODEL_ARGS[@]+"${MODEL_ARGS[@]}"}" \
      --output-last-message "$OUT/answers/$id.md" "$(cat "$prompt")" > "$OUT/answers/$id.log" 2>&1; then
    echo "   codex exec failed (see $OUT/answers/$id.log); the question is graded on whatever answer was saved" >&2
    [ -f "$OUT/answers/$id.md" ] || : > "$OUT/answers/$id.md"
  fi
done

node evals/model-grading.mjs grade "$OUT/answers" --json "$OUT/grades.json" | tee "$OUT/scores.txt"

#!/usr/bin/env bash
# Model-level evaluation with Claude Code's plugin eval (issue #48). Needs Claude Code (v2.1.269 or later per
# the docs), a signed-in account and network; it costs model usage, so CI does not run it.
#
#   evals/claude-plugin-eval/run.sh [--category c] [--runs n] [--all] [-- extra claude plugin eval flags]
#
# What it does:
#   1. node evals/claude-plugin-eval/build.mjs writes one case per question to evals/claude-plugin-eval/cases/
#      (prompt.md + regex graders: every expected citation, and every answer_must_match pattern, must appear
#      in Claude's final answer). Questions that need a tool that is not registered yet are left out unless --all.
#   2. claude plugin eval runs those cases against this repository as a plugin, with the real MCP server.
#
# STATUS (2026-11-01): the case format follows https://code.claude.com/docs/en/plugin-evals. The flags below
# for using the real server instead of recorded mocks (--mocks off, --allow-real-servers) and the MCP tool
# grant (--allow-tools with the plugin's tool prefix) are from the same page but have NOT been run here (no
# Claude Code CLI on the machine that wrote this). Check `claude plugin eval --help` before relying on it,
# and adjust PALI_TOOLS if your build names plugin MCP tools differently.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BUILD_ARGS=()
EVAL_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --category|--runs) BUILD_ARGS+=("$1" "$2"); shift 2 ;;
    --all) BUILD_ARGS+=("$1"); shift ;;
    --) shift; EVAL_ARGS+=("$@"); break ;;
    *) EVAL_ARGS+=("$1"); shift ;;
  esac
done

node evals/claude-plugin-eval/build.mjs "${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"}"

PALI_TOOLS="${PALI_TOOLS:-mcp__plugin_pali-canon_pali-canon__*}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="evals/claude-plugin-eval/cases/results/$STAMP"

claude plugin eval . \
  --eval-dir evals/claude-plugin-eval/cases \
  --trust-plugin \
  --ablation none \
  --mocks off \
  --allow-real-servers \
  --allow-tools "$PALI_TOOLS" \
  --threshold 1 \
  --no-publish \
  --output-dir "$OUT" \
  --json "$OUT/results.json" \
  "${EVAL_ARGS[@]+"${EVAL_ARGS[@]}"}"

echo "Results: $OUT (aggregate-result.json, report.html). Per-case score = share of graders passed."

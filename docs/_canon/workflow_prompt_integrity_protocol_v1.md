# Workflow - Prompt Integrity Protocol (v1)

## Purpose
Prevent small prompt drift, missing text on copy/paste, and hidden characters - especially in prompts that can change code/files.

## Principle
Do not rely on "same prompt" or memory.
Every execution-critical prompt must be verifiable.

## Prompt Types
### 1) Low-risk (Disposable)
- Questions, clarifications, short text.
- No verification required.

### 2) Execution-Critical
Any prompt that can:
- create/modify/delete files
- generate or refactor code
- run in Cursor Agent/Plan with actions
- change architecture, data model, or workflows

Verification required (Prompt Header + Fingerprint).

### 3) Reusable Standard
- Bootstraps, recurring templates, team rules.
- Store as a file in the repo (single source of truth) and reference by path.

## Required Header for Execution-Critical Prompts
Every execution-critical prompt starts with:

PROMPT_ID: <unique_id>
TARGET: <Cursor Ask|Plan|Agent>
GOAL: <one sentence>
SCOPE: <what may change>
DO_NOT: <hard constraints>
INPUTS: <exact files/paths assumed>
OUTPUT: <exact expected format>
CHARS: <number_of_characters>
SHA256: <hash_of_prompt_text>

Notes:
- PROMPT_ID must be unique and stable.
- CHARS and SHA256 are calculated over the full prompt text as copied.

## Verification Before Running (macOS)
After copying the prompt into clipboard:

- Character count:
  pbpaste | wc -c

- Content hash:
  pbpaste | shasum -a 256

Compare results to CHARS and SHA256 in the header.
If mismatch - do not run. Re-copy from source.

## Hidden Character Hygiene
Symptoms:
- terminal shows "command not found" for a command that looks correct
- strange symbols appear at the start of pasted commands

Rules:
- For terminal commands, prefer typing the first token manually (e.g., `export`, `ls`, `git`).
- Avoid pasting from RTL sources into terminal.
- If needed for troubleshooting:
  export LC_ALL=C

## Where Prompts Live
- Reusable Standard prompts live in the repo under `docs/prompts/` (or `docs/_canon/` for policy files).
- Execution-Critical prompts are either:
  - stored in repo (preferred), or
  - delivered in chat with full header + fingerprint.

## Accountability
- Yasmin: ensures any execution-critical prompt I provide includes the required header.
- Tomer (Tech Lead): delivers Cursor prompts in the required format when they are execution-critical.
- Roee: verifies clipboard fingerprint before running execution-critical prompts, especially long ones.

## Versioning
This protocol is versioned.
Changes require a commit with a short rationale in the commit message.

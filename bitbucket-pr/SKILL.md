---
name: bitbucket-pr
description: >
  Creates Bitbucket pull requests from a local git repository using the Bitbucket REST API.
  Use this skill whenever the user wants to open, create, or raise a PR/pull request on Bitbucket,
  push their branch for review, or says things like "create a PR", "open a pull request", "raise a PR",
  "submit my branch for review", or "push this for review". Also triggers when the user asks Claude
  to summarize their changes and submit them. Handles source branch auto-detection, destination branch
  selection, title generation from commit messages, and description generation from the diff.
---

# Bitbucket PR Skill

Creates a Bitbucket pull request from the current local git repo using the REST API v2.

**Credential safety**: credentials are NEVER read into the model's context. A local helper
script handles all authentication internally. Claude only passes non-sensitive parameters
(branch names, title, description) to that script.

---

## Step 0 — Ensure helper script exists

Check whether `~/.local/bin/bitbucket-create-pr` exists:

```bash
test -f ~/.local/bin/bitbucket-create-pr && echo "exists" || echo "missing"
```

If **missing**, create it:

```bash
mkdir -p ~/.local/bin
cat > ~/.local/bin/bitbucket-create-pr << 'SCRIPT'
#!/usr/bin/env bash
# bitbucket-create-pr — called by the bitbucket-pr Claude skill.
# Credentials are read from the config file here, inside this script,
# so they are NEVER exposed to the model's context.
#
# Usage: bitbucket-create-pr <source-branch> <dest-branch> <title> <description>

set -euo pipefail

SOURCE_BRANCH="${1:?source branch required}"
DEST_BRANCH="${2:?dest branch required}"
TITLE="${3:?title required}"
DESCRIPTION="${4:?description required}"

# Config lookup: explicit env var > repo-local .bitbucket.json > ~/.bitbucket.json
if [[ -n "${BITBUCKET_CONFIG:-}" ]]; then
  CONFIG="$BITBUCKET_CONFIG"
elif [[ -f "$(git rev-parse --show-toplevel 2>/dev/null)/.bitbucket.json" ]]; then
  CONFIG="$(git rev-parse --show-toplevel)/.bitbucket.json"
else
  CONFIG="$HOME/.bitbucket.json"
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "ERROR: config file not found." >&2
  echo "Create .bitbucket.json in your repo root (or ~/.bitbucket.json as a fallback):" >&2
  echo "{\"username\":\"…\",\"app_password\":\"…\",\"workspace\":\"…\",\"repo_slug\":\"…\"}" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required. Install with: brew install jq" >&2
  exit 1
fi

USERNAME=$(jq -r '.username'     "$CONFIG")
PASSWORD=$(jq -r '.app_password' "$CONFIG")
WORKSPACE=$(jq -r '.workspace'   "$CONFIG")
REPO_SLUG=$(jq -r '.repo_slug'   "$CONFIG")

PAYLOAD=$(jq -n \
  --arg title  "$TITLE" \
  --arg desc   "$DESCRIPTION" \
  --arg src    "$SOURCE_BRANCH" \
  --arg dst    "$DEST_BRANCH" \
  '{
    title: $title,
    description: $desc,
    source: { branch: { name: $src } },
    destination: { branch: { name: $dst } },
    close_source_branch: false
  }')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -u "${USERNAME}:${PASSWORD}" \
  -H "Content-Type: application/json" \
  "https://api.bitbucket.org/2.0/repositories/${WORKSPACE}/${REPO_SLUG}/pullrequests" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" == "201" ]]; then
  PR_URL=$(echo "$BODY" | jq -r '.links.html.href')
  echo "PR created: $PR_URL"
else
  echo "ERROR: HTTP $HTTP_CODE" >&2
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY" >&2
  exit 1
fi
SCRIPT

chmod +x ~/.local/bin/bitbucket-create-pr
echo "Helper script created."
```

Then check whether the config file exists (do NOT read its contents — only check presence).
The script looks for config in this order: `$BITBUCKET_CONFIG` → repo-root `.bitbucket.json` → `~/.bitbucket.json`.

```bash
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -n "${BITBUCKET_CONFIG:-}" ]]; then
  test -f "$BITBUCKET_CONFIG" && echo "config found at $BITBUCKET_CONFIG" || echo "config missing"
elif [[ -n "$REPO_ROOT" ]] && test -f "$REPO_ROOT/.bitbucket.json"; then
  echo "config found at $REPO_ROOT/.bitbucket.json"
else
  test -f "$HOME/.bitbucket.json" && echo "config found at ~/.bitbucket.json" || echo "config missing"
fi
```

If **config missing**, show the user this template and ask them to fill it in. Do NOT ask them to paste the values into the chat — they should edit the file directly.

```
<repo-root>/.bitbucket.json   ← preferred: one file per repo
──────────────────────────────
{
  "username": "your-bitbucket-username",
  "app_password": "your-app-password",
  "workspace": "your-workspace-slug",
  "repo_slug": "your-repo-slug"
}
```

> The `app_password` needs **Repositories: Read + Write** scope.
> Add `.bitbucket.json` to the repo's `.gitignore` (and `~/.gitignore_global`) to avoid committing it.
> Set `BITBUCKET_CONFIG=/path/to/other.json` to override the lookup entirely.

---

## Step 1 — Gather git context

Run these commands in the repo root:

```bash
# Current (source) branch
git rev-parse --abbrev-ref HEAD

# Commits ahead of destination branch (default: develop)
git log origin/develop..HEAD --oneline

# Full diff vs destination branch
git diff origin/develop...HEAD
```

- **Source branch**: whatever `HEAD` resolves to. Abort if it's `develop`, `main`, or `master`.
- **Destination branch**: default is `develop`. Use what the user specifies if given.
- If there are **no commits ahead**, warn the user and stop.

---

## Step 2 — Generate title and description

**Title** — from commit messages:
- One commit: use its subject line directly.
- Multiple commits: write a single concise sentence (≤72 chars) summarising what they collectively achieve.

**Description** — from the diff:
Write a clear markdown description covering:
1. **What changed** — plain-English summary (2–5 sentences)
2. **Why** — infer from commit messages if possible
3. **Testing notes** — brief placeholder if not obvious

Keep the description under ~300 words.

---

## Step 3 — Confirm with user

Display a summary for review before creating the PR:

```
Ready to create PR

  From : feature/my-branch
  Into : develop
  Title: <generated title>

  Description:
  <generated description>

Proceed? (yes / edit title / edit description / cancel)
```

Wait for confirmation. Apply edits and confirm again if requested.

---

## Step 4 — Push branch (if needed)

Check if the source branch has a remote tracking branch:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

If no upstream, push it:

```bash
git push -u origin <source-branch>
```

---

## Step 5 — Create the PR

Call the helper script with only non-sensitive parameters. Credentials are read inside
the script and never appear in this command or the model's context.

```bash
~/.local/bin/bitbucket-create-pr \
  "<source-branch>" \
  "<destination-branch>" \
  "<title>" \
  "<description>"
```

- On success: display the PR URL from the script's output. Done.
- On error: show the error output and suggest fixes (see Troubleshooting).

---

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `config file not found` | Config missing | Create `~/.bitbucket.json` as shown in Step 0 |
| `jq is required` | jq not installed | Run `brew install jq` |
| HTTP 401 Unauthorized | Wrong credentials | Edit `~/.bitbucket.json`; regenerate app password |
| HTTP 404 Not Found | Wrong workspace/repo slug | Check slugs match Bitbucket URL |
| HTTP 400 – source branch not found | Branch not pushed | Step 4 should handle this; re-push manually |
| HTTP 400 – PR already exists | Duplicate PR | Check Bitbucket for an open PR on this branch |
| No commits ahead | Branch not diverged | Make commits first, or verify you're on the right branch |

---

## Notes

- This skill uses **Bitbucket Cloud** REST API v2. It does **not** support Bitbucket Server/Data Center.
- SSH is used by git for push; the REST API uses the app password from the config file.
- `close_source_branch` defaults to `false` — edit the helper script to change this.
- To use a non-default config location: `export BITBUCKET_CONFIG=/path/to/config.json`

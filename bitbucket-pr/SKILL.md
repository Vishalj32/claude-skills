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

**Credential safety**: Credentials are NEVER read by the model. A bundled Node.js script (`scripts/create-pr.js`, installed alongside this skill) handles all authentication internally. The model only passes non-sensitive parameters (branch names, title, description) to that script.

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

Call the bundled Node.js script with only non-sensitive parameters. Credentials are loaded securely inside the script and never appear in the model's context.

```bash
node ~/.claude/skills/bitbucket-pr/scripts/create-pr.js \
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
| `config file not found` | Config missing | Create `.bitbucket.json` as shown in Configuration section |
| `Failed to parse config file` | Invalid JSON | Check `.bitbucket.json` syntax |
| `config file missing required fields` | Missing fields | Verify all 4 fields (username, app_password, workspace, repo_slug) are present |
| HTTP 401 Unauthorized | Wrong credentials | Regenerate app password in Bitbucket; update `.bitbucket.json` |
| HTTP 404 Not Found | Wrong workspace/repo slug | Verify slugs match your Bitbucket URL |
| HTTP 400 – source branch not found | Branch not pushed | Ensure branch is pushed to remote (Step 4 should handle this) |
| HTTP 400 – PR already exists | Duplicate PR | Check Bitbucket for an existing open PR on this branch |
| No commits ahead | Branch not diverged | Make commits first or verify you're on the correct branch |
| `ENOENT` or script not found | Script missing | Ensure `~/.claude/skills/bitbucket-pr/scripts/create-pr.js` exists |

---

## Notes

- This skill uses **Bitbucket Cloud** REST API v2. It does **not** support Bitbucket Server/Data Center.
- SSH is used by git for push; the REST API uses the app password from the config file.
- `close_source_branch` defaults to `false` — edit the script if you need to change this.
- To use a non-default config location: `export BITBUCKET_CONFIG=/path/to/config.json`

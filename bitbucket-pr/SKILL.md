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
Auth is via SSH (for git operations) and a `.bitbucket.json` config file for API credentials.

---

## Step 0 — Load config

Look for `.bitbucket.json` in the repo root (or `~/.bitbucket.json` as fallback).

Expected shape:
```json
{
  "username": "your-bitbucket-username",
  "app_password": "your-app-password",
  "workspace": "your-workspace-slug",
  "repo_slug": "your-repo-slug"
}
```

> **If the file is missing**, tell the user and show the template above. Ask them to create it.
> The `app_password` must have **Repositories: Read + Write** scope in Bitbucket settings.
> SSH is used only for the local git remote — the REST API uses the app password.

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

- **Source branch**: whatever `HEAD` resolves to. Abort if it's `develop`, `main`, or `master` — the user should not PR from the default branch.
- **Destination branch**: default is `develop`. If the user specifies another target, use that.
- If there are **no commits ahead**, warn the user and stop — there's nothing to PR.

---

## Step 2 — Generate title and description

**Title** — from commit messages:
- If there's one commit: use its subject line directly.
- If there are multiple commits: ask Claude to write a single concise sentence (≤72 chars) summarising what the commits collectively achieve. Do NOT just list them.

**Description** — from the diff:
Ask Claude to write a clear markdown description covering:
1. **What changed** — a plain-English summary of the diff (2–5 sentences)
2. **Why** — infer from commit messages if possible
3. **Testing notes** — brief placeholder if not obvious from context

Keep the description under ~300 words.

---

## Step 3 — Confirm with user

Before creating the PR, display a summary for the user to review:

```
📦 Ready to create PR

  From : feature/my-branch
  Into : develop
  Title: <generated title>

  Description:
  <generated description>

Proceed? (yes / edit title / edit description / cancel)
```

Wait for confirmation. If the user wants edits, apply them and confirm again.

---

## Step 4 — Push branch (if needed)

Check if the source branch has a remote tracking branch:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

If there's no upstream, push it:

```bash
git push -u origin <source-branch>
```

---

## Step 5 — Create the PR via REST API

```bash
curl -s -X POST \
  -u "<username>:<app_password>" \
  -H "Content-Type: application/json" \
  "https://api.bitbucket.org/2.0/repositories/<workspace>/<repo_slug>/pullrequests" \
  -d '{
    "title": "<title>",
    "description": "<description>",
    "source": { "branch": { "name": "<source-branch>" } },
    "destination": { "branch": { "name": "<destination-branch>" } },
    "close_source_branch": false
  }'
```

- On **HTTP 201**: extract and display the PR URL from `response.links.html.href`. Done ✅
- On **HTTP 4xx/5xx**: show the error body and suggest fixes (see Troubleshooting below).

---

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| 401 Unauthorized | Wrong app_password or username | Check `.bitbucket.json`; regenerate app password |
| 404 Not Found | Wrong workspace/repo slug | Check slugs match Bitbucket URL |
| 400 Bad Request – source branch not found | Branch not pushed | Step 4 should handle this; re-push manually |
| 400 – PR already exists | Duplicate PR | Link to the existing PR if returned in error |
| No commits ahead | Branch not diverged from destination | Make commits first, or check you're on the right branch |

---

## Notes

- This skill uses **Bitbucket Cloud** REST API v2. It does **not** support Bitbucket Server/Data Center (different API base URL and auth).
- SSH is used by git for push; the REST API always uses the app password from config.
- `close_source_branch` defaults to `false` — adjust if the user prefers auto-deletion after merge.

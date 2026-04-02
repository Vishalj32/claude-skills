# bitbucket-pr

A Claude Code skill that creates Bitbucket Cloud pull requests directly from your local git repo.

## Credential safety

Credentials are **never read into the model's context**. A bundled Node.js script (`scripts/create-pr.js`)
reads your config file and makes the API call entirely within that script. Claude only passes
non-sensitive parameters (branch names, PR title, description) to the script — your username
and app password are never visible in the conversation.

## What it does

Invoke `/bitbucket-pr` (or just ask Claude to "create a PR" / "raise a pull request") and the skill will:

1. Verify your config file exists (without reading its contents)
2. Detect your current branch and compare it against the destination branch
3. Auto-generate a PR title (from commit messages) and description (from the diff)
4. Let you review and edit both before submitting
5. Push the branch if it hasn't been pushed yet
6. Call the bundled `scripts/create-pr.js` with non-sensitive params — credentials stay in the script
7. Return the PR URL

## Setup

Create `.bitbucket.json` in the **root of each repo** (recommended — different repos have different slugs):

```json
{
  "username": "your-bitbucket-username",
  "app_password": "your-app-password",
  "workspace": "your-workspace-slug",
  "repo_slug": "your-repo-slug"
}
```

The skill resolves config in this order:
1. `$BITBUCKET_CONFIG` (env var override)
2. `.bitbucket.json` in the repo root ← **default for per-repo setup**
3. `~/.bitbucket.json` (global fallback)

> Add `.bitbucket.json` to your repo's `.gitignore` and `~/.gitignore_global`. It contains credentials.

### Getting an app password

1. Go to **Bitbucket** → your avatar → **Personal settings** → **App passwords**
2. Click **Create app password**
3. Label it (e.g. `claude-code`)
4. Enable **Repositories: Read** and **Repositories: Write**
5. Save the generated password into `~/.bitbucket.json`

Do **not** paste your app password into the Claude Code chat — fill the file directly in your editor.

## Usage

```
/bitbucket-pr
```

Or naturally:

```
create a PR into develop
raise a PR — target the staging branch
open a pull request with the changes on this branch
```

The skill defaults to `develop` as the destination branch. Specify a different target in your
request to override it.

To use a non-default config location:

```bash
export BITBUCKET_CONFIG=/path/to/other.json
```

## Requirements

- Git repo with a Bitbucket Cloud remote
- `.bitbucket.json` in the repo root (or `~/.bitbucket.json` as a global fallback), filled in by you — not Claude
- Node.js installed (`brew install node`)
- At least one commit ahead of the destination branch
- Bitbucket Cloud (not Bitbucket Server/Data Center)

## Installation

Install via Claude Code:

```bash
claude skill install bitbucket-pr
```

Or copy the `bitbucket-pr/` directory (including `SKILL.md` and `scripts/`) into `~/.claude/skills/`.

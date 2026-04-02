# bitbucket-pr

A Claude Code skill that creates Bitbucket Cloud pull requests directly from your local git repo.

## Credential safety

Credentials are **never read into the model's context**. On first run, the skill installs a local
helper script (`~/.local/bin/bitbucket-create-pr`) that reads your config file and makes the API
call entirely within that script. Claude only passes non-sensitive parameters (branch names, PR
title, description) to the script — your username and app password are never visible in the
conversation.

## What it does

Invoke `/bitbucket-pr` (or just ask Claude to "create a PR" / "raise a pull request") and the skill will:

1. Install `~/.local/bin/bitbucket-create-pr` if not already present
2. Verify your config file exists (without reading its contents)
3. Detect your current branch and compare it against the destination branch
4. Auto-generate a PR title (from commit messages) and description (from the diff)
5. Let you review and edit both before submitting
6. Push the branch if it hasn't been pushed yet
7. Call the helper script with non-sensitive params — credentials stay in the script
8. Return the PR URL

## Setup

Create `~/.bitbucket.json` (or a per-repo `.bitbucket.json`):

```json
{
  "username": "your-bitbucket-username",
  "app_password": "your-app-password",
  "workspace": "your-workspace-slug",
  "repo_slug": "your-repo-slug"
}
```

> Add `~/.bitbucket.json` to your global gitignore. It contains credentials.

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
- `~/.bitbucket.json` with valid credentials (filled in by you, not Claude)
- `jq` installed (`brew install jq`)
- At least one commit ahead of the destination branch
- Bitbucket Cloud (not Bitbucket Server/Data Center)

## Installation

Install via Claude Code:

```bash
claude skill install bitbucket-pr
```

Or copy `SKILL.md` into your `~/.claude/skills/bitbucket-pr/` directory.

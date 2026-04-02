# bitbucket-pr

A Claude Code skill that creates Bitbucket Cloud pull requests directly from your local git repo.

## What it does

Invoke `/bitbucket-pr` (or just ask Claude to "create a PR" / "raise a pull request") and the skill will:

1. Read your Bitbucket credentials from a local config file
2. Detect your current branch and compare it against the destination branch
3. Auto-generate a PR title (from commit messages) and description (from the diff)
4. Let you review and edit both before submitting
5. Push the branch if it hasn't been pushed yet
6. Create the PR via the Bitbucket REST API v2 and return the PR URL

## Setup

Create a `.bitbucket.json` file in your repo root (or `~/.bitbucket.json` for a global default):

```json
{
  "username": "your-bitbucket-username",
  "app_password": "your-app-password",
  "workspace": "your-workspace-slug",
  "repo_slug": "your-repo-slug"
}
```

### Getting an app password

1. Go to **Bitbucket** → your avatar → **Personal settings** → **App passwords**
2. Click **Create app password**
3. Give it a label (e.g. `claude-code`)
4. Enable **Repositories: Read** and **Repositories: Write**
5. Copy the generated password into `.bitbucket.json`

> Add `.bitbucket.json` to your `.gitignore` — it contains credentials.

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

The skill defaults to `develop` as the destination branch. Specify a different target in your request to override it.

## Requirements

- Git repo with a Bitbucket Cloud remote
- `.bitbucket.json` config with valid credentials
- At least one commit ahead of the destination branch
- Bitbucket Cloud (not Bitbucket Server/Data Center)

## Installation

Install via Claude Code:

```bash
claude skill install bitbucket-pr
```

Or copy `SKILL.md` into your `~/.claude/skills/bitbucket-pr/` directory.

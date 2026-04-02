# claude-skills

A collection of Claude Code skills for common development workflows.

## What are skills?

Skills are prompt-driven extensions for [Claude Code](https://claude.ai/code) that teach Claude how to perform specific tasks. Each skill is a `SKILL.md` file with a YAML frontmatter block (name, description, trigger conditions) followed by step-by-step instructions Claude follows when the skill is invoked.

Invoke a skill with `/skill-name` or by describing what you want — Claude matches your intent to the right skill automatically.

## Skills

| Skill | Description |
|---|---|
| [bitbucket-pr](./bitbucket-pr/) | Create Bitbucket Cloud pull requests from your local git repo |

## Installation

### Install a single skill

```bash
claude skill install <skill-name>
```

### Install from this repo manually

Copy the skill directory into `~/.claude/skills/`:

```bash
cp -r bitbucket-pr ~/.claude/skills/
```

## Contributing

Each skill lives in its own directory:

```
<skill-name>/
├── SKILL.md    # The skill definition (required)
└── README.md   # Human-readable docs (recommended)
```

### SKILL.md format

```markdown
---
name: my-skill
description: >
  One or more sentences describing when to trigger this skill.
  Include natural-language phrasings a user might say.
---

# My Skill

Step-by-step instructions for Claude to follow...
```

The `description` field is used for automatic trigger matching — write it as if you're describing the user's intent.

## License

MIT

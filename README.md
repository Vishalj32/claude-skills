# claude-skills

A curated collection of [Claude Code](https://claude.ai/code) skills for common development workflows — extending Claude's capabilities with reusable, prompt-driven task automation.

## What are skills?

Skills are structured instruction sets that teach Claude how to perform specific multi-step tasks. Each skill is a `SKILL.md` file with:

- **YAML frontmatter** — name, description, and trigger conditions used for automatic matching
- **Step-by-step instructions** — a precise workflow Claude follows when the skill is invoked

Invoke a skill with `/skill-name` or describe what you want in plain language — Claude matches your intent to the right skill automatically.

## Available skills

| Skill | Description |
|---|---|
| [bitbucket-pr](./bitbucket-pr/) | Create Bitbucket Cloud pull requests from your local git repo — with credential-safe authentication and auto-generated PR titles and descriptions |

## Installation

### Via Claude Code CLI

```bash
claude skill install <skill-name>
```

### Manually

Copy a skill directory into `~/.claude/skills/`:

```bash
cp -r bitbucket-pr ~/.claude/skills/
```

Claude Code picks up skills from `~/.claude/skills/` automatically — no restart required.

## Contributing

### Skill structure

Each skill lives in its own directory:

```
<skill-name>/
├── SKILL.md        # The skill definition (required)
├── scripts/        # Helper scripts, e.g. for credential-safe API calls (optional)
└── README.md       # Human-readable docs (recommended)
```

### SKILL.md format

```markdown
---
name: my-skill
description: >
  One or more sentences describing when to trigger this skill.
  Write these as natural-language phrasings a user might say —
  this field is used for automatic trigger matching.
---

# My Skill

Step-by-step instructions for Claude to follow...
```

### Guidelines

- **One directory per skill** — keep skills self-contained and composable
- **Credential safety** — never let credentials flow through the model; use helper scripts or environment variables
- **Describe user intent** — the `description` field should read as what a user would say, not what the skill does internally
- **Include a README** — document setup requirements, usage examples, and any prerequisites

## License

[MIT](./LICENSE)

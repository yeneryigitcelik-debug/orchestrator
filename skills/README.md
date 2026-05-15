# Review-Agent Skill Library

This folder holds the skill library used by the review agents. Each agent
("role") owns one subdirectory of checks it runs against a codebase.

## Structure

```
skills/<role>/_role.md      # the role's base system prompt
skills/<role>/<skill>.md    # one check per file
skills/<role>/<skill>.test.json  # optional regression fixture
```

The 9 roles are: `security`, `performance`, `database`, `api`,
`infrastructure`, `quality`, `ui`, `ux`, `cost`.

## Files

- `_role.md` — the role's base system prompt, defining its purpose and scope.
- `<skill>.md` — a single check. Each has these sections: what to look for,
  patterns, severity, and an example finding.
- `<skill>.test.json` — regression fixtures that exercise a skill against
  known-good and known-bad inputs.

## Adding a skill

Drop a new `.md` file into the relevant role folder, following the section
layout above. Optionally add a matching `.test.json` fixture beside it.

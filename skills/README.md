# Role Skill Library

This folder holds the per-role skill library. Every roster role can own a
subdirectory of markdown skills; when a worker of that role is spawned, its
skills are appended to the worker's system prompt (see `src/core/skills.ts`
`buildSkillPrompt`). Manage the whole catalog visually from the panel's
**▦ ROSTER** view.

## Structure

```
skills/<role>/_role.md           # optional — the role's reference base prompt
skills/<role>/<skill>.md         # one skill per file
skills/<role>/<skill>.test.json  # optional regression fixture
```

## Roles

- **Specialist / review roles** — `security`, `performance`, `database`, `api`,
  `infrastructure`, `quality`, `ui`, `ux`, `cost`. In scan mode each skill is a
  check rule applied across the repo.
- **Core roles** — `backend`, `frontend`, `db`, `devops`, `qa`. Here the skills
  act as quality criteria the role follows while it builds.

## Files

- `_role.md` — a reference base prompt. The live system prompt is defined in
  `src/core/role-prompts.ts`; `_role.md` is documentation and is not loaded.
- `<skill>.md` — a single skill. Its first non-empty line is used as the
  one-line description shown in the Roster.
- `<skill>.test.json` — optional regression fixtures (review skills).

## Adding a skill

Use the **▦ ROSTER** panel, or drop a new `.md` file into the role folder. The
file name must match `[a-z0-9][a-z0-9-]{0,63}` — lowercase letters, digits and
hyphens, starting with a letter or digit.

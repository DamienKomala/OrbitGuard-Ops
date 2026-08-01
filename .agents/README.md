# .agents

Canonical home for agent skills installed by the [`skills`](https://skills.sh)
CLI. Each subfolder under `skills/` is one installed skill package; the
per-agent directories (`.claude/skills/`, `.cursor/`, `agent/`, …) are
symlinks or copies pointing back here.

Do not hand-edit anything under `skills/` — it is generated. To change the
installed set:

```sh
npx skills list                              # what's installed
npx skills add <owner>/<repo> --all          # add every skill in a repo
npx skills remove <skill>                    # remove one
npx skills update                            # pull latest versions
npx skills experimental_install              # restore from skills-lock.json
```

`skills-lock.json` at the repo root pins each skill to a source, path, and
content hash, so a fresh clone can reproduce this exact set.

This folder is documentation/config only — it is not imported by the Next.js app
or the Playwright tests.

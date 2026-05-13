# which-model Agent Notes

Start with the repo memory in `docs/context/` before changing product behavior.

- `docs/context/PROJECT.md`: product intent, users, stack, workflows.
- `docs/context/STATUS.md`: current phase, recent changes, verification state.
- `docs/context/DECISIONS.md`: durable product and architecture decisions.
- `docs/context/SOURCES.md`: external source notes and provenance.
- `docs/context/SKILLS.md`: recurring project workflows.
- `docs/context/LOG.md`: chronological handoff notes.
- `docs/wiki/index.md`: compact wiki navigation.

Use current code as source of truth when docs and implementation disagree. Never commit secrets; `.env.local` and `.env` stay ignored.

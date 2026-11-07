---
description: "Write the Monday review to drafts/ from attention, compliance, shifts short of crew, unsigned dockets and signed work not invoiced."
---

# weekly-review

Write the Monday review to drafts/ from attention, compliance, shifts short of crew, unsigned dockets and signed work not invoiced.

Run `node scripts/traffic.mjs weekly-review`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Summarise in five lines: what cannot start, what breaks the law, who is short, what is unsigned, what is unbilled.

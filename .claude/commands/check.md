---
description: "Every rule a shift breaks now, or would break with a named worker on it in a role (--worker, --role), with the source of each rule. Changes nothing."
---

# check

Every rule a shift breaks now, or would break with a named worker on it in a role (--worker, --role), with the source of each rule. Changes nothing.

Run `node scripts/traffic.mjs check <shift> [--worker=<worker> --role=tc|supervisor|driver]`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Law, permit and plan problems first. Quote the rule.

---
description: "Show what needs a person today: shifts that cannot start (no approved plan or permit, outside the permit hours), crews rostered against the law, double bookings, unfit vehicles and failed prestarts, crew gaps, incidents the regulator or client has not heard about, expired and expiring tickets, house rules broken, unsigned and disputed dockets, vehicle papers due, overdue invoices and permits ending with shifts booked after them."
---

# attention

Show what needs a person today: shifts that cannot start (no approved plan or permit, outside the permit hours), crews rostered against the law, double bookings, unfit vehicles and failed prestarts, crew gaps, incidents the regulator or client has not heard about, expired and expiring tickets, house rules broken, unsigned and disputed dockets, vehicle papers due, overdue invoices and permits ending with shifts booked after them.

Run `node scripts/traffic.mjs attention`. Add `--json` when you need every field. Resolve the job, shift, worker, vehicle or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with what cannot start and what breaks the law. One line each, the reference first. Offer the fix command for the top three.

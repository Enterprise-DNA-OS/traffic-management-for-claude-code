# Why there is no front end

Traffio is a database with a subscription. The records underneath are ordinary: jobs, plans, permits, shifts, crew, tickets, vehicles, dockets, invoices. What you pay for is the layer on top that lets people who do not write queries get at them: the allocation board, the forms, the reports.

That layer used to be the whole product, because talking to a database was hard. It is not hard any more. Open this folder in Claude Code, ask "who can cover the Kawau Street shift on Monday?", and it checks every controller's ticket for that region, their other bookings and their rest, and gives you the answer with the reason.

## What you gain

- **Answers to your own questions.** Margin per signed hour by job, shifts that cannot legally start, tickets that run out before the last rostered shift. Ask in your own words.
- **No tiers.** Traffio prices on vehicles, staff or bookings, whichever is higher. Here a new controller or a new ute costs nothing.
- **Your records in your database.** Back them up, query them from anything, leave any time.
- **Rules you can read.** Every check is one database view with the source written next to it.

## What you give up

- **A crew phone app.** Traffio's app sends booking requests, takes sign-ons, prestarts, forms and the client's docket signature on site. Here the office records them. Enterprise DNA builds a phone screen on the same records when you want one.
- **A drag-and-drop allocation board.** Shifts are a table you ask about, not cards you drag.
- **A client portal.** Clients get dockets, site packs and invoices as documents, not a login.
- **A vendor help desk.** This is open source. Enterprise DNA supports the installed version.

## Who this fits

An office that already lives in spreadsheets and phone calls around its booking system, or one that would rather ask than click. If your crews need the app every shift today, start with the customised version.

Installed and run for you: https://enterprisedna.co/omni/instead-of/traffio

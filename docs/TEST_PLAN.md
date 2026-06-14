# LockdDin — Manual QA Test Plan

Work through these on a **phone (≈380px)** wherever possible — the app is
mobile-first and that's how real providers and clients use it. Tick each box,
and note anything odd (what you did, what you expected, what happened).

## Ground rules & setup

- **Live app:** https://lockddin.vercel.app
- **Booking link:** `https://lockddin.vercel.app/b/<your-slug>`
- **Two roles to juggle:** *provider* (you, signed in on the dashboard) and
  *client* (the public booking page — best in a separate browser, an incognito
  window, or a second device, so you're not signed in as the provider).
- **Phone numbers are identities.** Each distinct client = a distinct phone.
  Belgian `04xx xx xx xx` becomes `+32…`. Reuse a phone to act as a returning
  client; use a new phone to act as a new person.
- **Resetting data:** between big test runs, ask me to "clear booking records"
  (I wipe bookings/holds/clients/emails but keep your account, services, and
  schedule). Ask me to "erase everything" to start onboarding from scratch.
- **Emails:** use real inboxes you can open (Gmail etc.). First email may land
  in spam — mark "not spam" once.
- **Timezone:** everything shows in **Europe/Brussels**. All times below are
  Brussels local.

Legend: **P** = do this as the provider, **C** = do this as the client.

---

## A. Onboarding & authentication

> Run this section only when testing a *fresh* signup (ask me to erase
> everything first). Skip if you just want to test booking on your existing
> account.

- [ ] **A1 — Full signup → dashboard.** Open the app → enter an email → choose
  a password (try one under 8 chars first: it should refuse) → fill business
  name / your name / city → pick a slug → add at least one service → set your
  week (tick days, hours, optionally a lunch break) → verify your email via the
  emailed link → Finish. **Expect:** you land on an empty dashboard with your
  booking link.
- [ ] **A2 — Verification gate.** At the final step, before clicking the email
  link, try **Finish setup**. **Expect:** it refuses and asks you to verify.
- [ ] **A3 — Slug collision.** During signup, type a slug you know is taken.
  **Expect:** "Already taken" appears as you type; a free one shows "Available".
- [ ] **A4 — Resume.** Start a second signup with a new email, quit at the
  services step (close the tab). Reopen the app. **Expect:** you resume exactly
  at services, not back at the start.
- [ ] **A5 — Sign out escape.** Mid-onboarding, use the "Sign out" link at the
  bottom. **Expect:** you're signed out and can sign in as someone else.
- [ ] **A6 — Password reset.** Sign out → "Forgot your password?" → enter your
  email → open the emailed link → set a new password. **Expect:** you're signed
  in with the new password; the link does **not** work a second time.
- [ ] **A7 — Bad sign-in.** Try signing in with a wrong password. **Expect:** a
  kind "doesn't match" message, no crash.

---

## B. Schedule setup (provider)

- [ ] **B1 — Your week.** Dashboard → **Your week** (Schedule). Set working
  days and hours; add a recurring break (e.g. lunch 13:00–14:00). Save.
  **Expect:** saved; the break shows in the list.
- [ ] **B2 — Block editor trap.** Type a break's start/end but **don't** click
  "+ Add block" — just Save. **Expect:** the break is still saved (we fold a
  typed-but-not-added draft in).
- [ ] **B3 — Daily cap.** Give a day a cap (e.g. max 2 bookings). (You'll
  verify the cap actually limits slots in section C/J.)
- [ ] **B4 — Slot preview.** In **Manage this day**, pick a working date and a
  service. **Expect:** the times shown match your hours, stepping by the
  service length, skipping your lunch break.

---

## C. Client booking — happy paths

- [ ] **C1 — Single service.** **C:** Open your booking link → pick one service
  → tap an available time → enter phone, first name, email → Confirm.
  **Expect:** confirmation screen with service, date/time, "free cancellation
  until…", "confirmation sent to <email>". A confirmation email arrives.
- [ ] **C2 — Times respect the schedule.** **C:** On a day with a lunch break,
  confirm the listed times stop before lunch and resume after it; none fall
  inside a break or an existing booking.
- [ ] **C3 — Whole-day list.** **C:** The default list shows *all* of the
  earliest day's times (grouped under a day heading), not just one.
- [ ] **C4 — Choose a different day.** **C:** Tap "Choose a different day" →
  the calendar only offers days inside your booking window (past/closed days
  unavailable) → pick one → its times load.
- [ ] **C5 — Hold countdown.** **C:** On the details step, a 5-minute countdown
  is visible. Wait it out without confirming. **Expect:** "your slot has been
  released" and you're sent back to the picker.
- [ ] **C6 — Buffer is invisible.** If you set a buffer, the client never sees
  it as a separate thing — it just spaces the start times.

---

## D. Client booking — multiple services

- [ ] **D1 — Combine two services.** **C:** Tap two services (e.g. 60-min +
  45-min). **Expect:** a running total ("Continue · €… · 105 min"); the slots
  offered fit the **combined** length, flowing around lunch and other bookings.
- [ ] **D2 — Confirmation lists both.** **C:** Confirm a two-service booking.
  **Expect:** the confirmation screen and email show "Service A + Service B" and
  the summed price.
- [ ] **D3 — Deselect.** **C:** Toggle a service off again; the total and the
  available times update.

---

## E. Client booking — edge states

- [ ] **E1 — No availability → waitlist.** Make a day have no free slots (close
  it, or book it out), then **C:** pick that service for that situation.
  **Expect:** a "join the waitlist" option (name/phone). *(Note: joining is
  recorded; automatic waitlist emails are the deferred M7 feature.)*
- [ ] **E2 — Inactive business.** *(If you have a way to mark the business
  inactive — otherwise skip.)* **Expect:** a closed state instead of the
  booking flow.
- [ ] **E3 — Slot just taken.** Hard to force by hand — see the race test (M1)
  in section M. **Expect:** a friendly "just taken" message → back to picker.
- [ ] **E4 — Returning phone recognised.** **C:** Start a booking, on the
  details step enter a phone that already has a booking. **Expect:** instead of
  letting you double-book, it shows your existing appointment with a "manage"
  link, plus a "back to picker" link.
- [ ] **E5 — "Booked here before?"** **C:** At the top of the booking page, open
  "Booked here before?", enter a phone with an upcoming booking. **Expect:** it
  shows that appointment instantly with a manage link. A phone with none shows a
  gentle "pick a service to book".

---

## F. Manage link (client self-service)

- [ ] **F1 — Cancel (outside window).** From a confirmation email, open the
  manage link → Cancel. **Expect:** "cancelled" + a "book a new time" button; a
  cancellation email arrives.
- [ ] **F2 — Reschedule (outside window).** Manage link → Reschedule → pick a
  new time. **Expect:** "rescheduled" with the new time; a fresh confirmation
  email with a new manage link.
- [ ] **F3 — Inside the window.** Make a booking whose start is *within* the
  cancellation window (e.g. set a short window, or book something soon), then
  open its manage link and try to cancel. **Expect:** no self-service — it
  explains the provider's notice policy and shows the provider's contact.
- [ ] **F4 — Stale link.** Reuse an *old* manage link (one from a booking you
  already rescheduled or cancelled). **Expect:** an honest "this was
  cancelled/replaced" or "already passed" message with a rebook link — **not** a
  blunt "expired".

---

## G. Notifications / emails (open the actual inboxes)

> Provider notifications are deliberately **delayed**. Give them the stated
> time before deciding something failed.

- [ ] **G1 — Client confirmation.** Immediate on booking (C1). From-name is your
  business; reply-to is your email.
- [ ] **G2 — Provider new-booking, 5-min delay.** After a client books, you (the
  provider) get a "new booking" email about **5 minutes** later.
- [ ] **G3 — Suppression.** Book, then **cancel within 5 minutes**. **Expect:**
  you get the client confirmation + cancellation, but **never** a provider
  "new booking" email.
- [ ] **G4 — 6-hour reminder.** Book a slot **more than 6h** in the future.
  **Expect:** a reminder email to the client ~6h before start. A slot booked
  **less than 6h** ahead gets **no** reminder.
- [ ] **G5 — Client cancels → provider hears (20-min delay).** Client cancels
  (outside window); the provider gets a "freed up" email ~20 min later —
  **unless** the same client rebooks within those 20 min (then suppressed).
- [ ] **G6 — Provider cancels with reason.** From the dashboard, cancel a
  booking with a reason. **Expect:** the client gets a cancellation email with
  your reason + a rebook link. You get **no** self-notification.

---

## H. Provider dashboard — views

- [ ] **H1 — Day timeline.** The Day view lays out the working hours top to
  bottom: bookings as solid cards in their time slot, open gaps as dashed
  "Free · N min" rows, breaks marked.
- [ ] **H2 — Stat bar.** Shows bookings count · total booked value (€) · gaps.
  Cross-check the numbers against what you booked.
- [ ] **H3 — Week.** Each day with its count and value; tap a day → jumps to it.
- [ ] **H4 — Month.** Calendar grid with a count on busy days; tap a day → Day
  view.
- [ ] **H5 — Window bound.** The forward arrows stop at the end of your booking
  window (no infinite empty future). Past navigation is allowed.
- [ ] **H6 — Holds invisible.** While a client is mid-booking (holding a slot),
  that hold does **not** appear on your dashboard — only confirmed bookings do.

---

## I. Booking actions (provider, from a booking's detail)

- [ ] **I1 — Open detail.** Tap a booking → see client, service(s), time, price,
  source (Online / Walk-in), visit count.
- [ ] **I2 — Cancel with reason.** Cancel → pick a reason (try "Other" + a note)
  → see the preview of the email the client will get → confirm. **Expect:**
  "Cancelled. <name> has been emailed", booking drops off the day.
- [ ] **I3 — Reschedule.** Reschedule → pick a day with room → pick a time →
  confirm. **Expect:** you land on the new booking's detail; the client gets the
  new-time email. (On a long multi-service booking, pick a day with enough
  space — a short day may legitimately show no times.)
- [ ] **I4 — No-show (past only).** On a booking whose time has **passed**, the
  only action is the gentle "Did <name> miss this appointment?" → mark it →
  it shows as no-show and the client's no-show count goes up. Undo it →
  count goes back down.
- [ ] **I5 — No no-show on future.** A future booking shows cancel/reschedule,
  **not** no-show.

---

## J. Manage this day (provider)

- [ ] **J1 — See the day's bookings + inline cancel.** Open **Manage day** for a
  day that has bookings → each booking has a **Cancel** right there (reason →
  client emailed). **Expect:** it works and the booking drops off; no page error.
- [ ] **J2 — Close a day.** Toggle "Closed all day" → Save. If bookings exist,
  you see exactly which will be cancelled and confirm with a reason. **Expect:**
  the day closes cleanly, the page reloads fine (no "couldn't load"), clients
  emailed.
- [ ] **J3 — Reopen a closed day.** On the now-closed day, use "Remove and
  return to weekly pattern" (or toggle Open + Save). **Expect:** the day reopens
  and the form reflects it — no manual reload needed, no error.
- [ ] **J4 — One-off block.** Add a blocked-off time (e.g. 15:00–15:30) → Save.
  **C:** check the booking page for that day — that window is no longer
  bookable. Remove the block → it's bookable again.
- [ ] **J5 — Daily cap (client limit).** Set "Max bookings" to 1 on a day, then
  **C:** book it once. After that, **C:** that day should offer no more times.
- [ ] **J6 — Service limit.** Restrict the day to certain services. **C:** the
  excluded service shows no times that day; the allowed one does.
- [ ] **J7 — Modified hours.** Change a single day's hours (e.g. 10:00–14:00) →
  Save. **C:** that day's times sit inside the new hours only.
- [ ] **J8 — Block a range.** Use "Block off several days" to close a holiday
  range in one go, with one consequence preview.

---

## K. Client records (provider)

- [ ] **K1 — Search.** Dashboard → Clients → search by name and by phone.
- [ ] **K2 — Detail.** Open a client → visit history, booking count, total
  booked value, no-show count. Cross-check against what they booked.
- [ ] **K3 — CSV export.** Tap "Export CSV" → a file downloads with the right
  columns and values.
- [ ] **K4 — Delete (anonymise).** Delete a client → confirm. **Expect:** their
  personal details are gone but past bookings remain as anonymous records; they
  no longer appear in search by their old name/phone.

---

## L. Walk-in booking (provider, "Add booking")

- [ ] **L1 — New client walk-in.** Dashboard → **Add booking** → "+ New client"
  → name + phone (+ optional email) → add → pick service(s) → pick a day + time
  → **Book it**. **Expect:** you land on the booking detail; **Source = Walk-in**.
  Time it — should be well under 30 seconds.
- [ ] **L2 — Existing client.** Add booking → search an existing client → pick
  them → book. (If they already have an upcoming booking, the search flags
  "Already has an upcoming booking" and booking again is refused.)
- [ ] **L3 — Email behaviour.** If the walk-in client has an email, they get the
  standard confirmation. If phone-only, no email is sent (and that's fine).
- [ ] **L4 — No provider self-notify.** You created it, so you should get **no**
  "new booking" email for a walk-in.
- [ ] **L5 — Multi-service walk-in.** Pick two services in the walk-in flow;
  the combined duration drives the slots, summed price shows on confirm.

---

## M. Concurrency & integrity (the important one)

- [ ] **M1 — Two phones, last slot.** On two devices/browsers (two different
  phones), both reach the **same** time's details step at once, both Confirm as
  fast as you can. **Expect:** exactly **one** succeeds; the other gets "just
  taken" and goes back to the picker. Never two confirmed bookings on one slot.
- [ ] **M2 — Back-out frees the slot.** **C:** Reach a slot's details step (a
  hold is placed), then tap "back to picker". **C (other phone or same):**
  that slot is immediately available again — not locked for 5 minutes.

---

## N. Regression checks (bugs we fixed — make sure they stay fixed)

- [ ] **N1 — No phantom "taken".** **C:** book a slot, then cancel it, then
  immediately book a *different* time on the same day as a new phone. **Expect:**
  no false "that time has been picked" — every time the page shows is genuinely
  bookable.
- [ ] **N2 — Engine sees bookings.** **C:** book 10:00. Reload the booking page.
  **Expect:** 10:00 is gone from the list and the times flow around it (the
  engine isn't blind to existing bookings).
- [ ] **N3 — Stepped times, whole day.** **C:** an empty day shows a full column
  of times (e.g. 09:00, 10:00, 11:00 …), not a single time.
- [ ] **N4 — Lunch respected.** **C:** with a 13:00–14:00 break, no offered time
  starts or runs inside 13:00–14:00.
- [ ] **N5 — Provider cancel actually persists.** **P:** cancel a booking from
  the dashboard, reload. **Expect:** it stays cancelled, with a visible "done"
  confirmation (not a silent bounce, not a crash).
- [ ] **N6 — Close/reopen day no crash.** (Covered by J2/J3.) The page must
  never show "this page couldn't load" after closing or reopening.
- [ ] **N7 — DST sanity (optional, advanced).** Book across the late-March or
  late-October Brussels clock change; durations should stay correct (a 60-min
  service is still 60 real minutes).

---

## O. Cross-cutting

- [ ] **O1 — 380px phone.** Every provider screen is usable on a narrow phone —
  nothing cut off, all buttons tappable.
- [ ] **O2 — Mistyped link → friendly 404.** Visit `/b/does-not-exist` or a
  random URL. **Expect:** a tidy "page not found", not a crash.
- [ ] **O3 — Error boundary.** (Hard to trigger deliberately.) If anything ever
  errors, you should see "Something went wrong · Try again", never a raw stack.
- [ ] **O4 — Booking window boundaries.** Set your window to "this week" and
  confirm Sunday is bookable but next Monday is not; "3 months" reaches the end
  of the month two months out but not the 1st of the next.

---

## Known/expected gaps (don't report these as bugs)

- **Waitlist rounds (M7) not built** — clients can *join* a waitlist when a day
  is full, but no automatic "a slot opened" emails go out yet. Deferred on
  purpose ("first to cut").
- **Photos** — work/service photo *upload* UI isn't built yet (deferred to
  Settings); the storage is ready.
- **EN only** — French/Dutch aren't translated yet (the structure supports them).
- **No payments / no WhatsApp** — by design for the beta.

---

## When you find something

Note the **scenario ID** (e.g. "J3"), the **device/browser**, and *what you did
→ expected → got*. Bring that to me and I'll reproduce it in a real browser and
fix it — that loop is exactly how we squashed the last several bugs.

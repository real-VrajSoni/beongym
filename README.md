# BeOnGym — Gym Management Platform

A multi-tenant SaaS for gyms, studios, chains and anyone else who charges people
to train. Every paying gym gets a pin on a world map, a store page on it, and a
workspace behind it — members, attendance, classes, programmes and payments.
Members get an app of their own in their gym's colours. A platform console sits
above every tenant.

**There is no free tier, and there is nothing to install.** It runs in a browser,
on whatever the front desk already has. One price worldwide, four lengths:
**$20 for 30 days**, $89 for six months, $149 for a year, or $249 once for
lifetime.

```
Marketing site (/)          →  the globe, pricing, sign-up
Gym workspace (/gym)        →  owners and staff
Member app (/me)            →  members of one gym
Platform console (/admin)   →  every tenant, orders, revenue
Public directory (/gyms)    →  store pages, claims, listings
```

---

## Contents

1. [The paywall](#the-paywall)
2. [Who it is for](#who-it-is-for)
3. [What is running](#what-is-running)
4. [The map](#the-map)
5. [Getting a gym onto it](#getting-a-gym-onto-it)
6. [The workspace](#the-workspace)
7. [The member app](#the-member-app)
8. [Forms worth their own section](#forms-worth-their-own-section)
9. [Security model](#security-model)
10. [Data model](#data-model)
11. [Running it](#running-it)
12. [What is and isn't wired up](#what-is-and-isnt-wired-up)
13. [Working on this](#working-on-this)

---

## The paywall

Nothing is on the map for free, and nothing is a cut-down version of the
product. Every plan unlocks the same platform; the only difference is how long
the window lasts.

A directory anybody can join for nothing fills up with gyms that shut two years
ago, and the ones still trading get buried under them. Twenty dollars is a low
enough bar to clear in a minute and a high enough one that nobody bothers unless
the gym is real. That single decision is why `listGyms()` filters on live access
rather than on a `listed` flag alone.

| Plan     | Price         | Struck from                | What it buys                      |
| -------- | ------------- | -------------------------- | --------------------------------- |
| Pro      | **$20**       | $25 — early bird, 20% off  | 30 days                           |
| UltraPro | **$89**       | $120 — early bird, 25% off | 6 months (5 paid, 1 free)         |
| Annual   | **$149**      | $200 — early bird, 25% off | 12 months (10 paid, 2 free)       |
| Elite    | **$249** once | $500 — early bird, 50% off | Lifetime, all future updates free |

`lib/platform-plans.ts` is the only place any of those numbers appear. Each plan
carries its own `discount` rather than deriving one, so the badge reads as a
round offer instead of arithmetic (25.8% off is not an offer, it is a mistake).

### The access window

Buying writes `Gym.accessExpiresAt`. `extendAccess()` stacks from the _current_
expiry rather than from today, so a renewal bought early loses nobody a day: it
starts when the running window ends. Elite writes `null` — it never expires.

`accessState()` returns `lifetime | active | expired | none`, and that one
function decides what the workspace, the nav, the billing page and the renewal
screen say.

When a window closes, **nothing is deleted**. The gym comes off the globe, the
workspace redirects to `/gym/renew`, and every member, payment and attendance row
is exactly where it was. `/gym/settings` and `/gym/billing` stay open — locking
somebody out of the page where they would pay you is a good way to not get paid.

The boundary is enforced in three places: the nav hides workspace links, the
proxy redirects `/gym/dashboard` and friends to `/gym/renew` before the response
streams, and `sessionIsLive()` compares the token's tier _and_ expiry against the
database on every request, so a renewal or a lapse takes effect immediately
rather than at token expiry.

**Tax is deliberately absent from every quoted price.** These are pre-tax
figures; GST/VAT/sales tax is worked out by the payment provider from the buyer's
own country at the checkout it hosts. `formatUsd` is what the gym pays _us_;
`formatCurrency` stays for what a gym charges _its own members_, in the gym's own
currency.

Payments are not wired yet — **Dodo Payments** is the intended provider, chosen
because it settles one USD price from any country. `orderValue()` is the single
function that says what an order was worth, and `PlatformOrder` carries
`billingCycle: MONTHLY | SEMIANNUAL | ANNUAL | LIFETIME`, so the gateway drops
into `purchaseAccessAction` without the rest of the app moving.

MRR excludes lifetime buyers. `monthlyValue()` is the single place that decides
what a gym contributes each month, and a lifetime purchase contributes nothing —
counting it monthly would inflate the number for a gym that will never be billed
again. Its cash shows up in booked revenue instead.

---

## Who it is for

The workspace does not assume a barbell. Gyms, multi-branch chains, pilates,
yoga, dance and MMA studios, clubs and gymkhanas, CrossFit boxes, personal
trainers, dieticians and wellness coaches all run the same primitives —
memberships of a length, people who turn up, money that arrives, classes with a
capacity — with their own names on everything.

The homepage says so in three photographed cards and a row of chips, because the
first question a pilates studio asks is "is this for gyms only?" and the honest
answer is a list they can find themselves in.

---

## What is running

Twelve features, printed as twelve cards on the homepage:

|                            |                                                             |
| -------------------------- | ----------------------------------------------------------- |
| **The world map**          | Your pin and store page on a globe members search           |
| **Member management**      | Profiles, auto-issued member codes, payment history         |
| **Billing & payments**     | Payments against the right membership, dues, renewals       |
| **Attendance**             | Live occupancy, peak hours, a year of every member's visits |
| **Staff management**       | Owner and front-desk roles with their own access levels     |
| **Reports & analytics**    | Revenue, retention, dues, who has stopped turning up        |
| **Diet & training plans**  | Splits and macro targets attached to a programme            |
| **WhatsApp reminders**     | Expiry, dues, birthdays — written for you, one tap to send  |
| **Member app & portal**    | Their plan, dues, attendance, programme, class bookings     |
| **QR check-in**            | One printed code by the door, scan in and out               |
| **Class scheduling**       | A fortnight of timetable with member self-booking           |
| **Enquiries & follow-ups** | Walk-ins captured, call-backs dated, conversion counted     |

Two things are honestly unfinished, and the pages say so where it matters: online
card/UPI checkout waits on Dodo, and WhatsApp sending is one tap rather than
automatic until a Business API account is connected.

### What came out, and why

**Weekly check-ins** (weight, body fat, measurements) and the **session diary**
were both built and then removed. They asked a gym to type in something it
already knew, on a form nobody filled in — and a progress chart built on a form
nobody fills in is a lie with axes. Attendance replaced both: a member either
came in or did not, and the QR at the door answers that without anybody typing.

**The desktop app** (an Electron shell around the same origin) was removed for
the same kind of reason: a browser is what a front desk already has open, and a
second thing to install, sign and notarise bought nobody anything.

---

## The map

### It lives on the homepage

The globe sits on the landing page, between the live counts and the feature
wall, showing **nine gyms**. Nine reads as a world with gyms on it; ninety reads
as noise, and the shelf of cards that used to sit under it made the globe
decorative. The band is laid out on the golden ratio (copy : globe = 1 : 1.618),
which is not something a reader notices and is the reason the section sits still.

`/gyms` is still there for somebody hunting a specific gym: the same globe, a
search box, country and city filters, and results as a compact list rather than a
second gallery.

### How the globe is drawn

A draggable orthographic globe on a canvas with `d3-geo` over `world-atlas`
(`public/geo/countries-110m.json`, 105 KB, fetched once and cached rather than
serialised into every render). Countries containing at least one gym are tinted —
worked out client-side with `geoContains` rather than stored, so it is right the
moment a gym lists itself anywhere on Earth. The opening rotation is the mean of
the pins, so nothing hard-codes a country.

**Pins are the gyms' own logos**, as DOM buttons positioned each frame, so they
stay clickable, focusable and readable by a screen reader; hovering enlarges one
and names it.

The idle spin is deliberately slow and stops for good at the first touch: a pin
on a spinning globe is a moving target. Canvas colours come from `--globe-*`
tokens re-read on a theme change — CSS alone cannot repaint a canvas.

### Many gyms per city, in many cities

A city is a handful of pixels wide at world zoom, and this platform expects ten
or fifteen gyms in each of Mumbai, Pune and Ahmedabad at once. `lib/geo/globe-layout.ts`
handles that, pulled out of the render loop so it is a pure function of "here are
the projected pins, here is how big a pin is", and therefore testable.

**Gyms group by city, not by pixel distance.** Mumbai and Pune are six pixels
apart at world zoom; merging them because of that would be a lie about where
anybody trains. The group key is the city, so three cities stay three places
however far out you are.

**A city either fans out, or says it is a city.** With room, its gyms are laid
onto concentric rings around the true location — every logo drawn, hoverable and
clickable, leader lines back to the spot, busiest gym at the top. Without room it
collapses to a **place marker**: the city name, the count, and a glimpse of three
logos. That is not the old `+N` badge, which put one gym's logo up front and hid
nine behind it; this never pretends to be a gym, and clicking it flies in until
the rosette fits.

Zoom is multiplicative and goes to 60× — separating cities an hour apart needs
the globe an order of magnitude bigger, not a few percent.

`npm run check:globe` runs the layout over whatever is in the database at seven
zoom levels and asserts the property that matters: **no drawn gym pin ever
overlaps another**, and opening a city draws every one of its gyms.

It has earned its keep twice. A sparse outer ring was being sized from its own
occupancy, so twenty-five gyms put ring three's single pin _inside_ the packed
ring two — rings are now sized from a full ring's circumference so they strictly
increase. And single-gym cities were expanded with no collision test at all, so
the lone gym in Mumbai could sit on the lone gym in Pune; a short bounded
relaxation pass now pushes any remaining overlap apart and gives each pin a
leader line home.

Against a density fixture of 92 gyms in 16 Indian cities:

| Zoom | Drawn individually | City markers |
| ---- | ------------------ | ------------ |
| 1×   | 5                  | 8            |
| 5×   | 12                 | 7            |
| 12×  | 43                 | 3            |
| 25×  | 53                 | 2            |
| 60×  | 78                 | 1            |

### India is drawn as India draws it

The Natural Earth dataset every web map reaches for shows India **without**
Jammu & Kashmir and Ladakh, stopping at 35.5°N. That is wrong here, so
`public/geo/india.json` is Natural Earth's own **India point-of-view edition**
(`ne_10m_admin_0_countries_ind`), extracted and simplified to 1,623 points
(26 KB). It reaches 37.05°N and includes the Nicobar Islands down to 6.75°N.

The globe and the map picker skip the default India polygon entirely and draw
this one over the top, and the "does this country have gyms" test runs against it
too — otherwise a gym in Ladakh would sit outside the country it is in.

### Finding a city

Type a city and the map moves to it, drops the pin and names what it found —
three layers deep, so it degrades instead of failing:

1. **`lib/geo/places.ts`**, an offline gazetteer of ~150 cities, answers
   instantly with no network. Every server path that creates or edits a gym runs
   this same lookup, so a gym reaches the directory already placed.
2. **Nominatim** (OpenStreetMap's public geocoder — no key, no account) covers
   everywhere else, via `geocodeCityAction`. Server-side, sends only the typed
   city, times out at five seconds, caches for a day, returns null on failure.
3. **The pin itself.** `MapPicker` is a draggable, zoomable flat map: click to
   place, drag to pan. The answer when the geocoder is wrong, when the gym is not
   at the city centre, and when there is no network.

The picker starts on the 110 KB `countries-110m` outlines and swaps to the 756 KB
`countries-50m` set only once somebody zooms past the point where the coarse
coastline shows.

### Live counts

`getLiveStatsAction` returns the four public numbers — gyms, countries, cities,
profile views — and `useLiveStats` refreshes them every 20 seconds, with the
headline count wearing a pulse and any change flashing green. They are
server-rendered first so there is never a flash of zero.

**The pins keep up with the count.** `useLiveGyms` refetches the map whenever the
gym total changes, so a gym that lists itself while somebody is spinning the world
appears without a reload. It keys off the count rather than running its own timer,
so the second query only happens on ticks where the answer moved.

Nothing hard-codes a total in prose: a directory that says "13 gyms" goes stale
the moment the fourteenth signs up. The poll deliberately does **not** skip ticks
on `document.hidden` — embedded and previewed contexts report themselves hidden
while plainly on screen, and a counter that silently stops is worse than one
aggregate query every twenty seconds.

---

## Getting a gym onto it

### Listing without an account (`/list`)

```
/list → pick a plan ──→ gym details ──→ pay ──→ live on the globe
                                                      ↓
                                 set a password to own it and set it up
```

The plan is chosen first, and there is no unpaid path through the form: the
question is which window, not whether.

A gym owner who has never heard of us should not have to choose a password before
finding out whether this is worth anything. So `listGymAction` takes the details
and the payment, creates the gym and the `PlatformOrder`, and the listing is on
the map before the page changes — with **no user account at all**.
`PlatformOrder.userId` is nullable for exactly this, and the order keeps the
buyer's email so a listing can still be traced to a person.

The receipt then offers `attachOwnerAction`: name, email, password, and the
listing becomes an account. It only works while the gym has no users, so it
cannot be used to take over anyone else's gym. Programmes need a trainer profile
to hang off, so a gym's starting set is created when the owner attaches their
account, not when the gym is created.

### Claiming a gym

Some listings are seeded from public information so a searcher finds something on
day one. Those rows carry `claimed: false`, have **no user accounts** and **no
access window**, so they are reachable by link and by `/claim` but are **not
pinned on the globe** — nobody who has not paid is on the map. Both facts are
asserted by `check:isolation`.

```
/gyms → pin or card → /gyms/CODE/claim → /signup?claim=CODE → claimGymAction
```

Claiming costs the entry price once and writes a `PlatformOrder` the same way a
plan purchase does, with the claimant's role and phone in `providerRef` — the
claim is confirmed by a human call before it means anything, because handing a
stranger somebody's listing on the strength of a form would be worse than no
claim flow at all.

### The acquisition funnel

```
marketing site (/)  →  account (/signup)  →  plan (/start/plans)
                                                    ↓
        gym dashboard (/gym)  ←  provisioning  ←  checkout (/start/checkout)
```

A visitor reads the homepage, scrolls to pricing and picks a plan. The plan key
rides the URL through sign-up and checkout, so nobody who clicked "Annual" ends
up buying a month. Provisioning creates the tenant, the owner, a trainer profile
and six starter programmes, and reissues the session — one transaction.

### Links on a pin

`GymLink` rows are what a pin points at: up to eight outbound links per gym, each
with its own `clickCount`. The count is a column on the row rather than something
derived from an events table nobody would keep, because the only question the
owner asks is "how many people did the map send me?".

`recordLinkClickAction` is deliberately unauthenticated and fire-and-forget — it
runs as the visitor is already leaving, and a failed counter must never get
between them and the gym. Editing a link keeps its clicks: a link that survives a
save is matched by URL and carries its number across.

`/gym/listing` is where a paid-up owner sees pin views and total clicks — and
**View on globe**, which opens the map already rotated to their own pin with its
card open (`?focus=CODE`, handled at mount so there is no effect chasing a prop).

### Prices are opt-in

Programmes arrive with a placeholder price nobody can see: `Plan.showPrice`
defaults to **false**, so a store opens with **Contact for latest price** on every
card. A programme without a published price is not a card with something missing —
it is a card whose job is to start a conversation.

**Typing a price publishes it.** The editor ticks _Show this price on your public
store_ the moment the price field is touched, because a figure the owner has just
typed is one they mean to charge; the card then shows the price _and_ an **Enquire
about this** button. The checkbox stays as an explicit override for a gym that
would rather quote. Every contact button resolves to the same target — phone,
then email, then first link — so none of them dead-ends.

### The store's look

The store takes its colour from the gym, not from us: `Gym.accentColor` drives a
lit cover gradient, the logo tile, the contact buttons and the tinted panels, so
two gyms never look like the same page. Programme cards reuse `plan-art.tsx` — the
per-card colourways and line-art motifs the owner already sees in their workspace.
Everything is CSS gradients and inline SVG: no photography to load, and it themes
correctly in light and dark.

---

## The workspace

| Route                                                            | What it is                                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `/gym/dashboard`                                                 | KPIs, today's classes, revenue or footfall, calls due, activity |
| `/gym/clients`                                                   | The roster; `/gym/clients/[id]` is the member dossier           |
| `/gym/leads`                                                     | Enquiries and follow-ups                                        |
| `/gym/attendance`                                                | Live occupancy, peak hours, front-desk check-in                 |
| `/gym/attendance/qr`                                             | The printable check-in poster                                   |
| `/gym/classes`                                                   | The fortnight calendar and the weekly timetable                 |
| `/gym/messages`                                                  | WhatsApp reminder rules, queue and log                          |
| `/gym/plans`                                                     | Programmes, workouts, nutrition                                 |
| `/gym/subscriptions` · `/gym/payments`                           | Memberships and money                                           |
| `/gym/staff`                                                     | The team and their access levels                                |
| `/gym/listing` · `/gym/settings` · `/gym/billing` · `/gym/renew` | The gym's own record                                            |

### Attendance is the progress story

There is no measurements table. What a gym reliably knows is who came in, and
`components/attendance/attendance-grid.tsx` draws a year of it as a contribution
graph — one square a day, greener with more visits. An owner glances at a member's
page and sees the shape of the habit: the three-weeks-on, two-weeks-off pattern
that no monthly total shows, and the fortnight of empty squares that means a phone
call today rather than a cancellation next month.

The same grid is the member's own **Attendance** tab. `RosterClient.daysAway`
carries the same signal into the roster (a "14d away" badge), and the dashboard's
activity feed reads from visits.

### QR check-in

**One code per gym, and the same one for good.** `Gym.checkInCode` is a random
32-character value, unique across the platform, and the poster encodes
`/checkin/<gymCode>?k=<checkInCode>`. That is what makes it printable: a code that
rotated would leave every printed sheet dead within minutes.

Random rather than derived from the gym id, because a permanent secret needs a way
to be revoked — `resetCheckInCodeAction` (owner only) issues a new one and kills
every printed copy of the old poster at once.

`/gym/attendance/qr` is a page, not a pop-up: it can be printed (`print:` rules
strip the app chrome), bookmarked on a door tablet, and left open all day. The QR
is rendered to SVG **on the server**, so the QR library never reaches the browser
and the code is on screen whether or not any JavaScript ran.

Scanning opens a page with a button rather than checking in on load — a GET that
writes gets fired twice by a prefetching browser. The same code checks a member
out if they are already inside, because a second poster saying "check out here" is
a poster nobody reads. A member of another gym scanning it is told so, and nothing
is recorded. Attendance lands with `source: MEMBER_APP`.

### Classes

A `GymClass` is a **weekly slot**, not an occurrence: a gym running 20 classes a
week has 20 rows, not 1,040 a year. A `ClassBooking` carries the date, and that
pair is what makes an occurrence real.

**The calendar plans a fortnight.** `getCalendar()` expands the weekly templates
across the next 14 days rather than materialising rows, and two things bend that
expansion: a `GymClass` with a `date` is a **one-off** that runs that day only,
and a `ClassCancellation` strikes out a single occurrence of a repeating class —
a holiday, a coach away — without touching the slot itself. Cancelling an
occurrence cancels its bookings with it: a member holding a spot in a class that
is not running is the one outcome worse than no booking at all.

Members book inside the same 14-day window, so what the owner plans is exactly
what a member sees. Past capacity they go on the waitlist, and cancelling promotes
the longest-waiting person automatically.

This is the **only** place a member writes anything, and deliberately so: capacity
answers the request, so nobody at the front desk has to.

### Reminders

Four rules — expiry, dues, birthday, welcome — each with a template the owner edits
and placeholders (`{{name}}`, `{{plan}}`, `{{amount}}`, `{{date}}`, `{{code}}`,
`{{gym}}`) filled at queue time.

**Nothing sends itself, and the page says so at the top.** No WhatsApp Business
account is connected, so `buildQueue()` works out who is due, renders the text and
hands the desk a `wa.me` deep link with the message already in it. The desk taps
through, sends from the gym's own number — the number members already know — and
marks it sent. When an API account is connected, that last step becomes a webhook
and nothing above it moves.

The queue is idempotent: `(client, kind, dueOn)` is unique, so rebuilding it twice
in a day adds nothing and a message already sent or skipped never comes back. The
rendered text is stored on the log rather than re-rendered later, so the record
says what was actually sent even after the template changes.

### Enquiries

Walk-ins, calls and Instagram messages, with `nextFollowUpAt` — the one field that
turns a list into a follow-up list. Sorted by who needs ringing rather than when
they arrived, because that is the only question the screen answers.

Logging a call moves a `NEW` lead to `CONTACTED` on its own; marking one joined or
lost clears the reminder, because chasing somebody who has decided is how a
follow-up list becomes a nuisance. `JOINED` stamps a date, so the conversion rate
on the page is a fact rather than a count of rows somebody remembered to move.

Leads are deliberately **not** `User` rows: most enquiries never join, and filling
the roster with people who walked past once makes every member count a lie.

---

## The member app

Members are still, first of all, rows their gym manages — but they have an app of
their own, at `/me`, in their gym's name and colours.

**It is read-mostly on purpose.** The first member portal let members request
sessions and gyms answer inside the product, which produced a queue nobody at the
front desk wanted to work. This one shows a member what they have (plan, days
left, dues), what they have paid, how often they have trained, and what they are
meant to be doing — and the single thing they can change is their own class
booking, where capacity answers instead of a person.

They sign in with **gym code + member code + password** (`authenticateMember`), not
an email: plenty of members never gave the gym one. The password is set by the gym
from the member's own page (`resetMemberPasswordAction`) — there is no email
delivery in this product, so there is no self-serve reset either.

The app is part of what the gym pays for. When a gym's window lapses, its members
hit `/me/paused`, which says so in one line, blames nobody, and makes clear their
membership _at the gym_ is unaffected.

`check:isolation` asserts the boundaries: a member token reaches `/me` and
redirects everywhere else, the app shows only that member's own record, no
`TrainerNote` fragment appears on any member page, and there is no route under
`/me` that takes an id.

---

## Where authorization lives

Three layers, and only the last two are load-bearing.

`proxy.ts` routes. It keeps a role out of another role's portal and a lapsed gym
off the paid screens, before a response starts streaming. It is a good first
line and a bad only line, because **it routes pages and a server action is a
POST to whatever route the browser is already on**. `/gym/settings`, `/gym/renew`
and `/gym/billing` stay open to a lapsed gym on purpose — locking somebody out of
the page where they would pay you is a good way to not get paid — and an action
id is the same wherever it is called from. So a workspace action posted at the
settings page clears the proxy entirely.

`lib/auth.ts` answers _who_. `requireStaff` / `requireOwner` / `requireMember`
check the session against live rows; `requirePaidStaff` / `requirePaidOwner` /
`requirePaidMember` add the access window, re-read from the database rather than
taken from the token, because the token is held by the person being checked.
Every action that runs the gym uses a `requirePaid*` variant. `purchaseAccessAction`
deliberately does not — renewal must not sit behind the thing being renewed.

`lib/data/tenant.ts` answers _whose_. One `(gymId, rowId) => Promise<boolean>`
per resource, in one file, so the tenant boundary reads as a rule rather than as
a `where` clause repeated forty times. The `gymId` always comes from the signed
session and the row id always comes from the browser; these functions are the
only thing between the two.

`npm run check:tenant` drives all of it. It calls each assertion twice — once as
the owning gym, once as another — so a function that always said no would fail
too. Then it reads every action and checks that each write to a tenant-owned
table is keyed on an id the action has already established is its own: derived
from a scoped lookup, or passed through an `assert…()` first. That second half is
the one that matters going forward. An action-wide "does the word `gymId` appear
somewhere" test passes happily on an action that checks the _parent_ and then
writes whatever child id it was handed — which is exactly the bug the workout and
diet plan editors had.

---

## Forms worth their own section

### Phone numbers carry their country

`components/ui/phone-field.tsx`: a searchable dialling-code control in front of
the number, defaulting to +91. Type "india", take +91, then the number — and one
field is posted, the two joined as they should be dialled.

It is required at sign-up, because every reminder this product sends is a phone
number away from being useless, and a gym owner we cannot ring is a gym owner we
cannot help. `lib/geo/dial-codes.ts` is a table in the repo rather than a
dependency: the list changes about once a decade, and 300 KB to render a dropdown
is a bad trade.

### Dates are typed, not clicked

`components/ui/date-field.tsx` replaces every `<input type="date">`. The native
control is wrong here twice over: inside a dialog its picker is a browser-drawn
layer the focus trap fights with, and for a date of birth it is hopeless anyway —
reaching 1994 from this month is thirty clicks on a chevron.

So the field takes typing (`12051994` becomes `12/05/1994` as you go, and `31/02`
is rejected because the round-trip lands on a different day), and its calendar has
month and year as dropdowns, with the year list running back to 1930 for
birthdays. The value posted is a hidden ISO field, so no server schema changed.
The calendar renders inline rather than in a portal, which is what keeps it out of
the dialog's focus trap.

### Asking for less

The add-member form asks for name, email, phone, date of birth and gender, and
that is all. Height and "fitness goal" came out: neither was used anywhere, and
every extra field on the first form is a member who does not get added at the
desk because it was quicker to write on paper.

---

## Security model

Auth is a signed `httpOnly` JWT session cookie (`jose`) with bcrypt hashing — no
third-party auth service, no session table.

- **Every operational row carries `gym_id`**, so tenant isolation is a single
  indexed predicate on every query — the property `check:isolation` asserts.
- **One portal per role.** `portalFor()` maps a role to exactly one prefix and the
  proxy redirects anything else, before the response streams.
- **Owner-only screens** (`/gym/staff`, `/gym/billing`) are checked in the proxy
  _and_ in the page.
- **Staff notes never leave staff routes.** No member-facing query selects
  `TrainerNote`, and the checks probe every member page for note fragments.
- **Stale tokens die on the next request.** `sessionIsLive()` rejects a token
  whose role, tier, access window, gym status or profile no longer matches the
  database — a demotion, a suspension, a lapse or a renewal all take effect
  immediately.
- **Signing out means signed out.** Browsers keep a rendered page in the
  back/forward cache and restore it without asking the server, so Back after a
  sign-out used to put the dashboard back on screen. `Cache-Control: no-store` is
  the only header that prevents that and Next rewrites it on dynamic pages, so
  `SessionGuard` — mounted in every signed-in layout — listens for `pageshow` with
  `persisted: true` and reloads. The server then decides who is asking.
- **Passwords are never serialised.** The checks assert no bcrypt prefix appears
  in any page payload.

---

## Data model

```
Gym (tenant)
 ├── User ─┬─ TrainerProfile (owner / staff)
 │         └─ ClientProfile  (member)
 ├── GymLink            (pin links + click counts)
 ├── PlatformOrder      (what the gym paid us)
 ├── Attendance         (every visit; the progress story)
 ├── GymClass ─┬─ ClassBooking
 │             └─ ClassCancellation
 ├── Lead ──── LeadActivity
 ├── MessageRule ─ MessageLog
 └── Plan ─┬─ Subscription ─ Payment
           ├── WorkoutPlan ─ WorkoutDay ─ Exercise ─ ExerciseLog
           └── DietPlan ─ MealGuideline
```

`TrainerNote` hangs off a member and its author, and is staff-private.

Roles: `SUPER_ADMIN`, `GYM_OWNER`, `GYM_STAFF`, `MEMBER`, `PROSPECT` (an account
with no gym yet, mid-funnel).

Extensions marked as such in `schema.prisma` — nothing in the core depends on
them: `workout_days` + `exercises`, `exercise_logs`, `meal_guidelines`,
`message_rules` + `message_logs`, `gym_classes` + `class_bookings` +
`class_cancellations`, `leads` + `lead_activity`.

Deletes are `Restrict` on historical rows (payments, subscriptions), so a cleanup
can never quietly erase money that came in. `deleteGymAction` walks the graph
innermost-outwards in one transaction.

---

## Running it

Requires Node 20+ and local PostgreSQL 16.

```bash
npm install
cp .env.example .env        # DATABASE_URL, AUTH_SECRET, APP_URL
npx prisma migrate deploy
npm run db:seed
npm run dev                 # http://localhost:3400
```

### Demo accounts — password `demo1234`

| Role                                     | How to sign in                             |
| ---------------------------------------- | ------------------------------------------ |
| Platform admin                           | `admin@beongym.in`                         |
| Gym owner (full workspace)               | `rohit@irontemple.fit`                     |
| Gym staff (no revenue, no billing)       | `alex@irontemple.fit`                      |
| Lapsed owner (lands on the renewal wall) | `sanjay@grindhouse.in`                     |
| Member (the member app)                  | gym code `IRON-4821`, member code `M-0001` |

### What the seed builds

Twelve gyms, nine of them live on the map across seven countries.

Three full workspaces — **Iron Temple Fitness** (Mumbai, annual, 12 members),
**Titan Strength Club** (Bengaluru, six months, 7 members) and **Pulse Fitness
Studio** (Pune, on day 27 of 30, 3 members) — with 22 members, 10 programmes, 23
subscriptions, 34 payments, ~22,000 attendance rows across a full year, 15 classes
with 90 bookings, 18 enquiries and 33 private notes.

Iron Temple has published its prices and Titan has not, so both sides of
`showPrice` are visible; Pulse is deliberately half-set-up so the store checklist
has something to nag about, and its window is nearly out so the renewal nudge has
somewhere to appear.

Alongside them: six paid **listing-only** gyms whose owners never opened the
workspace (Delhi, London, Dubai, New York, Sydney, Toronto), one **lapsed** gym
(Jaipur — signs in, sees the renewal screen, and is off the globe), and two
**unclaimed** listings (Chennai, Kolkata) with links but no accounts and no access,
so they are claimable but unpinned. Dubai's order is a **lifetime** purchase, so
the Elite state has somewhere to show.

### Scripts

| Command                   | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `npm run dev`             | Dev server on port 3400                                               |
| `npm run build`           | Production build                                                      |
| `npm run db:seed`         | Wipe and reseed every gym and listing                                 |
| `npm run db:migrate`      | Create a migration from schema changes                                |
| `npm run db:reset`        | Drop, re-migrate and reseed                                           |
| `npm run db:studio`       | Prisma Studio                                                         |
| `npm run lint`            | ESLint                                                                |
| `npm run check:routes`    | Renders every route as every role (needs the dev server)              |
| `npm run check:isolation` | 62 authorization and routing assertions (needs the dev server)        |
| `npm run check:tenant`    | 185 cross-tenant assertions — runs against Postgres, no server needed |
| `npm run check:globe`     | Asserts no pin overlaps another at seven zoom levels                  |

All four checks and the build are expected to pass before anything ships.

### Marketing photography

`public/marketing/` holds three images used by the "Built for the floor you
actually run" section: `gym-floor.jpg`, `studios.jpg`, `chain.jpg`. They are drawn
as `background-image` over painted gradients, so a missing file degrades to
artwork rather than a broken-image icon. Landscape, 1600px wide or better.

### Stack

Next.js 16 (App Router, Server Components, Server Actions, Turbopack, `proxy.ts`
in place of middleware) · React 19 · TypeScript · Tailwind CSS v4 (CSS-first
`@theme inline`) · PostgreSQL 16 + Prisma 7 with `@prisma/adapter-pg` · `jose` +
bcryptjs · Radix primitives · Recharts · d3-geo + topojson + world-atlas, with
Natural Earth's India point-of-view edition · `qrcode` · Zod · date-fns · lucide.

---

## What is and isn't wired up

**Real database writes:** creating a gym (tenant + owner + starter programmes in
one transaction), staff and access levels, deactivating and restoring logins,
owner-set password resets, onboarding members with auto-generated codes,
programmes, workout and nutrition plans, subscriptions and renewals, auto-renew,
classes and one-off classes, class bookings, waitlists and cancellations,
enquiries and follow-ups, reminder queues, payments, front-desk and QR
check-in/out, private staff notes, exercise ticking, gym branding, profile images,
claiming an unclaimed listing, buying and renewing access (which extends the
window rather than replacing it), and from the console: suspend, reactivate,
retier and delete a gym.

**Deliberately out of scope, and visibly so rather than faked:**

- **No payment gateway.** Member payments, plan purchases, map listings and claims
  are database records; every screen says so. **Dodo Payments** is the intended
  provider — one USD price settled from any country — and wiring it replaces one
  server action: write the order `PENDING`, hand off, provision from the webhook.
- **No automatic WhatsApp sending.** The reminder queue is real — who is due, what
  to say — but a person taps send from their own WhatsApp.
- **No desktop app.** Built, then removed; a browser is what a front desk has open.
- **No hosted geocoder.** Cities resolve from a table in the repo; everything else
  is placed by hand on the map picker.
- **No exercise builder.** Workout days and exercises are read-only in the gym UI.
- **No geofenced check-in.** A member scans the gym's own code; the schema keeps
  `TURNSTILE` for hardware nobody has wired up.
- **No email delivery.** Credentials are handed over by the owner; there is no
  invite email or self-serve password reset.
- **No object storage.** A gym's profile image is downscaled to a 320px square in
  the browser and stored as a data URL — right for a logo, wrong for a gallery,
  which is why there isn't one.

---

## Working on this

**After any schema change, restart the dev server.** Turbopack caches the
generated Prisma client, so a migration that adds a model or an enum value leaves
the running server throwing `Value 'X' not found in enum` or `Cannot read
properties of undefined`:

```bash
rm -rf .next/dev && npx prisma generate && npm run dev
```

**Charts must have `isAnimationActive={false}`.** Recharts freezes its draw
animation when a chart mounts hidden (a background tab, a collapsed panel) and
never finishes it, leaving a blank card.

**`loading.tsx` puts a route in a Suspense boundary**, and React reveals those
through `requestAnimationFrame`. A page tested in a hidden or headless browser
will render but never hydrate, and every button on it looks dead. That is the test
harness, not the app — verify interactive changes in a visible window, or on a
route without a `loading.tsx`.

**Derived state is adjusted during render**, not in an effect —
`react-hooks/set-state-in-effect` is on, and an effect chasing a prop paints the
stale value first.

Before shipping: `npm run build`, `npm run lint`, `npx tsc --noEmit`,
`check:tenant`, then `check:routes`, `check:isolation` and `check:globe`
against a running dev server.

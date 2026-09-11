# BeOnGym

> Gym and fitness business management SaaS for memberships, members, attendance, payments, classes, staff, retention workflows, and public gym discovery.

BeOnGym is a browser-based, multi-tenant platform built for gyms, fitness studios, yoga and Pilates studios, dance studios, CrossFit boxes, martial-arts and boxing gyms, sports clubs, personal trainers, wellness businesses, and similar membership-based businesses.

Each business gets its own isolated workspace, staff roles, member portal, membership and payment records, attendance, classes, messaging workflows, and public profile. The platform also includes a public gym directory with map-based discovery.

**Live application:** https://beongym.vercel.app  
**Repository:** https://github.com/real-VrajSoni/beongym

---

## Product surfaces

BeOnGym is split into four main experiences:

| Surface | Route | Purpose |
| --- | --- | --- |
| Marketing site | `/` | Product, pricing, features, public discovery and sign-up entry points |
| Gym workspace | `/gym` | Owner and staff operations |
| Member portal | `/me` | A member's own membership, attendance, payments, training and classes |
| Public directory | `/gyms` | Discover public gym/business profiles |
| Platform console | `/admin` | Platform-level gym, order, revenue, user, activity and support management |

There are also dedicated flows for sign-up, listing a business, claiming an existing listing, checkout, QR check-in and account authentication.

---

## What the current product includes

### Gym workspace

- Dashboard with operational metrics and activity
- Member/client management
- Member profiles and member history
- Membership plans
- Member subscriptions
- Payment recording and payment history
- Attendance tracking
- Live attendance/occupancy view
- Printable QR check-in poster
- Member self check-in/check-out through QR
- Staff and trainer management
- Owner/staff role separation
- Staff notes
- Training/coaching programmes
- Workout and nutrition-plan attachments
- Class scheduling and timetable management
- Member self-booking for classes
- Lead/enquiry management
- Follow-up tracking
- WhatsApp-ready reminder queue
- Gym profile, branding and public-store configuration
- Public links such as website, Instagram, Facebook, YouTube, WhatsApp, Maps, phone and email
- Billing and renewal management

### Member portal

Members have their own authenticated surface with access to:

- Membership status
- Membership/payment information
- Attendance history
- Personal training/coaching programme
- Workout and nutrition information attached to their programme
- Available classes
- Class booking
- QR attendance flow
- Gym-branded member experience

Member data is scoped to the authenticated member and their gym.

### Public directory

The public directory provides:

- Gym/business profiles
- Business type classification
- Public descriptions and amenities
- Opening hours
- Contact information
- Images and branding
- External links
- Map location
- City and country filtering
- Public profile views
- Map-based gym discovery
- Listing claim flow for eligible unowned listings

The homepage also includes the interactive globe/map experience.

### Platform administration

The platform console provides:

- Platform overview
- Gym/tenant management
- Individual gym administration
- Orders
- Revenue reporting
- User management
- Activity information
- Support surface
- Platform-level controls separate from gym-level permissions

---

## Business types

The underlying data model is intentionally not limited to traditional gyms.

Supported business types currently include:

- Gym
- Fitness studio
- Yoga studio
- Pilates studio
- Dance studio
- CrossFit box
- Martial arts
- Boxing gym
- Climbing gym
- Swimming
- Sports club
- Personal training
- Wellness
- Other

The core operating model is the same: people, memberships, payments, attendance, classes, staff and follow-ups.

---

## Pricing

BeOnGym currently has two purchasable platform plans. Both provide the same product; the difference is the length of access.

| Plan | Price | Access |
| --- | ---: | --- |
| **Pro** | **$20 USD** | 30 days |
| **Annual** | **$149 USD** | 12 months |

The current pricing configuration lives in `lib/platform-plans.ts`, which is the source used by the purchasing surfaces.

Previously sold plans remain represented in the codebase for historical orders, but are no longer purchasable:

- UltraPro / semiannual — retired
- Elite / lifetime — retired

There is currently no free product tier for businesses purchasing platform access.

---

## Platform billing vs gym member payments

These are separate concepts in BeOnGym.

### Gym → BeOnGym

A gym purchases BeOnGym access through the platform checkout. The current integration target is Dodo Payments.

The application has support for:

- Platform orders
- Checkout sessions
- Payment status
- Provider references
- Dodo customer/subscription IDs
- Webhook event persistence
- Webhook idempotency
- Access expiry
- Renewals
- Annual and monthly access
- Test/live Dodo environments

When Dodo credentials are not configured, the application can run in a development/simulated payment mode so local development and automated checks do not require a live gateway.

**Production deployments should be configured with the real gateway before accepting customer payments.**

### Gym → Member

Member payments are represented separately from platform billing. The gym can record member payments against subscriptions/memberships with methods such as:

- UPI
- Card
- Net banking
- Bank transfer
- Cash

This allows a gym to maintain its operational payment ledger even when the member payment itself happens outside BeOnGym.

---

## Multi-tenant architecture

BeOnGym is designed as a tenant-isolated SaaS.

The primary tenancy boundary is:

```text
Platform
  │
  ├── SUPER_ADMIN
  │
  └── Gym / Tenant
        ├── Owners
        ├── Staff / Trainers
        ├── Members
        ├── Membership plans
        ├── Subscriptions
        ├── Payments
        ├── Attendance
        ├── Classes
        ├── Leads
        ├── Messages
        ├── Notes
        └── Public profile
```

Operational records carry their `gymId` directly where appropriate. Server-side actions consistently verify both the authenticated role and the current tenant before reading or mutating tenant data.

This is important because a multi-tenant SaaS must protect against horizontal privilege escalation, not just unauthenticated access.

---

## Roles

The current role model contains:

| Role | Scope | Purpose |
| --- | --- | --- |
| `SUPER_ADMIN` | Platform | Operates BeOnGym itself |
| `GYM_OWNER` | One gym | Full control over a gym |
| `GYM_STAFF` | One gym | Front desk, manager, trainer or other staff workflows |
| `MEMBER` | One gym | Member-facing experience |
| `PROSPECT` | Platform | Account created before a business purchase is completed |

Owners can create, update, activate/deactivate and reset passwords for staff. The system also prevents operations such as leaving a gym without an active owner.

---

## Authentication and authorization

Authentication is implemented in the application rather than delegated to a third-party auth framework.

Current security mechanisms include:

- Password hashing with `bcryptjs`
- Signed session tokens using `jose`
- HTTP-only session cookies
- Secure cookies in production
- SameSite cookie protection
- Role-aware route protection
- Tenant-aware authorization
- Subscription/access checks
- Active-account checks
- Gym suspension checks
- Safe handling of post-login redirects
- Server-side validation with Zod
- Database-level uniqueness constraints
- Explicit tenant filters on operational queries

The authorization layer exposes role/access helpers such as `requirePaidOwner`, `requirePaidStaff` and `requirePaidMember` so protected server actions do not rely on UI restrictions alone.

---

## Memberships and subscriptions

A gym can create its own membership/offer plans for members.

Supported plan types include:

- One-to-one coaching
- Transformation
- Nutrition coaching
- Consultation
- Group coaching

Member subscription intervals include:

- One time
- Monthly
- Quarterly
- Annual

Subscriptions track their own status, payment history and dates independently from the gym's platform subscription.

---

## Attendance and QR check-in

BeOnGym supports both front-desk and member-driven attendance.

### Front desk

Staff can:

1. Find a member.
2. Check them in.
3. Prevent a second open visit for the same member.
4. Check the member out later.

### Member QR flow

A gym can generate a printable QR poster for its entrance.

The flow is:

```text
Gym QR poster
      ↓
Member scans
      ↓
Authenticated member
      ↓
Gym + QR code verification
      ↓
Check in
      ↓
Scan again later
      ↓
Check out
```

The gym can rotate its check-in code. Rotating the code invalidates the previous poster/code.

Attendance records retain their source, including front desk and member app flows.

---

## Classes

The class system includes:

- Class definitions
- Trainers/staff attached to classes
- Scheduled class sessions
- Capacity
- Timetable/calendar views
- Member self-booking
- Booking/cancellation state

Both staff and member surfaces use the same underlying tenant-scoped class data.

---

## Leads and follow-ups

The gym workspace includes a lightweight CRM workflow for enquiries and prospective members.

It is designed around the practical flow:

```text
Enquiry
  ↓
Follow-up
  ↓
Status / conversion
  ↓
Membership
```

This keeps leads inside the same system as the member and subscription records instead of forcing a small gym to maintain a separate CRM.

---

## Messaging and WhatsApp workflow

BeOnGym has a messaging-rule and queue system for recurring member reminders.

Current message workflows include reminders such as:

- Membership expiry
- Outstanding dues
- Birthdays

Staff can configure message rules, generate the current queue, open the prepared WhatsApp message and mark the message as sent or skipped.

The current implementation is **WhatsApp-assisted rather than fully automated**. It does not claim that a WhatsApp Business API message was delivered when a human actually sent it.

A future WhatsApp Business API integration can replace the manual send step while keeping the existing rule/queue model.

---

## Public gym directory

The directory is a second side of the product: businesses get a public presence while the platform provides discovery for people looking for fitness businesses.

### Public profile

A profile can contain:

- Business name
- Tagline
- Description
- Business type
- Location
- Phone/email
- Opening hours
- Amenities
- Branding/accent colour
- Logo/profile image
- External links
- Map coordinates
- Public view count

### Listing and claiming

The repository supports both:

- Paid listing flow for a new business
- Claim flow for an existing unowned listing

The claim flow is protected so an existing owned gym cannot simply be taken over by supplying its public code.

---

## Globe and geolocation system

The public directory includes a custom interactive globe rather than a basic map embed.

The implementation uses:

- `d3-geo`
- `topojson-client`
- `world-atlas`
- Local country geometry
- A custom India geometry override
- Offline city lookup
- Remote geocoding fallback
- A dedicated map picker
- City-based pin grouping and collision-aware layout

The repository includes:

```text
public/geo/countries-110m.json
public/geo/countries-50m.json
public/geo/india.json
```

The coarse country geometry is used for the initial globe; a higher-resolution dataset is available for closer zoom levels.

City lookup first uses the local place dataset and can fall back to remote geocoding. The map picker provides a manual location fallback when an automatic city lookup is insufficient.

---

## Internationalization and currency handling

The platform's own pricing is currently defined in USD.

Gym/member-facing financial records support a gym-selected currency, with currency information stored alongside historical plan/subscription/payment data so past amounts do not change meaning if the gym later changes settings.

The codebase includes geographic currency suggestions and international dial-code data.

Dodo checkout is designed to support eligible payment methods/currencies according to the buyer, account and gateway configuration. The application itself keeps the platform plan price in USD as its canonical platform price.

---

## Payment architecture

The payment system is intentionally separated into small pieces:

```text
Checkout request
      ↓
PlatformOrder
      ↓
Dodo checkout
      ↓
Payment
      ↓
Dodo webhook
      ↓
WebhookEvent / idempotency
      ↓
Order fulfillment
      ↓
Gym creation or access extension
```

Relevant payment modules:

```text
lib/payments/checkout.ts
lib/payments/dodo.ts
lib/payments/events.ts
lib/payments/fulfil.ts
lib/payments/log.ts
app/api/webhooks/dodo/route.ts
```

Webhook events are stored with the provider event ID as a unique key so retried webhook deliveries cannot provision the same purchase repeatedly.

The database also stores provider/customer/subscription references required to reconcile gateway state with a BeOnGym gym.

---

## Data model

The primary Prisma schema is in `prisma/schema.prisma`.

Major entities include:

```text
Gym
User
TrainerProfile
ClientProfile
Plan
Subscription
Payment
Attendance
GymClass
ClassSession
ClassBooking
Lead
TrainerNote
MessageRule
MessageLog
GymLink
PlatformOrder
WebhookEvent
```

The database uses PostgreSQL and Prisma 7 with the PostgreSQL adapter.

Migrations are stored under:

```text
prisma/migrations/
```

The project currently has a single evolving migration history covering the multi-tenant foundation, public listings, billing/orders, messaging, classes, leads, QR check-in, currencies, Dodo subscription linking, business types and additional integrity constraints.

---

## Project structure

The repository is organized around the Next.js App Router plus domain-oriented server/data modules.

```text
beongym/
├── app/
│   ├── (legal)/              # Privacy, terms, refunds, contact
│   ├── actions/              # Server actions
│   ├── admin/                # Platform administration
│   ├── api/                  # Session and webhook endpoints
│   ├── checkin/              # QR check-in entry
│   ├── checkout/             # Payment return flow
│   ├── claim/                # Listing claim flow
│   ├── gym/                  # Gym owner/staff workspace
│   ├── gyms/                 # Public directory and gym profiles
│   ├── list/                 # New business listing flow
│   ├── login/                # Authentication
│   ├── me/                   # Member portal
│   ├── signup/               # Prospect/account creation
│   ├── start/                # Platform onboarding and checkout
│   └── page.tsx              # Marketing homepage
│
├── components/
│   ├── admin/                # Platform admin UI
│   ├── attendance/           # Attendance and QR UI
│   ├── auth/                 # Login/signup UI
│   ├── charts/               # Analytics charts
│   ├── classes/              # Class management UI
│   ├── clients/              # Member management UI
│   ├── dashboard/            # Gym dashboard components
│   ├── directory/            # Globe, map, public directory
│   ├── layout/               # Shared application shells/navigation
│   ├── leads/                # Lead management UI
│   ├── marketing/            # Landing page sections
│   ├── member/               # Member portal components
│   ├── messages/             # Messaging UI
│   ├── payments/             # Payment UI
│   ├── plans/                # Membership plan UI
│   ├── settings/             # Gym/store settings
│   ├── staff/                # Staff management
│   ├── subscriptions/        # Member subscription UI
│   ├── start/                # Platform onboarding UI
│   └── ui/                   # Shared primitives
│
├── lib/
│   ├── data/                 # Tenant/member/domain data access
│   ├── geo/                  # Currency, places, geocoding, globe layout
│   ├── payments/             # Checkout, Dodo, events, fulfillment
│   ├── auth.ts               # Authorization/session helpers
│   ├── platform-plans.ts     # Platform pricing/access rules
│   ├── validation.ts         # Zod validation schemas
│   └── ...
│
├── prisma/
│   ├── schema.prisma         # PostgreSQL/Prisma schema
│   ├── migrations/           # Database migrations
│   └── seed.ts               # Development/demo data
│
├── public/
│   └── geo/                  # Globe/map geometry data
│
├── scripts/
│   ├── isolation-check.ts    # Cross-tenant/authorization checks
│   ├── route-check.ts        # Route access checks
│   ├── tenant-check.ts       # Tenant/data isolation checks
│   ├── webhook-check.ts      # Webhook/payment checks
│   ├── globe-check.ts        # Globe layout checks
│   └── backfill-*.ts         # Data maintenance scripts
│
├── proxy.ts                  # Route/session protection
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Tech stack

### Application

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Radix UI primitives
- Lucide icons
- Motion

### Backend/data

- PostgreSQL
- Prisma 7
- `@prisma/adapter-pg`
- Server Actions
- Zod validation

### Authentication/security

- `jose`
- `bcryptjs`
- HTTP-only cookie sessions
- Role and tenant authorization helpers

### Payments

- Dodo Payments SDK
- Standard Webhooks verification

### Charts/geography

- Recharts
- D3 Geo
- TopoJSON
- World Atlas

### Development

- ESLint
- TypeScript
- TSX scripts
- Prisma migrations/seeding

The current dependency versions can always be found in `package.json`; this README intentionally avoids duplicating every package version.

---

## Local development

### Requirements

You need:

- Node.js
- PostgreSQL
- npm

### 1. Clone the repository

```bash
git clone https://github.com/real-VrajSoni/beongym.git
cd beongym
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

```bash
cp .env.example .env
```

At minimum, configure:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/beongym?schema=public"
AUTH_SECRET="a-random-secret-at-least-32-characters-long"
APP_URL="http://localhost:3400"
```

For local PostgreSQL, create the database first if necessary.

### 4. Apply the database schema

For development:

```bash
npm run db:migrate
```

### 5. Seed development data

```bash
npm run db:seed
```

The seed file contains development/demo fixtures used by the application and its verification scripts.

### 6. Start the development server

```bash
npm run dev
```

The development server runs on:

```text
http://localhost:3400
```

---

## Environment variables

`.env.example` is the authoritative list of environment variables currently expected by the project.

### Required core variables

```env
DATABASE_URL=
AUTH_SECRET=
APP_URL=
```

### Dodo Payments

```env
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PRODUCT_ID_MONTHLY=
DODO_PRODUCT_ID_ANNUAL=
```

The Dodo product IDs correspond to the currently purchasable platform plans:

- Monthly / Pro — $20
- Annual — $149

Optional adaptive-currency configuration is also supported through:

```env
DODO_ADAPTIVE_CURRENCY="1"
```

Do not commit `.env` or real credentials to the repository.

---

## NPM scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js development server on port 3400 |
| `npm run build` | Generate Prisma client and build the Next.js app |
| `npm run start` | Start the production Next.js server on port 3400 |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Seed development/demo data |
| `npm run db:migrate` | Run Prisma development migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset the development database and migrations |
| `npm run check:isolation` | Verify role and cross-tenant isolation |
| `npm run check:routes` | Verify protected route behavior |
| `npm run check:globe` | Verify globe layout/collision behavior |
| `npm run check:tenant` | Run tenant/data isolation checks |
| `npm run check:webhook` | Verify webhook/payment handling behavior |
| `npm run backfill:plans` | Backfill plan data |
| `npm run backfill:places` | Backfill place/geographic data |

Before shipping a change to authentication, tenant boundaries or payments, run the relevant check suites instead of relying only on UI testing.

---

## Testing and verification philosophy

This repository contains explicit verification scripts for security-sensitive behavior.

The isolation checks cover scenarios such as:

- Anonymous users cannot enter protected portals
- Members cannot enter gym/admin workspaces
- Gym staff cannot enter the platform admin surface
- One gym cannot access another gym's members
- Cross-tenant payment data does not leak
- Staff notes do not appear in the member portal
- Leads/classes/messages remain tenant-scoped
- Member routes expose only the authenticated member's own data
- Suspended/expired gym access is enforced

There are also dedicated checks for routes, tenant data access, webhooks and globe layout.

---

## Deployment

The repository is structured for a Next.js deployment and currently uses a Vercel-hosted application URL.

A production deployment needs:

1. A production PostgreSQL database.
2. A strong `AUTH_SECRET`.
3. A production `APP_URL`.
4. Prisma migrations applied to the production database.
5. Dodo live credentials/products.
6. A Dodo webhook endpoint pointing to:

```text
/api/webhooks/dodo
```

7. The correct Dodo webhook signing secret.
8. Production payment-method/currency configuration in Dodo.
9. Monitoring and database backups appropriate for customer data.

### Important payment note

The codebase supports a development/simulated payment mode when Dodo is not configured. **Do not treat simulated checkout as production payment processing.** Production should be configured and verified against Dodo before accepting real customer orders.

---

## Operational access model

A paid gym has an access window controlled by `Gym.accessExpiresAt`.

Renewals extend from an active existing expiry rather than replacing it from the current date. This prevents a gym from losing already-paid days when renewing early.

Access states are represented as:

```text
lifetime
active
expired
none
```

The current purchasable plans are Pro and Annual, so normal customer access is date-based. Historical lifetime records remain readable even though lifetime is no longer sold.

When a gym's access expires, its operational data is retained rather than deleted. The workspace can direct the owner toward renewal while preserving members, subscriptions, payments and attendance history.

---

## Design principles

A few architectural decisions are intentional:

### Server-side authorization is mandatory

UI hiding is not treated as security. Protected server actions and data queries validate the current role and tenant.

### Tenant IDs are explicit

Tenant-scoped tables generally carry `gymId` directly so authorization remains auditable and queries can use a straightforward tenant predicate.

### Historical billing data is preserved

Orders and webhook events are retained rather than overwritten so payment history can be reconciled later.

### Webhooks are idempotent

Provider event IDs are persisted and uniquely constrained to prevent duplicate fulfillment when a gateway retries a webhook.

### Operational data is not deleted on expiry

A subscription/access lapse is a billing state, not a reason to destroy the gym's operational history.

### Messaging does not pretend manual actions are automated

The current WhatsApp workflow records when staff actually send/skip a prepared message instead of falsely claiming delivery.

### Geography has local fallbacks

City lookup uses local data first, remote geocoding second, and a manual map picker when automatic geocoding is insufficient.

---

## Current limitations / not fully automated yet

BeOnGym is actively being developed. The current implementation should be understood as follows:

- Dodo is the intended production platform-payment provider, but local development can run in simulated mode until credentials are configured.
- Member payments are operational records; BeOnGym does not currently require every gym-member payment to pass through a BeOnGym payment gateway.
- WhatsApp reminders currently prepare messages and assist staff; automatic WhatsApp Business API delivery is not yet the default workflow.
- Email invitation/delivery infrastructure for staff is not implemented; owners can create staff credentials directly.
- The product is browser-first rather than a native mobile/desktop application.

These are product boundaries, not hidden behavior.

---

## Security notes

Because BeOnGym handles customer, membership and payment-related data, security-sensitive changes should be treated as production-critical.

When modifying the application, pay particular attention to:

- `lib/auth.ts`
- `proxy.ts`
- `app/actions/*`
- `lib/data/*`
- `app/api/webhooks/dodo/route.ts`
- `lib/payments/*`
- `prisma/schema.prisma`

Never trust a tenant ID, role or payment state supplied by the browser. Re-check it server-side against the authenticated session and database.

---

## Development workflow

A practical workflow for changes is:

```text
1. Change schema/domain logic
       ↓
2. Add/update migration if needed
       ↓
3. Update server action/data access
       ↓
4. Update UI
       ↓
5. Run lint/build
       ↓
6. Run relevant isolation/route/tenant/payment checks
       ↓
7. Test the affected user flow manually
```

For changes involving tenancy, authentication or payments, do not skip the automated verification scripts.

---

## Roadmap direction

The repository is currently focused on getting the core operating system and payment foundation production-ready.

Likely next areas include:

- Complete production Dodo rollout and verification
- Stronger production monitoring and operational tooling
- More complete automated messaging integrations
- Improved onboarding and migration from spreadsheets/registers
- Deeper retention and renewal intelligence
- More powerful multi-branch management
- Additional payment collection options for gym members
- Broader integrations for fitness businesses

The roadmap should follow real customer usage rather than adding features simply because competitors have them.

---

## Contributing

BeOnGym is currently a private product codebase made publicly visible for development and collaboration. If you are working on the repository, keep changes focused and preserve the tenant-isolation and payment invariants described above.

Before opening a change, at minimum run:

```bash
npm run lint
npm run build
```

For relevant changes, also run the appropriate `check:*` scripts.

---

## License

No open-source license is currently declared in the repository. Do not assume the code is licensed for reuse or redistribution.

---

## Repository status

This README describes the implementation on the current `main` branch and should be updated when product behavior, pricing, payment providers, routes or major architectural decisions change.

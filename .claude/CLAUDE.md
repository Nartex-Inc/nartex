# Nartex - Unified Business Management Platform

## Overview
Nartex is an enterprise-grade, French-language SaaS platform for business management, returns processing, and sales analytics. It serves as a unified CRM and business intelligence tool for manufacturing/distribution companies.

## Tech Stack
- **Framework**: Next.js 15.3.2 (App Router) with React 19
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- **Database**: PostgreSQL via Prisma 6.8.2 ORM
- **Authentication**: NextAuth.js 4.24 (Google, Azure AD, Credentials)
- **Data Fetching**: SWR 2.3
- **Charts**: Recharts 2.12
- **Email**: Nodemailer 6.10
- **Deployment**: Docker → AWS ECR → ECS (ca-central-1)

## Project Structure
```
nartex/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # 36 REST API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── catalogue/      # Products, items, pricing
│   │   │   ├── returns/        # Returns management CRUD
│   │   │   ├── prextra/        # ERP integration endpoints
│   │   │   ├── customers/      # Customer data & mapping
│   │   │   ├── orders/         # Order management
│   │   │   ├── dashboard-data/ # Analytics data
│   │   │   └── sharepoint/     # SharePoint integration
│   │   ├── dashboard/          # Main dashboard pages
│   │   │   ├── admin/          # Admin settings
│   │   │   ├── settings/       # User preferences
│   │   │   ├── customer-maps/  # Geographic mapping
│   │   │   ├── pricelist/      # Price management
│   │   │   └── product-requests/
│   │   ├── auth/               # Auth pages
│   │   └── signup/             # Registration
│   ├── components/             # 29 React components
│   │   ├── dashboard/          # Dashboard-specific
│   │   ├── returns/            # Returns module
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/                    # Core utilities
│   │   ├── auth.ts             # NextAuth config
│   │   ├── prisma.ts           # Prisma client
│   │   ├── prextra.ts          # ERP integration
│   │   ├── google-drive.ts     # Drive API
│   │   ├── email.ts            # Nodemailer
│   │   └── theme-tokens.ts     # UI theming
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # TypeScript definitions
├── prisma/
│   ├── schema.prisma           # Database schema (15+ models)
│   └── migrations/             # Migration history
├── public/                     # Static assets
├── certs/                      # SSL certificates (RDS)
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Local dev environment
├── buildspec.yml               # AWS CodeBuild CI/CD
└── middleware.ts               # Auth guard
```

## Database Schema (Prisma)

### Core Domains

**Authentication & Multi-Tenancy:**
- `User` - Users with roles (Gestionnaire, Analyste, Vérificateur, Facturation, Expert)
- `Account` - OAuth linkage (Google, Azure)
- `Session` - JWT sessions
- `Tenant` - Multi-tenant organizations
- `UserTenant` - User-to-tenant relationships
- `Project` - Product lifecycle projects

**Returns Management (Core Business):**
- `Return` - Return headers with status flags (isDraft, isFinal, isVerified)
- `ReturnProduct` - Line items with weights, restocking
- `ReturnAttachment` - Documents

**Prextra ERP (Read-Only Replicas):**
- `Items`, `Locations`, `SOHeader`, `Customers`, `Carriers`
- `Salesrep`, `ShipmentHdr`, `Itemsite`, `Sites`
- `RecordSpecData`, `_DiscountMaintenanceHdr` (used for `_costdiff` pricing in 01-EXP)

### Key Enums
- `UserRole`: Gestionnaire, Analyste, Vérificateur, Facturation, Expert, user
- `Reporter`: expert, transporteur, client, prise_commande, autre
- `Cause`: production, pompe, transporteur, client, expedition, defect, surplus_inventaire
- `ProductLifecycleStage`: DEMANDE_IDEATION, EVALUATION_COUT_POTENTIEL, PROTOTYPAGE, etc.

## Core Features

### 1. Returns Management
- Create draft returns → verify → finalize workflow
- Track products with quantities, weights, restocking amounts
- Attachment management for documentation
- Status tracking: draft, final, verified, standby, pickup, commande, reclamation
- Credit memo management
- Warehouse origin/destination routing

### 2. Sales Analytics Dashboard
- Year-over-year (YOY) sales comparison
- KPI cards: revenue, transactions, growth %, retention rates
- Charts: pie (sales by rep), bar (products/customers), line (trends)
- Retention analysis by sales rep with configurable thresholds
- New customer tracking (no purchases in past 3 years)
- Advanced filtering by rep, products, customers, date ranges

### 3. Price List Management (Pricelist Module)
- Full-screen catalogue page at `/dashboard/pricelist`
- **Column matrix**: Each price list code (01-EXP, 02-DET, 03-IND, etc.) shows a configured set of comparison columns
- **01-EXP special handling**:
  - Protected behind WebAuthn/biometric authentication
  - Uses `_costdiff` from `_DiscountMaintenanceHdr` via `RecordSpecData` to compute tiered pricing above caisse qty
  - Shows `%Exp (vs. IND)` margin column (compares EXP cost against IND sell price)
  - "Envoyer" (email) button disabled when 01-EXP is selected
- **PDF export**: jsPDF + jspdf-autotable with corporate branding, category/class grouping, and conditional `%Exp` column
- **Details mode**: Requires biometric auth to toggle, shows $/Cs and %Exp columns
- **Quick add**: Search panel to add individual items by code
- **Email**: Send generated PDF via Nodemailer

### 4. Integrations
- **Prextra ERP**: Orders, inventory, customer data sync
- **Google Drive**: Document management
- **Google Maps**: Customer geographic visualization
- **SharePoint**: File hierarchy and sharing

### 5. Authentication
- Email/password with bcrypt hashing
- Google OAuth 2.0
- Microsoft Azure AD / Entra ID
- **WebAuthn/Biometric**: Used to gate sensitive views (01-EXP pricelist, details mode) via `@simplewebauthn/browser`
- Role-based access control (RBAC)
- Email verification flow
- Password reset tokens

## API Endpoints (36 Routes)

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth handler
- `POST /api/auth/verify-email` - Email verification

### Returns
- `GET/POST /api/returns` - List/create returns
- `GET/PUT /api/returns/[code]` - Get/update return
- `POST /api/returns/[code]/verify` - Verify return
- `POST /api/returns/[code]/finalize` - Finalize return
- `GET /api/returns/stats` - Statistics
- `GET /api/returns/next-code` - Generate next code

### Catalogue
- `GET/POST /api/catalogue/items` - Items
- `GET/POST /api/catalogue/products` - Products
- `GET/POST /api/catalogue/pricelists` - Price lists
- `GET/POST /api/catalogue/prices` - Prices

### Prextra Integration
- `GET /api/prextra/city` - City lookup
- `GET /api/prextra/sites` - Sites list
- `GET /api/prextra/experts` - Sales reps
- `GET /api/prextra/order` - Order search

### Dashboard & Utilities
- `GET /api/dashboard-data` - Analytics data
- `GET /api/customers/map` - Customer mapping
- `GET /api/health` - Health check

## Coding Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g., `ReturnForm.tsx`)
- Utilities: `kebab-case.ts` (e.g., `theme-tokens.ts`)
- API routes: folder-based (`/api/returns/[code]/route.ts`)

### TypeScript
- Strict mode enabled
- Use Zod for runtime validation
- Types in `src/types/` or `src/lib/types.ts`
- Prisma-generated types for database models

### React Patterns
- Server Components by default (Next.js 15)
- `"use client"` directive only when needed
- SWR for client-side data fetching
- React.useMemo/useCallback for performance

### Styling
- Tailwind CSS utility classes
- shadcn/ui components in `src/components/ui/`
- Theme tokens in `src/lib/theme-tokens.ts`
- Dark mode by default via next-themes

### Git
- Commit messages in English, imperative mood
- Branch naming: `feature/`, `fix/`, `refactor/`

## Commands
```bash
# Development
npm run dev --turbopack     # Start dev server with Turbopack
npm run build               # Production build
npm run start               # Start production server
npm run lint                # ESLint

# Database
npx prisma migrate dev      # Create migration
npx prisma migrate deploy   # Apply migrations
npx prisma generate         # Generate Prisma Client
npx prisma studio           # Database GUI

# Docker (local)
docker-compose up -d        # Start Postgres + app
docker-compose down         # Stop services
```

## Environment Variables
Required in `.env` or `.env.local`:
```
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Integrations
PREXTRA_API_URL=
GOOGLE_DRIVE_CREDENTIALS=
SHAREPOINT_CLIENT_ID=
SHAREPOINT_CLIENT_SECRET=

# Email
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

## Important Rules for Claude

### DO
- Read existing code patterns before making changes
- Use Prisma for all database operations
- Follow the established component structure
- Use SWR hooks for client-side data fetching
- Validate inputs with Zod schemas
- Keep API routes in the App Router pattern
- Use French for user-facing strings (labels, messages)

### DON'T
- Never commit `.env` files or credentials
- Never modify Prextra tables (read-only replicas)
- Don't bypass NextAuth middleware for protected routes
- Don't add new OAuth providers without updating middleware.ts
- Don't use `any` type - define proper TypeScript interfaces
- Don't create new UI components - use shadcn/ui first

## Key Files Reference
| Purpose | File |
|---------|------|
| Auth config | `src/lib/auth.ts` |
| Prisma client | `src/lib/prisma.ts` |
| Database schema | `prisma/schema.prisma` |
| Auth middleware | `middleware.ts` |
| Main dashboard | `src/app/dashboard/page.tsx` |
| Pricelist page | `src/app/dashboard/pricelist/page.tsx` |
| Prices API | `src/app/api/catalogue/prices/route.ts` |
| Prextra helpers | `src/lib/prextra.ts` |
| Theme tokens | `src/lib/theme-tokens.ts` |
| Docker build | `Dockerfile` |
| CI/CD | `buildspec.yml` |

## Deployment
- **Registry**: AWS ECR (`nartex-app`)
- **Orchestration**: AWS ECS
- **Database**: AWS RDS PostgreSQL (ca-central-1)
- **Domain**: app.nartex.ca
- **Build trigger**: AWS CodeBuild via buildspec.yml

## Security Notes
- Production secrets in AWS Secrets Manager
- RDS SSL certificate in `certs/rds-combined-ca-bundle.pem`
- Password hashing: bcryptjs
- JWT-based sessions (stateless)
- Admin bypass: `n.labranche@sinto.ca`

---
*Last updated: 2026-02-13*
*Maintainer: @nlabranche / Nartex-Inc*

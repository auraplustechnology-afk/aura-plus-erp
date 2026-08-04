# Aura Plus ERP

Production ERP system for **Aura Plus Technologies**, Lusaka, Zambia.

**Live URL:** `erp.auraplustechnologies.com`

---

## What's Inside

A complete, modular ERP built on Next.js 15 + Supabase with:

| Module | Description |
|--------|-------------|
| 🔐 Auth | Role-based login (Super Admin, Sales, Technician, Accountant, Manager) |
| 👥 CRM | Lead Kanban board with 7 stages, lead→customer conversion |
| 📄 Quotations | Line-item builder, PDF export matching your existing format |
| 🧾 Invoices | Payment tracking, partial payments, mobile money support |
| 📦 Inventory | Stock management, adjustments, low-stock alerts |
| 🔧 Projects | Multi-technician, checklist, photo uploads |
| 🛠 Technician Portal | Mobile-first field portal — zero financial data |
| 🎫 Tickets | SLA tracking, escalation to project, internal notes |
| 📋 Contracts | Maintenance agreements, invoice generation |
| 💰 Expenses | Expense tracking and categorization |
| 🛡 Asset Register | Company asset tracking, service logs |
| 📊 Reports | Sales, Quotes, Problem Products, Activity Logs |
| 🔍 Search | Global search across all records |

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router, Server Actions)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **UI:** Tailwind CSS + Lucide icons
- **Charts:** Recharts
- **Hosting:** Vercel

---

## Quick Start

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete production deployment guide.

```bash
npm install
cp .env.example .env.local
# Add Supabase credentials to .env.local
npm run dev
```

---

## Document Numbers

| Type | Format | Example |
|------|--------|---------|
| Quote | `AQP-YYYY-00001` | AQP-2026-00001 |
| Invoice | `INV-YYYY-00001` | INV-2026-00001 |
| Project | `PRJ-YYYY-00001` | PRJ-2026-00001 |
| Ticket | `TKT-YYYY-00001` | TKT-2026-00001 |
| Contract | `MCT-YYYY-00001` | MCT-2026-00001 |

---

## Brand

- **Primary:** `#0A1628` (Navy)
- **Secondary:** `#0066FF` (Electric Blue)
- **Success:** `#00C853` (Green)
- **Background:** `#F5F7FA`

---

## File Structure

```
app/
  (auth)/login          — Login + password reset
  (erp)/                — Main ERP (all roles except technician)
    dashboard/          — Home dashboard
    crm/                — Lead Kanban
    customers/          — Customer profiles
    quotations/         — Quote builder + PDF
    invoices/           — Invoice + payment tracking
    inventory/          — Products + stock
    projects/           — Project management
    tickets/            — Support tickets
    contracts/          — Maintenance contracts
    reports/            — Sales, quotes, products reports
    activity-logs/      — Audit trail
    search/             — Global search
    settings/           — Company settings
    users/              — User management
  (technician)/         — Field portal (technicians only)
    my-projects/
    my-tickets/

lib/
  actions/              — Server Actions per module
  supabase/             — Supabase client/server
  utils/format.ts       — ZMW currency, dates, badges

components/
  layout/               — Sidebar, Topbar, Shell
  modules/              — Per-module components
```

**Built for Aura Plus Technologies 🇿🇲**

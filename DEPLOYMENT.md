# Aura Plus ERP — Production Deployment Guide

**URL:** `erp.auraplustechnologies.com`  
**Stack:** Next.js 15 · Supabase · Vercel  
**Last updated:** June 2026

---

## Overview

This guide takes you from a fresh clone to a live production ERP at `erp.auraplustechnologies.com` in approximately **30–45 minutes**.

---

## Step 1: Supabase Project Setup

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it: `aura-plus-erp`
3. Set a strong database password and save it securely
4. Region: Choose **Africa** (or nearest available — Singapore is fine)
5. Click **Create Project** and wait ~2 minutes for provisioning

### 1.2 Run the database schema

1. In Supabase: **SQL Editor** → **New Query**
2. Paste the entire contents of `supabase-schema.sql`
3. Click **Run** (F5)
4. Verify: Go to **Table Editor** — you should see 18+ tables

### 1.3 Create Storage buckets

Go to **Storage** → **New Bucket** for each:

| Bucket Name      | Public | Purpose                        |
|------------------|--------|-------------------------------|
| `company-assets` | ✅ Yes  | Company logo, branding         |
| `project-files`  | ❌ No   | Before/after photos, documents |
| `ticket-files`   | ❌ No   | Support ticket attachments     |
| `avatars`        | ✅ Yes  | User profile photos            |

### 1.4 Configure Storage policies

For `project-files` and `ticket-files` (private buckets), add RLS policies in **Storage → Policies**:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to read their files
CREATE POLICY "Authenticated read" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');
```

### 1.5 Get your API keys

Go to **Settings → API**:
- Copy **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 2: Create Your Super Admin

### 2.1 Invite yourself

1. Go to **Authentication → Users → Invite User**
2. Enter your email address
3. Click **Send Invitation**

### 2.2 Set your profile in the database

1. Go to **Authentication → Users**
2. Copy your User UUID (the long ID next to your email)
3. Go to **SQL Editor** → run:

```sql
INSERT INTO users (id, email, full_name, role, is_active)
VALUES (
  'PASTE-YOUR-UUID-HERE',
  'your@email.com',
  'Your Full Name',
  'super_admin',
  true
);
```

### 2.3 Accept the invitation

Check your email and click the invitation link to set your password.

---

## Step 3: Local Development (Optional)

```bash
# Clone the project
git clone <your-repo>
cd aura-plus-erp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your Supabase credentials in .env.local:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Start development server
npm run dev
# Open http://localhost:3000
```

---

## Step 4: Deploy to Vercel

### 4.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial Aura Plus ERP commit"
git remote add origin https://github.com/YOUR_USERNAME/aura-plus-erp.git
git push -u origin main
```

### 4.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)

### 4.3 Set environment variables

In Vercel → **Settings → Environment Variables**, add:

| Name                         | Value                              | Environments         |
|------------------------------|------------------------------------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL`   | `https://your-project.supabase.co` | Production, Preview  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key`                 | Production, Preview  |
| `NEXT_PUBLIC_APP_URL`        | `https://erp.auraplustechnologies.com` | Production only  |

### 4.4 Deploy

Click **Deploy**. Vercel will build and deploy automatically.

---

## Step 5: Custom Domain

### 5.1 Add domain in Vercel

1. Vercel → Your Project → **Settings → Domains**
2. Add `erp.auraplustechnologies.com`
3. Vercel will show you DNS records to add

### 5.2 Add DNS records

Log in to your domain registrar (wherever `auraplustechnologies.com` is registered) and add:

| Type  | Name  | Value                        |
|-------|-------|------------------------------|
| CNAME | `erp` | `cname.vercel-dns.com`       |

Or if using Vercel's nameservers, the records will be added automatically.

### 5.3 Verify

After DNS propagates (5–60 minutes), visit `https://erp.auraplustechnologies.com` — you should see the login page.

---

## Step 6: Configure Supabase Auth

### 6.1 Set site URL

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://erp.auraplustechnologies.com`
- **Redirect URLs:** 
  ```
  https://erp.auraplustechnologies.com/**
  http://localhost:3000/**
  ```

### 6.2 Email templates (optional)

In **Authentication → Email Templates**, customise the invite email to say "Aura Plus ERP" instead of your Supabase project name.

---

## Step 7: First-Time Setup in the ERP

Log in as Super Admin and complete setup:

### 7.1 Company Settings
Go to **Settings** and fill in:
- ✅ Upload company logo
- ✅ Company name, address, TPIN
- ✅ Phone, email, website
- ✅ Bank details (ABSA Bank Zambia)
- ✅ Default terms and notes

### 7.2 Invite your team

Go to **Users → Invite User** for each team member:
- Sales team → `sales` role
- Field engineers → `technician` role  
- Accounts → `accountant` role
- Managers → `manager` role

### 7.3 Set up inventory

Go to **Inventory → Add Product** for your product catalogue:
- Time attendance machines (TM-20, FP01, AIFace11, AIFace03, etc.)
- CCTV cameras and NVRs
- Networking equipment
- Accessories

### 7.4 Import existing customers (optional)

Add existing customers one by one via **Customers → Add Customer**, or bulk-insert via SQL:

```sql
INSERT INTO customers (company_name, contact_person, phone, email, customer_type, source, created_by)
VALUES 
  ('AMG Investment', 'John Doe', '+260 97 1234567', 'john@amg.co.zm', 'active', 'manual', 'YOUR-USER-UUID'),
  ('Martjude School', 'Jane Smith', '+260 97 7654321', null, 'active', 'manual', 'YOUR-USER-UUID');
```

---

## Step 8: Ongoing Maintenance

### Database backups
Supabase automatically backs up your database daily on paid plans. For the free plan, set up manual exports:

```bash
# Export from Supabase dashboard:
# Database → Backups → Create backup
```

### Adding new activity_log partitions
The activity_logs table is partitioned by month. Add a new partition each year:

```sql
-- Run at the start of each new year
CREATE TABLE activity_logs_2027_01 PARTITION OF activity_logs
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
-- ... repeat for each month
```

### Monitoring
- Check Vercel **Logs** for application errors
- Check Supabase **Logs** for slow queries
- Set up Vercel **Speed Insights** for performance monitoring

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Login redirects to `/login` repeatedly | Check `users` table has a record with matching `auth.users` UUID |
| "No profile" error on login | Insert user record into `users` table (Step 2.2) |
| Photos not uploading | Check Storage bucket exists and policies are set (Step 1.3-1.4) |
| PDF opens blank | Check company logo URL is accessible (must be public bucket) |
| RLS blocking data | Ensure `get_user_role()` function exists in your Supabase schema |
| Vercel build fails | Check TypeScript errors with `npm run build` locally first |

---

## Security Checklist

Before going live:

- [ ] Database password is strong and saved securely
- [ ] Supabase service role key is **never** in `.env.local` for browser use
- [ ] RLS is enabled on all tables (verified in supabase-schema.sql)
- [ ] Storage buckets: `project-files` and `ticket-files` are **private**
- [ ] Vercel environment variables are set for **Production** only
- [ ] Domain is using HTTPS (automatic with Vercel)
- [ ] `NEXT_PUBLIC_APP_URL` is set correctly for auth redirects

---

## Support

For issues with the ERP codebase:
- Review the code in each module's `lib/actions/` file
- Check the Supabase SQL Editor for query debugging
- Review Vercel function logs for server-side errors

**Built for Aura Plus Technologies, Lusaka, Zambia 🇿🇲**

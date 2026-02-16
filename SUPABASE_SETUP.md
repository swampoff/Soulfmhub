# 🗄️ Supabase Backend Setup Guide

Complete guide for setting up and deploying the Supabase backend for Soul FM Hub.

## 📋 Table of Contents

1. [Initial Setup](#initial-setup)
2. [Database Setup](#database-setup)
3. [Functions Deployment](#functions-deployment)
4. [Authentication Configuration](#authentication-configuration)
5. [Storage Configuration](#storage-configuration)
6. [Environment Variables](#environment-variables)
7. [Testing](#testing)

## 🚀 Initial Setup

### Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name:** Soul FM Hub
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your users
   - **Pricing Plan:** Free tier is fine to start

4. Wait for project to provision (~2 minutes)

### Get API Credentials

1. In your Supabase project, go to **Settings → API**
2. Copy these values:
   - **Project URL:** `https://your-project-id.supabase.co`
   - **anon/public key:** Your public API key
   - **service_role key:** Your admin key (keep secret!)

3. Update local configuration:
   ```bash
   # Create .env file
   cp .env.example .env
   
   # Edit .env and add your values
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. Update `utils/supabase/info.tsx` (for backwards compatibility):
   ```tsx
   export const projectId = "your-project-id"
   export const publicAnonKey = "your-anon-key"
   ```

## 🗄️ Database Setup

### Option 1: Quick Setup (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/quick_setup.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Verify success: Check for green success message

This creates:
- ✅ `kv_store_06086aa3` table with JSONB structure
- ✅ All necessary indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Helper functions for search and cleanup
- ✅ Statistics views for monitoring

### Option 2: Individual Migrations

If you prefer to run migrations separately:

```sql
-- 1. Initial Schema
-- Copy/paste: supabase/migrations/00_initial_schema.sql

-- 2. Admin Queries
-- Copy/paste: supabase/migrations/01_admin_queries.sql

-- 3. News Injection System
-- Copy/paste: supabase/migrations/02_news_injection.sql

-- 4. Content Announcements
-- Copy/paste: supabase/migrations/03_content_announcements.sql
```

### Option 3: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Apply all migrations
supabase db push

# Or reset and reapply
supabase db reset
```

### Verify Database Setup

Run this query in SQL Editor to check:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'kv_store_06086aa3';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'kv_store_06086aa3';

-- Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'kv_store_06086aa3';
```

## 🔧 Functions Deployment

The backend API is built with Deno and Hono framework, located in `supabase/functions/`.

### Deploy via Supabase CLI

```bash
# Make sure you're logged in and linked
supabase login
supabase link --project-ref your-project-id

# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy make-server-06086aa3

# View deployment status
supabase functions list
```

### Function Structure

```
supabase/functions/
└── server/
    ├── index.tsx                        # Main entry point
    ├── kv_store.tsx                     # KV store operations
    ├── content-automation-api.ts        # Content automation
    ├── interactive-features.ts          # Interactive features
    ├── news-injection.ts                # News system
    ├── jingles.ts                       # Jingles management
    └── ... (other modules)
```

### Environment Variables for Functions

Functions need their own environment variables:

```bash
# Set secrets for functions
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set ELEVENLABS_API_KEY=your-key

# View current secrets
supabase secrets list

# Unset a secret
supabase secrets unset KEY_NAME
```

### Test Functions Locally

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/make-server-06086aa3' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"action":"GET","key":"tracks"}'
```

## 🔐 Authentication Configuration

### Enable Email Authentication

1. Go to **Authentication → Providers**
2. Email provider should be enabled by default
3. Configure email templates (optional):
   - Go to **Authentication → Email Templates**
   - Customize confirmation, invite, magic link templates

### Configure Redirect URLs

1. Go to **Authentication → URL Configuration**
2. Set **Site URL:** `https://your-vercel-app.vercel.app`
3. Add **Redirect URLs:**
   ```
   https://your-vercel-app.vercel.app/auth/callback
   http://localhost:5173/auth/callback
   ```

### Enable OAuth Providers (Optional)

For Google OAuth:
1. Go to **Authentication → Providers**
2. Enable Google
3. Add credentials from [Google Cloud Console](https://console.cloud.google.com/)
4. Configure OAuth consent screen
5. Add authorized redirect URIs

For GitHub OAuth:
1. Enable GitHub in Supabase
2. Create OAuth app in [GitHub Settings](https://github.com/settings/developers)
3. Add callback URL: `https://your-project-id.supabase.co/auth/v1/callback`

### Row Level Security (RLS)

Our migrations automatically set up these policies:

```sql
-- Public read for all data
CREATE POLICY "Public read access"
ON kv_store_06086aa3 FOR SELECT
USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert"
ON kv_store_06086aa3 FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin users can update/delete
CREATE POLICY "Admin users can update"
ON kv_store_06086aa3 FOR UPDATE
TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admin users can delete"
ON kv_store_06086aa3 FOR DELETE
TO authenticated
USING (is_admin_user(auth.uid()));
```

## 📦 Storage Configuration

Set up storage for tracks, images, and other media files.

### Create Storage Buckets

```sql
-- Media bucket for tracks, covers, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/mp3', 'audio/wav']
);

-- Podcasts bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'podcasts',
  'podcasts',
  true,
  104857600, -- 100MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
);
```

### Set Up Storage RLS Policies

```sql
-- Public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('media', 'podcasts'));

-- Authenticated users can upload
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('media', 'podcasts'));

-- Users can update their own uploads
CREATE POLICY "User can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (owner = auth.uid())
WITH CHECK (bucket_id IN ('media', 'podcasts'));

-- Users can delete their own uploads
CREATE POLICY "User can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (owner = auth.uid());
```

### Configure Storage in Dashboard

1. Go to **Storage** in Supabase Dashboard
2. Create buckets: `media`, `podcasts`
3. Set as public
4. Configure file size limits
5. Set allowed MIME types

## 🔑 Environment Variables Summary

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STREAM_URL=https://your-icecast-server.com/stream
NODE_ENV=production
```

### Backend (Supabase Secrets)

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ELEVENLABS_API_KEY=...
supabase secrets set ADMIN_EMAIL=admin@yourdomain.com
```

### Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STREAM_URL` (optional)

## ✅ Testing

### Test Database Connection

```typescript
// Run in browser console after app loads
import { supabase } from './src/lib/supabase';

// Test query
const { data, error } = await supabase
  .from('kv_store_06086aa3')
  .select('*')
  .limit(1);

console.log('Data:', data);
console.log('Error:', error);
```

### Test Authentication

```typescript
// Sign up test user
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
});

console.log('User:', data.user);
console.log('Error:', error);
```

### Test Functions

```bash
# Using curl
curl -X POST https://your-project-id.supabase.co/functions/v1/make-server-06086aa3 \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"GET","key":"tracks"}'
```

### Test Storage Upload

```typescript
// Upload file test
const file = new File(['test'], 'test.txt', { type: 'text/plain' });
const { data, error } = await supabase.storage
  .from('media')
  .upload(`test/${Date.now()}.txt`, file);

console.log('Uploaded:', data);
console.log('Error:', error);
```

## 🔍 Monitoring

### View Logs

- **API Logs:** Supabase Dashboard → Logs → API
- **Auth Logs:** Supabase Dashboard → Logs → Auth  
- **Function Logs:** 
  ```bash
  supabase functions logs make-server-06086aa3
  ```
- **Real-time Logs:**
  ```bash
  supabase functions logs --tail
  ```

### Monitor Usage

- **Database:** Dashboard → Database → Usage
- **API:** Dashboard → Settings → API → Usage
- **Storage:** Dashboard → Storage → Usage

### Set Up Alerts

1. Go to Dashboard → Settings → Alerts
2. Configure email notifications for:
   - High API usage
   - Database storage warnings
   - Failed function invocations

## 🚨 Troubleshooting

### Connection Issues

**Problem:** Can't connect to Supabase

**Solutions:**
1. Verify URL and key in `.env`
2. Check browser console for CORS errors
3. Verify project is active in Supabase Dashboard
4. Check if your IP is blocked (uncommon)

### Migration Errors

**Problem:** SQL migration fails

**Solutions:**
1. Check for syntax errors in SQL
2. Ensure migrations run in order
3. Drop and recreate table if needed:
   ```sql
   DROP TABLE IF EXISTS kv_store_06086aa3 CASCADE;
   -- Then run migration again
   ```

### Function Deployment Issues

**Problem:** Function deploy fails

**Solutions:**
1. Check Deno syntax in functions
2. Verify all imports are correct
3. Check function logs:
   ```bash
   supabase functions logs make-server-06086aa3
   ```
4. Test locally first:
   ```bash
   supabase functions serve
   ```

### Authentication Issues

**Problem:** Can't sign up/in

**Solutions:**
1. Check email confirmation is disabled for testing (Auth → Providers)
2. Verify redirect URLs are correct
3. Check browser console for errors
4. Clear browser cache and cookies

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Storage Guide](https://supabase.com/docs/guides/storage)

## 🎉 Next Steps

After completing Supabase setup:

1. ✅ Deploy frontend to Vercel → See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
2. ✅ Initialize demo data in admin panel
3. ✅ Configure Icecast integration → See [ICECAST_INTEGRATION.md](./ICECAST_INTEGRATION.md)
4. ✅ Set up custom domain
5. ✅ Configure monitoring and alerts

Your Supabase backend is now ready! 🚀

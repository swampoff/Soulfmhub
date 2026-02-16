# 🚀 Vercel Deployment Guide for Soul FM Hub

This guide walks you through deploying Soul FM Hub on Vercel with Supabase backend.

## 📋 Prerequisites

- [Vercel Account](https://vercel.com/signup)
- [Supabase Project](https://supabase.com/dashboard)
- GitHub Repository (this repo)
- Node.js 18+ installed locally

## 🎯 Quick Deploy

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select `swampoff/Soulfmhub`

2. **Configure Build Settings**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variables**
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
   
   Get these from: Supabase Dashboard → Settings → API

4. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes for build to complete
   - Your site will be live at: `your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
cd /path/to/Soulfmhub
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? (accept default or customize)
# - Directory? ./ (accept default)
# - Override settings? N

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

## 🔧 Environment Variables Setup

### Required Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | Supabase Dashboard → Settings → API → Project API keys → anon public |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_STREAM_URL` | Icecast/SHOUTcast stream URL | Not set |
| `NODE_ENV` | Environment mode | production |

### Setting Environment Variables in Vercel

**Via Dashboard:**
1. Go to your project in Vercel
2. Settings → Environment Variables
3. Add each variable with its value
4. Select environments: Production, Preview, Development
5. Save

**Via CLI:**
```bash
vercel env add VITE_SUPABASE_URL production
# Paste your Supabase URL when prompted

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste your anon key when prompted
```

## 🗄️ Supabase Setup

### 1. Database Migration

Run the SQL migrations in your Supabase project:

```bash
# Option A: Via Supabase Dashboard
1. Go to SQL Editor in Supabase Dashboard
2. Click "New Query"
3. Copy contents of supabase/migrations/quick_setup.sql
4. Paste and click "Run"

# Option B: Via Supabase CLI
supabase db push
```

### 2. Enable Row Level Security (RLS)

The migrations automatically set up RLS policies. Verify in:
- Supabase Dashboard → Authentication → Policies

### 3. Configure Storage (if using file uploads)

```sql
-- Create storage bucket for tracks/images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true);

-- Set up RLS for storage
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');
```

## 🔐 Authentication Setup

### Enable Auth Providers in Supabase

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable desired providers:
   - Email (already enabled)
   - Google OAuth (optional)
   - GitHub OAuth (optional)

3. Configure redirect URLs:
   ```
   https://your-project.vercel.app/auth/callback
   http://localhost:5173/auth/callback (for local dev)
   ```

### Update Site URL in Supabase

1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL: `https://your-project.vercel.app`
3. Redirect URLs: Add your Vercel domain

## 🚀 Deployment Process

### Automatic Deployments

Vercel automatically deploys when you:
- Push to `main` branch → Production deployment
- Push to any branch → Preview deployment
- Open a Pull Request → Preview deployment

### Manual Deployments

```bash
# Deploy current branch to preview
vercel

# Deploy to production
vercel --prod

# Redeploy without changes (useful for env var updates)
vercel --prod --force
```

## 🌐 Custom Domain Setup

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Supabase Redirect URLs**
   - Add your custom domain to allowed redirect URLs
   - Update Site URL if using as primary domain

## 📊 Supabase Functions Deployment

The backend API functions are in `supabase/functions/server/`.

### Deploy via Supabase CLI

```bash
# Install Supabase CLI
npm i -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-id

# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy make-server-06086aa3
```

### Configure Function Environment Variables

```bash
# Set environment variables for functions
supabase secrets set KEY=value

# Example:
supabase secrets set ELEVENLABS_API_KEY=your-key
supabase secrets set OPENAI_API_KEY=your-key
```

## ✅ Post-Deployment Checklist

- [ ] Verify site loads at Vercel URL
- [ ] Test authentication (sign up/sign in)
- [ ] Check database connections
- [ ] Test radio player functionality
- [ ] Verify API endpoints work
- [ ] Check admin panel access
- [ ] Test file uploads (if applicable)
- [ ] Review error logs in Vercel
- [ ] Set up custom domain (optional)
- [ ] Configure CDN/caching (automatic with Vercel)

## 🔍 Troubleshooting

### Build Fails on Vercel

**Issue:** TypeScript errors during build
```bash
# Fix locally first
npm run build

# If successful, commit and push
git add .
git commit -m "Fix build errors"
git push
```

**Issue:** Missing dependencies
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase Connection Issues

**Issue:** "Invalid API key" or connection errors

1. Verify environment variables in Vercel:
   - Check `VITE_SUPABASE_URL` is correct
   - Check `VITE_SUPABASE_ANON_KEY` matches your project

2. Redeploy after fixing variables:
   ```bash
   vercel --prod --force
   ```

**Issue:** CORS errors

1. Check Supabase Dashboard → API Settings
2. Ensure your Vercel domain is in allowed origins

### Authentication Issues

**Issue:** Redirect after login doesn't work

1. Update redirect URLs in Supabase:
   - Authentication → URL Configuration
   - Add: `https://your-project.vercel.app/auth/callback`

2. Clear browser cache and try again

### Function Errors

**Issue:** API endpoints return 404

1. Verify functions are deployed:
   ```bash
   supabase functions list
   ```

2. Check function logs:
   ```bash
   supabase functions logs make-server-06086aa3
   ```

## 📈 Monitoring & Analytics

### Vercel Analytics

Enable in Project Settings → Analytics for:
- Page views
- Performance metrics
- Visitor data

### Supabase Logs

View in Supabase Dashboard:
- Logs → API logs
- Logs → Auth logs
- Logs → Function logs

### Error Tracking

Consider integrating:
- [Sentry](https://sentry.io) for error tracking
- [LogRocket](https://logrocket.com) for session replay
- Vercel's built-in error tracking

## 🔄 Updates & Maintenance

### Deploying Updates

```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# Vercel auto-deploys!
# Watch progress at: https://vercel.com/dashboard
```

### Database Migrations

```bash
# Create new migration
supabase migration new your_migration_name

# Edit the SQL file created in supabase/migrations/

# Apply locally
supabase db reset

# Push to production
supabase db push
```

### Rolling Back

**Vercel:**
- Go to Deployments in dashboard
- Find previous working deployment
- Click "Promote to Production"

**Supabase:**
- Revert database migrations manually
- Or restore from Supabase backup

## 🆘 Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [Project Documentation](./README.md)

## 🎉 Success!

Your Soul FM Hub should now be live on Vercel with Supabase backend!

- **Production URL:** `https://your-project.vercel.app`
- **Supabase Dashboard:** `https://supabase.com/dashboard/project/your-project-id`
- **Vercel Dashboard:** `https://vercel.com/dashboard`

Need help? Check the [troubleshooting section](#-troubleshooting) or open an issue on GitHub.

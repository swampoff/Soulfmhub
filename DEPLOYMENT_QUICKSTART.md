# 🚀 Deployment Quick Start

This guide will help you deploy Soul FM Hub to Vercel with Supabase in under 10 minutes.

## Prerequisites

- GitHub account
- Vercel account ([Sign up free](https://vercel.com/signup))
- Supabase account ([Sign up free](https://supabase.com/dashboard))

## Step 1: Fork/Clone Repository

```bash
git clone https://github.com/swampoff/Soulfmhub.git
cd Soulfmhub
```

## Step 2: Set Up Supabase (5 minutes)

### 2.1 Create Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in details and wait for provisioning

### 2.2 Run Database Migrations
1. Open SQL Editor in Supabase Dashboard
2. Create new query
3. Copy entire contents of `supabase/migrations/quick_setup.sql`
4. Run the query

### 2.3 Get API Credentials
1. Go to Settings → API
2. Copy:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: Your public API key

## Step 3: Deploy to Vercel (3 minutes)

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/swampoff/Soulfmhub)

1. Click button above
2. Import your fork/repo
3. Add environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your anon key
4. Click "Deploy"

### Option B: Manual Deploy via Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables (same as above)
6. Click "Deploy"

### Option C: CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

## Step 4: Deploy Supabase Functions (Optional)

If you want backend features like content automation, news injection, etc:

```bash
# Install Supabase CLI
npm i -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-id

# Deploy functions
supabase functions deploy
```

## Step 5: Initial Setup

1. Visit your deployed site
2. Sign up for an account
3. Go to `/admin` (you'll be the first admin)
4. Click "Initialize Data" to load demo content

## ✅ You're Done!

Your Soul FM Hub is now live at: `your-project.vercel.app`

## Next Steps

- [ ] Configure custom domain in Vercel
- [ ] Set up Icecast stream (see [ICECAST_INTEGRATION.md](./ICECAST_INTEGRATION.md))
- [ ] Customize branding and content
- [ ] Invite team members
- [ ] Configure monitoring

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anon public key |
| `VITE_STREAM_URL` | No | Your Icecast/SHOUTcast stream URL |

### Setting in Vercel

1. Go to your project in Vercel
2. Settings → Environment Variables
3. Add each variable
4. Select: Production, Preview, Development
5. Save and redeploy

## 📚 Detailed Documentation

For more detailed guides:

- 📘 [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Complete Vercel guide
- 🗄️ [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Complete Supabase guide
- 📡 [ICECAST_INTEGRATION.md](./ICECAST_INTEGRATION.md) - Stream setup
- 📖 [PROJECT_INFO.md](./PROJECT_INFO.md) - Full project documentation

## 🐛 Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify your repo has latest changes
- Check build logs in Vercel

### Can't Connect to Supabase
- Verify URL and key are correct
- Check Supabase project is active
- Try redeploying with: `vercel --prod --force`

### Functions Not Working
- Deploy functions: `supabase functions deploy`
- Check function logs: `supabase functions logs`
- Verify secrets are set: `supabase secrets list`

## 🆘 Need Help?

- Check [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) troubleshooting section
- Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) troubleshooting section
- Open an issue on GitHub

## 🎉 Success!

Congratulations! Your radio station is now live! 🎵

Start adding content, configuring your stream, and building your community!

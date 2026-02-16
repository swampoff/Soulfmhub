# ✅ Post-Migration Checklist

This checklist will help you complete the deployment after merging this PR.

## 🚀 Immediate Actions (Required)

### 1. Set Up Supabase Backend
- [ ] Create Supabase project at https://supabase.com/dashboard
- [ ] Note down project URL and anon key
- [ ] Run database migration: `supabase/migrations/quick_setup.sql`
- [ ] Verify tables created successfully
- [ ] Configure authentication settings
- [ ] Set up storage buckets (if needed)

**Guide**: See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 2. Deploy to Vercel
- [ ] Go to https://vercel.com/dashboard
- [ ] Import this GitHub repository
- [ ] Configure build settings (or use defaults)
- [ ] Add environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Deploy and verify deployment successful

**Guide**: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### 3. Initial Setup
- [ ] Visit your deployed site
- [ ] Sign up for first admin account
- [ ] Go to `/admin` page
- [ ] Click "Initialize Data" button
- [ ] Verify demo content loaded

## 🔧 Optional Actions

### Deploy Supabase Functions
- [ ] Install Supabase CLI: `npm i -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref YOUR_ID`
- [ ] Deploy functions: `supabase functions deploy`
- [ ] Set secrets if needed

**When needed**: For content automation, news injection, etc.

### Configure Custom Domain
- [ ] Add custom domain in Vercel settings
- [ ] Configure DNS records
- [ ] Update Supabase redirect URLs
- [ ] Update Site URL in Supabase Auth settings

**Guide**: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md#-custom-domain-setup)

### Set Up Icecast Stream
- [ ] Set up Icecast/SHOUTcast server
- [ ] Get stream URL
- [ ] Add `VITE_STREAM_URL` to Vercel env vars
- [ ] Configure CORS on stream server
- [ ] Test playback

**Guide**: See [ICECAST_INTEGRATION.md](./ICECAST_INTEGRATION.md)

### Configure Monitoring
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure Supabase alerts
- [ ] Set up uptime monitoring

### Enable GitHub Actions
- [ ] Add secrets to GitHub repo:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Verify workflow runs on push
- [ ] Check build status

## 📝 Configuration Reference

### Environment Variables

#### Frontend (Vercel)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_STREAM_URL=https://your-stream.com/stream  # Optional
```

#### Backend (Supabase Secrets)
```bash
supabase secrets set OPENAI_API_KEY=...          # Optional
supabase secrets set ELEVENLABS_API_KEY=...      # Optional
```

### Useful Commands

```bash
# Local Development
npm install              # Install dependencies
npm run dev             # Start dev server
npm run build           # Test production build
npm run preview         # Preview production build

# Deployment
vercel                  # Deploy preview
vercel --prod          # Deploy production
vercel env add VAR     # Add environment variable

# Supabase
supabase start         # Start local Supabase
supabase db push       # Push migrations
supabase functions deploy  # Deploy all functions
supabase secrets set KEY=value  # Set secret
```

## 🧪 Testing Checklist

After deployment, verify:

### Frontend
- [ ] Home page loads
- [ ] Navigation works
- [ ] Radio player appears (even without stream)
- [ ] Schedule page shows correctly
- [ ] Shows/Podcasts page displays
- [ ] Music library accessible
- [ ] News/blog section works
- [ ] Admin panel loads

### Authentication
- [ ] Sign up works
- [ ] Sign in works
- [ ] Sign out works
- [ ] Protected routes redirect to login
- [ ] Admin routes check permissions

### Data
- [ ] Demo data initialized
- [ ] Tracks display correctly
- [ ] Shows display correctly
- [ ] Schedule displays correctly
- [ ] News articles display

### Performance
- [ ] Page load time < 3 seconds
- [ ] Images load properly
- [ ] No console errors
- [ ] Mobile responsive

## 🆘 Troubleshooting

### Build Fails
- Check environment variables are set
- Verify Supabase URL is correct
- Check build logs in Vercel dashboard

### Can't Connect to Database
- Verify Supabase project is active
- Check environment variables
- Verify anon key is correct
- Check RLS policies allow read access

### Functions Don't Work
- Deploy functions: `supabase functions deploy`
- Check function logs: `supabase functions logs`
- Verify secrets are set

### Authentication Issues
- Check redirect URLs in Supabase
- Verify Site URL is set correctly
- Check email confirmation settings

## 📚 Documentation

Reference these guides as needed:

- 🚀 [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md) - 10-minute guide
- 📘 [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Complete Vercel setup
- 🗄️ [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Complete backend setup
- 📡 [ICECAST_INTEGRATION.md](./ICECAST_INTEGRATION.md) - Stream configuration
- 📋 [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) - What changed

## ✅ Success Criteria

Your deployment is successful when:

✅ Site is live and accessible  
✅ You can sign up and log in  
✅ Demo data is visible  
✅ Admin panel is accessible  
✅ No critical errors in console  
✅ Mobile view works properly  

## 🎉 You're Done!

Once all required actions are complete, your Soul FM Hub is live!

**Your site**: `https://your-project.vercel.app`  
**Admin panel**: `https://your-project.vercel.app/admin`

Start customizing, adding content, and building your radio community! 🎵

---

Need help? Check the troubleshooting sections in the documentation guides.

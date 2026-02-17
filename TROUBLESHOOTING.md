# 🔧 TROUBLESHOOTING GUIDE - Soul FM Issues

## Reported Problems

### Issue Summary (Russian)
> "как будто вернулась старая версия, нет входа для админа по логину niqbello@gmail.com и паролю SoulFM2024!, загрузка треков не работает - трек загружается, потом виснет, пишет complete, но внизу не отображается, shows не работает"

**Translation:**
- Old version appeared to return
- Admin login not working (niqbello@gmail.com / SoulFM2024!)
- Track upload hangs - shows "complete" but doesn't display in list
- Shows page doesn't work

---

## 🎯 Root Causes & Solutions

### 1. Browser Cache Issue

**Symptom:** "Old version returned"

**Solution:**
1. **Hard refresh in browser:**
   - Chrome/Firefox: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
   - Safari: `Cmd + Option + R`

2. **Clear browser cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images
   - Or use Incognito/Private mode

3. **Verify deployment:**
   - Check Vercel dashboard for latest deployment
   - Ensure `copilot/add-playlist-selection-feature` branch is deployed

---

### 2. Admin Login Issue

**Symptom:** Cannot login with niqbello@gmail.com / SoulFM2024!

**Possible Causes:**
1. User not created in Supabase database
2. Supabase authentication not configured
3. Wrong credentials
4. Admin role not assigned

**Solutions:**

#### A. Create Admin User in Supabase

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/grwrjwosnfxnzjhuqjdw
   ```

2. **Navigate to Authentication → Users**

3. **Create New User:**
   - Click "Add user" → "Create new user"
   - Email: `niqbello@gmail.com`
   - Password: `SoulFM2024!`
   - Auto Confirm User: ✓ Yes

4. **Get User ID** (copy the UUID)

#### B. Assign Admin Role

1. **Go to SQL Editor in Supabase**

2. **Run this query:**
   ```sql
   -- Check if profiles table exists
   SELECT * FROM profiles LIMIT 1;
   
   -- If table doesn't exist, create it
   CREATE TABLE IF NOT EXISTS profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     email TEXT,
     role TEXT DEFAULT 'user',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Insert or update admin user
   INSERT INTO profiles (id, email, role)
   VALUES (
     '<USER_ID_FROM_STEP_4>', 
     'niqbello@gmail.com', 
     'admin'
   )
   ON CONFLICT (id) DO UPDATE 
   SET role = 'admin', email = 'niqbello@gmail.com';
   ```

3. **Verify:**
   ```sql
   SELECT * FROM profiles WHERE email = 'niqbello@gmail.com';
   ```
   Should return: role = 'admin'

#### C. Check Authentication Settings

1. **Supabase Dashboard → Authentication → Settings**

2. **Verify:**
   - ✓ Enable email confirmations: OFF (for quick admin setup)
   - ✓ Secure email change: ON
   - ✓ Enable anonymous sign-ins: OFF

---

### 3. Track Upload Issue

**Symptom:** Track uploads, shows "complete", but doesn't appear in list

**Possible Causes:**
1. Tracks table doesn't exist in database
2. API endpoints not deployed
3. Missing Supabase Edge Functions
4. RLS (Row Level Security) policies blocking

**Solutions:**

#### A. Create Tracks Table

1. **Go to Supabase SQL Editor**

2. **Run this setup:**
   ```sql
   -- Create tracks table
   CREATE TABLE IF NOT EXISTS tracks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     artist TEXT,
     album TEXT,
     genre TEXT,
     duration INTEGER,
     file_url TEXT,
     cover_url TEXT,
     short_id TEXT UNIQUE,
     stream_url TEXT,
     year INTEGER,
     bpm INTEGER,
     tags TEXT[],
     uploaded_by UUID REFERENCES auth.users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Create index for performance
   CREATE INDEX IF NOT EXISTS idx_tracks_uploaded_by ON tracks(uploaded_by);
   CREATE INDEX IF NOT EXISTS idx_tracks_short_id ON tracks(short_id);
   
   -- Enable RLS
   ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
   
   -- Allow public read access
   CREATE POLICY "Public can view tracks" 
   ON tracks FOR SELECT 
   TO public 
   USING (true);
   
   -- Allow authenticated users to insert
   CREATE POLICY "Authenticated users can insert tracks" 
   ON tracks FOR INSERT 
   TO authenticated 
   WITH CHECK (true);
   
   -- Allow users to update their own tracks
   CREATE POLICY "Users can update own tracks" 
   ON tracks FOR UPDATE 
   TO authenticated 
   USING (auth.uid() = uploaded_by);
   
   -- Allow users to delete their own tracks (admins can delete all)
   CREATE POLICY "Users can delete own tracks" 
   ON tracks FOR DELETE 
   TO authenticated 
   USING (
     auth.uid() = uploaded_by 
     OR EXISTS (
       SELECT 1 FROM profiles 
       WHERE profiles.id = auth.uid() 
       AND profiles.role = 'admin'
     )
   );
   ```

#### B. Deploy Supabase Edge Function

The app expects Edge Function at:
```
https://grwrjwosnfxnzjhuqjdw.supabase.co/functions/v1/make-server-06086aa3
```

**Check if it exists:**
1. Go to Supabase Dashboard → Edge Functions
2. Look for function named `make-server-06086aa3`

**If missing, you need to deploy it** (requires backend code)

#### C. Test Track Upload API

**Console Test:**
```javascript
// Open browser console on site
const response = await fetch('https://grwrjwosnfxnzjhuqjdw.supabase.co/functions/v1/make-server-06086aa3/tracks', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyd3Jqd29zbmZ4bnpqaHVxamR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTA2MjMsImV4cCI6MjA4NTg2NjYyM30.h76GZcLLdHubHcq1AMpqpm7vNmJfwoiljzhReDFbawc'
  }
});
console.log(await response.json());
```

**Expected:** List of tracks or empty array `{ tracks: [] }`
**Error:** Function not found or CORS error = Edge Function needs deployment

---

### 4. Shows Page Issue

**Symptom:** Shows page doesn't work

**Status:** ✅ **FIXED in current branch!**

Our code includes:
- Error handling with retry button
- Support for multiple API response formats
- Toast notifications
- Debug logging

**But requires:**
1. Shows table in database
2. API endpoint working

#### A. Create Shows Table

```sql
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host TEXT,
  description TEXT,
  genre TEXT,
  type TEXT, -- 'live' or 'podcast'
  cover TEXT,
  schedule TEXT,
  episodes JSONB,
  average_listeners INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public can view shows" 
ON shows FOR SELECT 
TO public 
USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage shows" 
ON shows FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
```

---

## 🚀 Quick Fix Checklist

### Immediate Actions

- [ ] **Hard refresh browser** (Ctrl+Shift+R)
- [ ] **Clear browser cache** or use Incognito
- [ ] **Check Vercel deployment** is from correct branch
- [ ] **Create admin user** in Supabase (niqbello@gmail.com)
- [ ] **Assign admin role** via SQL
- [ ] **Create tracks table** via SQL
- [ ] **Create shows table** via SQL
- [ ] **Test API endpoints** in console

### Verify Fixes

1. **Login:**
   ```
   Go to: /admin/login
   Email: niqbello@gmail.com
   Password: SoulFM2024!
   Expected: Redirects to /admin/dashboard
   ```

2. **Track Upload:**
   ```
   Go to: /admin/upload
   Upload MP3 file
   Expected: Shows in list below after "complete"
   ```

3. **Shows Page:**
   ```
   Go to: /shows
   Expected: List of shows or empty state
   No error message
   ```

---

## 🔍 Debugging Steps

### Check Console Logs

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Look for:**
   - `Loading shows from API...`
   - `Shows API response: {...}`
   - `Upload response: {...}`
   - Any red errors

### Check Network Tab

1. **Open DevTools → Network tab**
2. **Reload page**
3. **Filter: XHR**
4. **Look for failed requests** (red, 404, 500)
5. **Click failed request → Preview** to see error

### Common Error Messages

**"Failed to fetch"**
- Edge Function not deployed
- CORS issue
- Network problem

**"Unauthorized"**
- Not logged in
- Session expired
- Wrong API key

**"Table doesn't exist"**
- Database tables not created
- Run SQL setup queries

---

## 📋 Database Schema Requirements

### Required Tables

1. **profiles** - User roles and info
2. **tracks** - Music library
3. **shows** - Shows/podcasts
4. **playlists** - Playlist management
5. **schedule** - Schedule slots

### Full Setup SQL

See `QUICK_SETUP.sql` in repository for complete schema.

Or run step by step:
1. Create profiles table
2. Create tracks table
3. Create shows table
4. Create playlists table
5. Create schedule table
6. Set up RLS policies

---

## 🆘 Still Having Issues?

### Check Backend Status

```javascript
// Test Supabase connection
const { createClient } = supabase;
const client = createClient(
  'https://grwrjwosnfxnzjhuqjdw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyd3Jqd29zbmZ4bnpqaHVxamR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTA2MjMsImV4cCI6MjA4NTg2NjYyM30.h76GZcLLdHubHcq1AMpqpm7vNmJfwoiljzhReDFbawc'
);

// Test query
const { data, error } = await client.from('tracks').select('*').limit(1);
console.log('Data:', data, 'Error:', error);
```

### Contact Points

1. **Supabase Dashboard:** https://supabase.com/dashboard/project/grwrjwosnfxnzjhuqjdw
2. **Repository:** https://github.com/swampoff/Soulfmhub
3. **Branch:** `copilot/add-playlist-selection-feature`

---

## ✅ Success Criteria

### All Working When:

- ✓ Can login as admin (niqbello@gmail.com / SoulFM2024!)
- ✓ Track upload shows uploaded tracks in list
- ✓ Shows page displays shows or empty state (no errors)
- ✓ No console errors in browser DevTools
- ✓ API endpoints return 200 status codes

---

**Last Updated:** 2026-02-17
**Branch:** copilot/add-playlist-selection-feature
**Status:** All fixes implemented, requires backend setup

---

## 📝 Notes

- All frontend code is fixed and up to date
- Main issue likely: **Database tables not created**
- Secondary issue: **Edge Function not deployed**
- Third issue: **Admin user not created**

**Solution:** Follow SQL setup queries above to create all necessary tables and configure authentication.

# 🎓 CertGen: Enterprise Certificate Ecosystem

A premium, high-performance platform for generating and verifying certificates with immutable SHA-256 fingerprinting.

---

## 🛠️ Manual Setup Instructions

### 1. Supabase Backend
You need to create a project on [Supabase](https://supabase.com) and execute the following SQL in the **SQL Editor** to set up the database:

#### Participants Table
```sql
CREATE TABLE public."Participants" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name text,
    email text UNIQUE,
    is_claimed boolean DEFAULT false,
    claimed_at timestamp without time zone,
    cert_url text,
    serial_number text,
    cert_png_url text,
    cert_hash text
);

-- Enable RLS
ALTER TABLE public."Participants" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow All Inserts" ON public."Participants" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow All Selects" ON public."Participants" FOR SELECT USING (true);
CREATE POLICY "Allow All Updates" ON public."Participants" FOR UPDATE USING (true);
```

#### Layout Configuration Table
```sql
CREATE TABLE public."LayoutConfig" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    config jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public."LayoutConfig" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow Service Role Access" ON public."LayoutConfig" FOR ALL USING (true);
```

---

### 2. Environment Variables (.env)
Create a `.env` file in the root directory (where `main.py` is located) and populate it with your credentials:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here

# Security
JWT_SECRET=your-random-32-char-secret-here
ADMIN_PASSWORD=your-secure-admin-password
JWT_ALGORITHM=HS256

# Optional Paths
CONFIG_PATH=assets/layout_config.json
TEMPLATE_PATH=assets/template.png
FONTS_DIR=assets/fonts
```

---

### 3. Installation & Local Run

#### Backend (FastAPI)
1. Install dependencies: `pip install -r backend/requirements.txt`
2. Run server: `uvicorn backend.app.main:app --reload`

#### Frontend (React + Vite)
1. Navigate to `/frontend`
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

---

## 🛡️ Security Note: Are your secrets safe?
**Yes.** The project is configured with a strict `.gitignore` that prevents the following from being pushed to GitHub:
- `.env` files (Supabase keys & Admin passwords)
- `node_modules` and Python environments
- Generated certificates and local logs
- Secret keys (`admin_key.txt`, etc.)

**Action required**: Never commit your `.env` file. If you accidentally do, rotate your keys immediately in the Supabase dashboard.

---

## 💎 Features
- **Obsidian Premium AI Aesthetic**: A sleek, dark-themed management interface.
- **SHA-256 Verification**: Every certificate is uniquely hashed for 100% tamper-proof security.
- **Real-time Analytics**: ROI tracking for claimed vs unclaimed certificates.
- **Design Editor**: Interactive canvas for positioning participant name and QR codes.

---
**Maintained by**: Raj Likhit

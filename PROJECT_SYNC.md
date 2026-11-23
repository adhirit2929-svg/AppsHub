# AppsHub Project Configuration & Sync Spec

## Project Overview
- **Name**: App Hub (`AppsHub`)
- **Live URL (GitHub Pages)**: `https://adhirit2929-svg.github.io/AppsHub/`
- **Description**: A multi-application dashboard suite featuring Fitness Tracker, Calculator, Weather, To-Do, Notes, Settings, and Supabase Auth.
- **Tech Stack**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Supabase.

## Project Location & Remote
- **Local Directory**: `C:\Users\maxer\.gemini\antigravity\scratch\AppsHub`
- **GitHub Account**: `adhirit2929-svg` (`adhirit2929@gmail.com`)
- **Repository**: `adhirit2929-svg/AppsHub` (Branch: `main`)
- **Git Remote**: `git@github.com-adhirt:adhirit2929-svg/AppsHub.git`
- **SSH Key**: `~/.ssh/id_ed25519_adhirit` (using SSH host `github.com-adhirt`)

## Supabase Project Details
- **Project URL**: `https://lqzdochhwqqghekobjdu.supabase.co`
- **Project Ref**: `lqzdochhwqqghekobjdu`
- **Admin & API Keys**: Stored locally in `.env` (service role key + access token).

## Automated GitHub Pages Deployment
- Every `git push origin main` triggers the GitHub Actions workflow in `.github/workflows/deploy-pages.yml`.
- The workflow automatically compiles the Vite bundle and deploys the latest version to `https://adhirit2929-svg.github.io/AppsHub/`.

## AI Continuation Prompt
```markdown
You are managing "AppsHub" (React 18, Vite, TypeScript, Tailwind CSS, Supabase).
Repo: adhirit2929-svg/AppsHub | Local: C:\Users\maxer\.gemini\antigravity\scratch\AppsHub
Live Site: https://adhirit2929-svg.github.io/AppsHub/
Supabase: https://lqzdochhwqqghekobjdu.supabase.co (credentials in .env)
Rules:
- To push & update GitHub Pages: `git push origin main` (triggers automatic deployment).
- To pull updates: `git pull origin main`.
- Supabase admin queries: Use service role key from .env.
```

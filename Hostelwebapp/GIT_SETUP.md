# Git & GitHub Setup Guide

## Step 1 — Install Git

Download and install Git for Windows from: https://git-scm.com/download/win
(Use the default installer options)

After installation, open a new terminal and verify:
```
git --version
```

## Step 2 — Configure Git

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

## Step 3 — Create GitHub Repository

1. Go to https://github.com
2. Click "New repository"
3. Name it: `hostel-management-system`
4. Set to Private (recommended)
5. Do NOT initialize with README (we already have files)
6. Click "Create repository"

## Step 4 — Initialize & Push from D:\Hostelwebapp

Open a terminal in D:\Hostelwebapp and run:

```bash
git init
git add .gitignore
git add .
git commit -m "feat: Step 1 — project foundation, home page, student login"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hostel-management-system.git
git push -u origin main
```

## Step 5 — Verify

Your repository at https://github.com/YOUR_USERNAME/hostel-management-system
should now contain:
- client/       (React + TypeScript frontend)
- server/       (Node.js + Express + TypeScript backend)
- prisma/       (Prisma schema + seed)
- .gitignore    (secrets and node_modules excluded)

## Important Notes

- server/.env is in .gitignore — NEVER commit it
- node_modules/ are excluded — run npm install after cloning
- The DATABASE_URL in server/.env contains your password — keep it private

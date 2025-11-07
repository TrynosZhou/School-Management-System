# Database Backup & Recovery Guide

## ⚠️ Important: Prevent Future Data Loss

Your database is now configured but **data is NOT automatically backed up**. Follow these steps to protect your data.

---

## Quick Backup (Manual)

Run this command whenever you want to create a backup:

```powershell
.\backup-database.ps1
```

This creates a timestamped backup file in the `backups/` folder.

---

## Automated Daily Backups (Recommended)

### Option 1: Windows Task Scheduler

1. Open **Task Scheduler** (search in Start menu)
2. Click **Create Basic Task**
3. Name: `SchoolPro Daily Backup`
4. Trigger: **Daily** at 2:00 AM (or your preferred time)
5. Action: **Start a program**
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\DELL\Desktop\schoolPro\backup-database.ps1"`
   - Start in: `C:\Users\DELL\Desktop\schoolPro`
6. Click **Finish**

### Option 2: Manual Reminder

Set a daily reminder on your phone/calendar to run the backup script.

---

## Restore from Backup

If you need to restore data:

```powershell
.\restore-database.ps1
```

You'll see a list of available backups. Choose one to restore.

---

## Backup Storage Recommendations

1. **Keep backups in multiple locations:**
   - Local: `schoolPro/backups/` folder
   - External: Copy to USB drive weekly
   - Cloud: Upload to Google Drive, Dropbox, or OneDrive

2. **Backup before major changes:**
   - Before updating the application
   - Before bulk data imports
   - Before schema migrations

3. **Test your backups:**
   - Occasionally restore a backup to a test database to ensure it works

---

## What's Backed Up?

The backup includes:
- ✅ All students
- ✅ All teachers
- ✅ All classes
- ✅ All subjects
- ✅ All marks
- ✅ All report cards
- ✅ All user accounts
- ✅ All system settings

---

## Current Situation

⚠️ **Your previous data is not recoverable** unless you have a backup file saved elsewhere.

The database now contains only demo data:
- 1 admin account
- 2 demo students
- 2 demo teachers
- 3 demo subjects
- 3 demo classes

You'll need to re-enter your real data through the application.

---

## Next Steps

1. ✅ Run `.\backup-database.ps1` **right now** to create your first backup
2. ✅ Set up automated daily backups (see above)
3. ✅ Start entering your real data
4. ✅ Run backup script after each major data entry session
5. ✅ Copy backups to external storage weekly

---

## Emergency Recovery

If you have a `.sql` backup file from anywhere:

```powershell
# Restore from any SQL file
.\restore-database.ps1 C:\path\to\your\backup.sql
```

# Setup Automated Database Backups

## ⚠️ Important: The automated backup task requires Administrator privileges

---

## Quick Setup (5 minutes)

### Step 1: Run Setup Script as Administrator

1. **Right-click** on **PowerShell** in the Start menu
2. Select **"Run as Administrator"**
3. Navigate to the project folder:
   ```powershell
   cd "C:\Users\DELL\Desktop\schoolPro"
   ```
4. Run the setup script:
   ```powershell
   .\setup-auto-backup.ps1
   ```

### Step 2: Verify Setup

1. Press **Windows key + R**
2. Type `taskschd.msc` and press Enter
3. Look for **"SchoolPro Daily Backup"** in the Task Scheduler
4. You should see:
   - Status: Ready
   - Trigger: Daily at 2:00 AM
   - Next Run Time: (should show tomorrow at 2:00 AM)

---

## Alternative: Manual Setup

If you prefer to set it up manually without running the script:

### Using Task Scheduler GUI

1. **Open Task Scheduler**
   - Press Windows + R, type `taskschd.msc`, press Enter

2. **Create New Task**
   - Click "Create Basic Task" on the right panel
   - Name: `SchoolPro Daily Backup`
   - Description: `Automatically backup SchoolPro database daily`

3. **Set Trigger**
   - When: **Daily**
   - Start: Tomorrow at **2:00 AM**
   - Recur every: **1 day**

4. **Set Action**
   - Action: **Start a program**
   - Program/script: `powershell.exe`
   - Add arguments: `-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "C:\Users\DELL\Desktop\schoolPro\backup-database.ps1"`
   - Start in: `C:\Users\DELL\Desktop\schoolPro`

5. **Finish and Test**
   - Check "Open properties dialog" before clicking Finish
   - Go to "Settings" tab
   - Check ✅ "Run task as soon as possible after a scheduled start is missed"
   - Check ✅ "If the task fails, restart every: 5 minutes"
   - Click OK

---

## Test Your Backup Now

Before relying on the automated backup, test it manually:

```powershell
.\backup-database.ps1
```

You should see:
```
Creating database backup...
Backup created successfully: .\backups\schoolpro_YYYY-MM-DD_HH-mm-ss.sql (XX KB)
Old backups cleaned up (keeping latest 10)
```

---

## Backup Locations

**Local backups**: `C:\Users\DELL\Desktop\schoolPro\backups\`

**Recommended additional locations**:
1. **External USB Drive**
   - Create a folder: `E:\SchoolPro_Backups\` (or your USB drive letter)
   - Copy backups weekly

2. **Cloud Storage**
   - Google Drive folder: `SchoolPro_Backups`
   - OneDrive folder: `SchoolPro_Backups`
   - Upload backups weekly or use auto-sync folder

---

## Troubleshooting

### "Access is denied" error
- You need to run PowerShell as **Administrator**
- Right-click PowerShell → "Run as Administrator"

### Backups not being created automatically
1. Check Task Scheduler - is the task there?
2. Check task status - does it show errors?
3. Check task history (enable history in Task Scheduler View menu)
4. Verify Docker container is running: `docker ps`

### Backup file is 0 KB or very small
- MySQL container might not be running
- Check: `docker ps` - you should see `schoolpro-mysql`
- Restart: `docker start schoolpro-mysql`

---

## Daily Backup Checklist (Until Automation Works)

Until you get the automated backup working, use this manual checklist:

- [ ] Monday morning - Run `.\backup-database.ps1`
- [ ] Tuesday morning - Run `.\backup-database.ps1`
- [ ] Wednesday morning - Run `.\backup-database.ps1`
- [ ] Thursday morning - Run `.\backup-database.ps1`
- [ ] Friday morning - Run `.\backup-database.ps1`
- [ ] Saturday morning - Run `.\backup-database.ps1` + Copy to USB
- [ ] Sunday morning - Run `.\backup-database.ps1`

---

## Next Steps

1. ✅ Run the setup script **as Administrator** (see Step 1 above)
2. ✅ Verify the task is created in Task Scheduler
3. ✅ Test manual backup: `.\backup-database.ps1`
4. ✅ Copy your first backup to USB drive or cloud storage
5. ✅ Set a reminder to check backups weekly

---

**Remember**: The best backup is worthless if you never test the restore!

Test your backup once:
```powershell
.\restore-database.ps1
```
(Choose the latest backup to verify it works)

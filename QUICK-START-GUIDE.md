# 🚀 SchoolPro Quick Start Guide

## ✅ What's Been Set Up

Your SchoolPro system is now configured with:

### 1. **Database with Demo Data**
- ✅ Admin account: `admin@example.com` / `password123`
- ✅ 2 demo students, 2 demo teachers
- ✅ 3 demo subjects, 3 demo classes

### 2. **Backup System**
- ✅ Manual backup script: `backup-database.ps1`
- ✅ Restore script: `restore-database.ps1`
- ✅ Desktop shortcut: "Backup SchoolPro" on your desktop
- ✅ First backup created: `backups\schoolpro_2025-11-03_15-42-00.sql`

### 3. **Documentation**
- ✅ `BACKUP-GUIDE.md` - Complete backup instructions
- ✅ `SETUP-AUTOMATED-BACKUPS.md` - How to set up automated backups
- ✅ Backup reminder page: `web\src\backup-reminder.html`

---

## 🎯 Next Steps (Do These Now!)

### Step 1: Log In and Change Password (2 minutes)

1. Open your browser to: `http://localhost:4200/login`
2. Login with:
   - Email: `admin@example.com`
   - Password: `password123`
3. Navigate to Settings/Profile
4. **Change your password immediately!**

### Step 2: Create First Real Backup (1 minute)

Double-click the **"Backup SchoolPro"** icon on your desktop

OR

Open PowerShell and run:
```powershell
cd C:\Users\DELL\Desktop\schoolPro
.\backup-database.ps1
```

### Step 3: Set Up Automated Backups (5 minutes)

**Option A: Automated (Recommended)**

1. Right-click PowerShell → "Run as Administrator"
2. Run:
   ```powershell
   cd C:\Users\DELL\Desktop\schoolPro
   .\setup-auto-backup.ps1
   ```
3. Verify in Task Scheduler (Win+R → `taskschd.msc`)

**Option B: Manual Daily Reminder**

1. Open `web\src\backup-reminder.html` in your browser
2. Bookmark it or set it as your homepage
3. Click "I Just Backed Up!" each time you backup

### Step 4: Start Entering Your Data

Navigate through the system and add:
1. **Subjects** - Add all your school subjects
2. **Classes** - Add all your classes/grades
3. **Teachers** - Add all your teachers
4. **Students** - Add all your students
5. **Enrollments** - Link students to classes
6. **Marks** - Enter grades

**IMPORTANT:** Run a backup after each major data entry session!

```powershell
.\backup-database.ps1
```

### Step 5: Backup to External Storage (Weekly)

Every week, copy your backups folder to:
- USB drive
- Cloud storage (Google Drive, OneDrive, Dropbox)

From PowerShell:
```powershell
# Copy to USB (replace E: with your USB drive letter)
Copy-Item .\backups\* E:\SchoolPro_Backups\ -Recurse

# Or use Windows Explorer to copy the backups folder
```

---

## 📋 Daily Workflow

### Every Morning:
1. ✅ Check that Docker is running: `docker ps` (should see schoolpro-mysql)
2. ✅ Start API server (if not running): `cd api; npm run start:dev`
3. ✅ Start web app (if not running): `cd web; npm start`

### After Major Work:
1. ✅ Create backup: Double-click "Backup SchoolPro" desktop icon
2. ✅ Verify backup was created in `backups\` folder

### Every Friday:
1. ✅ Copy `backups\` folder to USB drive
2. ✅ Upload latest backup to cloud storage

---

## 🆘 Quick Commands Reference

### Backup
```powershell
.\backup-database.ps1
```

### Restore
```powershell
.\restore-database.ps1
```

### Start API Server
```powershell
cd api
npm run start:dev
```

### Start Web App
```powershell
cd web
npm start
```

### Check Docker
```powershell
docker ps
```

### Start Docker Database (if stopped)
```powershell
docker start schoolpro-mysql
```

---

## 🔗 Important URLs

- **Main App**: http://localhost:4200
- **Login**: http://localhost:4200/login
- **API**: http://localhost:3000/api
- **API Docs**: http://localhost:3000/api/docs
- **Backup Reminder**: `file:///C:/Users/DELL/Desktop/schoolPro/web/src/backup-reminder.html`

---

## 📞 Troubleshooting

### Can't Login?
- Check API server is running: `cd api; npm run start:dev`
- Check Docker MySQL is running: `docker ps`
- Use demo admin: `admin@example.com` / `password123`

### Data Missing?
- Restore from latest backup: `.\restore-database.ps1`
- Check backups folder for available backups

### Backup Failed?
- Check Docker is running: `docker ps`
- Check MySQL container: `docker start schoolpro-mysql`
- Check disk space

---

## 🎉 You're All Set!

Your SchoolPro system is configured and ready to use. Don't forget to:

1. ✅ Change the admin password
2. ✅ Set up automated backups (run `setup-auto-backup.ps1` as admin)
3. ✅ Create backups regularly
4. ✅ Store backups in multiple locations

**Happy School Managing! 📚**

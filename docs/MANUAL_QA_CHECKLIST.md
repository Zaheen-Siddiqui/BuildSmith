# BuildSmith - Manual QA Checklist
## Step 11 - Integration & End-to-End Validation

**Version:** 1.0  
**Date:** December 11, 2025  
**Tester:** _____________________  
**Test Environment:** Windows VM / Physical Machine

---

## Pre-Test Setup

- [ ] Fresh Windows installation or VM snapshot
- [ ] Administrator privileges available
- [ ] Internet connection (for downloads)
- [ ] VS Code installed (optional - for testing restoration)
- [ ] Docker Desktop installed (optional - for Docker tests)
- [ ] MongoDB Compass installed (optional - for database tests)

---

## Test Case 1: Basic - VS Code Profile Backup & Restore

### 1.1 Scan VS Code Profile
- [ ] Open BuildSmith application
- [ ] Navigate to Scan page
- [ ] Select "VS Code Profile" option
- [ ] Click "Start Scan"
- [ ] **Expected:** List of installed extensions appears
- [ ] **Expected:** Extension count matches actual VS Code extensions
- [ ] Note extension count: _____

### 1.2 Create Bundle
- [ ] Select items to include in bundle (VS Code, Settings)
- [ ] Click "Create Bundle"
- [ ] **Expected:** Progress bar shows scan progress
- [ ] **Expected:** Bundle created successfully
- [ ] **Expected:** Bundle saved to specified location
- [ ] Note bundle size: _____ MB

### 1.3 Restore VS Code Profile
- [ ] Uninstall 2-3 VS Code extensions manually
- [ ] Open BuildSmith Setup page
- [ ] Select the created bundle
- [ ] Choose "VS Code Profile" for restoration
- [ ] Click "Start Setup"
- [ ] **Expected:** Missing extensions are reinstalled
- [ ] **Expected:** Settings restored correctly
- [ ] **Verify:** Open VS Code and check extensions

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 2: Encryption - Bundle Security

### 2.1 Create Encrypted Bundle
- [ ] Run a new scan
- [ ] Enable "Encrypt Bundle" option
- [ ] Enter password: `TestPassword123!`
- [ ] Confirm password
- [ ] Create bundle
- [ ] **Expected:** Bundle has `.encrypted` extension
- [ ] **Expected:** File is not a standard ZIP (can't extract without password)

### 2.2 Decrypt and Restore
- [ ] Open Setup page
- [ ] Select encrypted bundle
- [ ] Enter password: `TestPassword123!`
- [ ] **Expected:** Decryption succeeds
- [ ] **Expected:** Can proceed with restoration
- [ ] Try wrong password first
- [ ] **Expected:** Decryption fails with wrong password

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 3: Docker - Image Backup & Restore

### 3.1 Scan Docker Images
- [ ] Ensure Docker Desktop is running
- [ ] Run scan with "Docker Images" selected
- [ ] **Expected:** List of Docker images appears
- [ ] Note image count: _____
- [ ] **Expected:** Images show repository, tag, size

### 3.2 Export Docker Images
- [ ] Select 1-2 small images for export
- [ ] Create bundle with selected images
- [ ] **Expected:** Bundle size increases appropriately
- [ ] **Expected:** Image export completes without errors

### 3.3 Import Docker Images
- [ ] Remove exported images from Docker: `docker rmi <image>`
- [ ] Verify images are gone: `docker images`
- [ ] Run Setup with Docker bundle
- [ ] **Expected:** Images are restored
- [ ] Verify with: `docker images`
- [ ] Try running a container from restored image
- [ ] **Expected:** Container runs successfully

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 4: Database - MongoDB Connection Restore

### 4.1 Scan MongoDB Connections
- [ ] Ensure MongoDB Compass has at least 1 saved connection
- [ ] Run scan with "Databases" selected
- [ ] **Expected:** MongoDB Compass connections detected
- [ ] Note connection count: _____

### 4.2 Export and Import Connections
- [ ] Create bundle with database connections
- [ ] Manually delete MongoDB Compass connections
- [ ] Restore from bundle
- [ ] **Expected:** Connections reappear in Compass
- [ ] **Verify:** Open MongoDB Compass and check connections list

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 5: Drivers - Device Driver Scan

### 5.1 Scan Installed Drivers
- [ ] Run scan with "Drivers" selected
- [ ] **Expected:** List of device drivers appears
- [ ] Note driver count: _____
- [ ] **Expected:** Drivers show name, version, provider, class

### 5.2 Driver List Export
- [ ] Create bundle with drivers list
- [ ] Extract bundle manually
- [ ] Open `drivers.json` file
- [ ] **Expected:** JSON contains driver details
- [ ] **Expected:** File size is reasonable (< 100 KB)

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 6: Environment - PATH Variables

### 6.1 Scan PATH Entries
- [ ] Run scan with "Environment" selected
- [ ] **Expected:** List of PATH entries appears
- [ ] Note PATH entry count: _____
- [ ] **Expected:** Familiar directories are listed

### 6.2 PATH Restoration (Manual verification)
- [ ] Create bundle with environment settings
- [ ] Note 2-3 custom PATH entries
- [ ] Remove them from PATH temporarily
- [ ] Restore from bundle
- [ ] **Expected:** PATH entries are restored
- [ ] **Verify:** Check System Environment Variables

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 7: Full System Scan - All Components

### 7.1 Complete Scan
- [ ] Select ALL available options:
  - [ ] VS Code Profile
  - [ ] Docker Images
  - [ ] Databases
  - [ ] Drivers
  - [ ] Environment
- [ ] Enable encryption with password
- [ ] Start scan
- [ ] **Expected:** All sections complete successfully
- [ ] **Expected:** No errors in log
- [ ] **Expected:** Bundle created with all components
- [ ] Note total bundle size: _____ MB
- [ ] Note scan duration: _____ minutes

### 7.2 Complete Restore
- [ ] Set up clean Windows VM or fresh user profile
- [ ] Copy bundle to new system
- [ ] Run BuildSmith Setup
- [ ] Select all components for restoration
- [ ] Enter decryption password
- [ ] Start setup
- [ ] **Expected:** All components restore successfully
- [ ] **Expected:** VS Code extensions installed
- [ ] **Expected:** Settings preserved
- [ ] **Expected:** No critical errors

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 8: UI/UX - User Experience

### 8.1 Navigation
- [ ] Click through all pages
- [ ] **Expected:** All pages load without errors
- [ ] **Expected:** Navigation is intuitive
- [ ] **Expected:** No broken links or buttons

### 8.2 Progress Feedback
- [ ] Start a scan operation
- [ ] **Expected:** Progress bar updates in real-time
- [ ] **Expected:** Status messages are clear
- [ ] **Expected:** Logs show detailed information
- [ ] Cancel operation mid-scan
- [ ] **Expected:** Cancellation works cleanly

### 8.3 Error Handling
- [ ] Try to restore with wrong password
- [ ] **Expected:** Clear error message
- [ ] Try to scan without required software
- [ ] **Expected:** Graceful warning, not crash
- [ ] Try to create bundle in read-only location
- [ ] **Expected:** Error message with guidance

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 9: Performance

### 9.1 Scan Performance
- [ ] Measure scan time for VS Code only: _____ seconds
- [ ] Measure scan time with all options: _____ seconds
- [ ] **Expected:** < 30 seconds for VS Code only
- [ ] **Expected:** < 2 minutes for full scan

### 9.2 Bundle Size
- [ ] Note bundle sizes:
  - VS Code only: _____ MB
  - With encryption: _____ MB
  - Full scan: _____ MB
- [ ] **Expected:** Encryption adds < 10% overhead
- [ ] **Expected:** Bundle compresses efficiently

### 9.3 Restore Performance
- [ ] Measure restore time for 50 extensions: _____ minutes
- [ ] **Expected:** < 5 minutes for typical extension set
- [ ] **Expected:** No UI freezing during restore

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Test Case 10: Edge Cases & Error Scenarios

### 10.1 Empty Scan
- [ ] Run scan with no extensions installed
- [ ] **Expected:** Bundle created with empty lists
- [ ] **Expected:** No errors
- [ ] Restore empty bundle
- [ ] **Expected:** No errors, no changes

### 10.2 Large Extension Set
- [ ] Install 100+ VS Code extensions
- [ ] Scan and create bundle
- [ ] **Expected:** All extensions captured
- [ ] **Expected:** No timeout or memory errors

### 10.3 Corrupted Bundle
- [ ] Manually corrupt a bundle file (edit ZIP)
- [ ] Try to restore
- [ ] **Expected:** Clear error message
- [ ] **Expected:** No crash

### 10.4 Duplicate Operations
- [ ] Run two scans simultaneously
- [ ] **Expected:** Both complete or one is queued
- [ ] **Expected:** No file conflicts

**Result:** [ ] PASS [ ] FAIL  
**Notes:** _____________________________________

---

## Overall Assessment

### Summary
- **Total Tests:** 10
- **Passed:** _____
- **Failed:** _____
- **Pass Rate:** _____%

### Critical Issues Found
1. _____________________________________
2. _____________________________________
3. _____________________________________

### Non-Critical Issues
1. _____________________________________
2. _____________________________________
3. _____________________________________

### Performance Notes
- Scan speed: [ ] Excellent [ ] Good [ ] Acceptable [ ] Slow
- Restore speed: [ ] Excellent [ ] Good [ ] Acceptable [ ] Slow
- UI responsiveness: [ ] Excellent [ ] Good [ ] Acceptable [ ] Sluggish

### Recommendations
1. _____________________________________
2. _____________________________________
3. _____________________________________

### Overall Status
- [ ] **Ready for Alpha Release**
- [ ] **Needs Minor Fixes**
- [ ] **Needs Major Fixes**
- [ ] **Not Ready**

**Tester Signature:** _____________________  
**Date Completed:** _____________________

---

## Notes for Developers

### Test Environment Details
- **OS Version:** _____________________
- **VS Code Version:** _____________________
- **Docker Version:** _____________________
- **MongoDB Version:** _____________________
- **BuildSmith Version:** _____________________

### Additional Comments
_____________________________________
_____________________________________
_____________________________________

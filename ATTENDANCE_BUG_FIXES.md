# 🔧 ATTENDANCE SYSTEM BUG FIXES - COMPREHENSIVE REPAIR GUIDE

## 🚨 CRITICAL BUG #0: Production 500 Error - GetActiveSessions

**Error**: `GET /api/dosen/absensi/active` returns 500
**Root Cause**: Line 790 in dosenController.go - String parameter passed to INT column

```go
// ❌ BUGGY (Line 790)
if pertemuanFilter != "" {
    query += fmt.Sprintf(" AND asess.pertemuan_ke = $%d", len(args)+1)
    args = append(args, pertemuanFilter)  // STRING, but pertemuan_ke IS INT!
}
```

**FIX**:
```go
// ✅ FIXED
if pertemuanFilter != "" {
    pertemuan, err := strconv.Atoi(pertemuanFilter)
    if err != nil {
        utils.ValidationError(c, "pertemuan_ke harus berupa angka")
        return
    }
    query += fmt.Sprintf(" AND asess.pertemuan_ke = $%d", len(args)+1)
    args = append(args, pertemuan)  // INT
}
```

---

## 🔴 CRITICAL BUG #1: Type Mismatch session_id (int ↔ text)

**File**: `dosenController.go`
**Locations**: Lines 680-690, 717

**Problem**: session_id inconsistently cast between int and text, breaking auto-alpa logic

### Fix 1A: CloseAttendanceSession (Line 680-690)

```go
// ❌ BUGGY
_, err = config.DB.Exec(`
    INSERT INTO attendance (student_id, session_id, student_code, status, pertemuan_ke, created_at)
    SELECT m.id, $1::text, m.nim, 'alpa', $2, NOW()
    FROM mahasiswa m
    JOIN mahasiswa_mata_kuliah mmk ON m.id = mmk.mahasiswa_id
    WHERE mmk.mata_kuliah_kode = $3
      AND NOT EXISTS (
          SELECT 1 FROM attendance a 
          WHERE a.student_id = m.id AND a.session_id::text = $1::text  // BUG!
      )
`, input.SessionID, pertemuanKe, courseID)
```

**FIX**:
```go
// ✅ FIXED
_, err = config.DB.Exec(`
    INSERT INTO attendance (student_id, session_id, student_code, status, pertemuan_ke, created_at)
    SELECT m.id, $1, m.nim, 'alpa', $2, NOW()
    FROM mahasiswa m
    JOIN mahasiswa_mata_kuliah mmk ON m.id = mmk.mahasiswa_id
    WHERE mmk.mata_kuliah_kode = $3
      AND NOT EXISTS (
          SELECT 1 FROM attendance a 
          WHERE a.student_id = m.id AND a.session_id = $1  // FIXED: No casting
      )
`, input.SessionID, pertemuanKe, courseID)
```

### Fix 1B: CloseAttendanceSession Stats Query (Line 717)

```go
// ❌ BUGGY
config.DB.QueryRow(`
    SELECT 
        COUNT(DISTINCT id),
        COUNT(DISTINCT CASE WHEN status = 'hadir' THEN id END),
        ...
    FROM attendance
    WHERE session_id::text = $1::text
`, input.SessionID).Scan(...)
```

**FIX**:
```go
// ✅ FIXED
config.DB.QueryRow(`
    SELECT 
        COUNT(DISTINCT id),
        COUNT(DISTINCT CASE WHEN status = 'hadir' THEN id END),
        ...
    FROM attendance
    WHERE session_id = $1
`, input.SessionID).Scan(...)
```

### Fix 1C: GetActiveSessions JOIN (Line 780)

```go
// ❌ BUGGY
LEFT JOIN attendance a ON asess.id::text = a.session_id::text
```

**FIX**:
```go
// ✅ FIXED
LEFT JOIN attendance a ON asess.id = a.session_id
```

---

## 🔴 CRITICAL BUG #2: Inconsistent Type Casting in GetAttendanceHistoryByCourse

**File**: `mahasiswaController.go`
**Location**: Lines 719-720

```go
// ❌ BUGGY - Both columns are INT, no need for text casting
JOIN attendance_sessions asess ON a.session_id::text = asess.id::text
```

**FIX**:
```go
// ✅ FIXED
JOIN attendance_sessions asess ON a.session_id = asess.id
```

---

## 🔴 CRITICAL BUG #3: No Session Expiration + Date Validation Mismatch

**File**: `dosenController.go`
**Location**: Lines 93-94, 62-68

### Problem
- CreateAttendanceSession: Expiration set to year 2124 (NEVER expires)
- CreateAttendanceSession: Only checks CURRENT_DATE for duplicate
- ScanAttendance: No date check at all (can scan pertemuan from past weeks!)

### Fix 3A: Set Proper Expiration (Line 93-94)

```go
// ❌ BUGGY
expiresAt := time.Now().AddDate(100, 0, 0)  // Year 2124!
```

**FIX - Option 1 (Duration-based)**:
```go
// ✅ FIXED: Use input.Duration (in minutes) or default 120 minutes
durationMinutes := input.Duration
if durationMinutes <= 0 || durationMinutes > 480 {
    durationMinutes = 120  // Default: 2 hours
}
expiresAt := time.Now().Add(time.Duration(durationMinutes) * time.Minute)
```

**FIX - Option 2 (Explicit time)**:
```go
// ✅ FIXED: Default to end of school day
var jamSelesai string
config.DB.QueryRow("SELECT jam_selesai FROM mata_kuliah WHERE kode = $1", input.CourseID).Scan(&jamSelesai)
// Parse jamSelesai, add 30 mins buffer
// expiresAt = today at jamSelesai + 30 mins
```

### Fix 3B: Update CheckDuplicate Query (Line 62-68)

```go
// ❌ BUGGY - Only checks today, pertemuan in past weeks can have duplicate sessions
err = config.DB.QueryRow(`
    SELECT COUNT(*) 
    FROM attendance_sessions 
    WHERE dosen_id = $1 AND course_id = $2 AND pertemuan_ke = $3 
        AND status = 'active'
        AND (created_at)::date = CURRENT_DATE
`, dosenID, input.CourseID, input.PertemuanKe).Scan(&existingSession)
```

**FIX**:
```go
// ✅ FIXED - Check for ANY active session, regardless of date
err = config.DB.QueryRow(`
    SELECT COUNT(*) 
    FROM attendance_sessions 
    WHERE dosen_id = $1 
        AND course_id = $2 
        AND pertemuan_ke = $3 
        AND status = 'active'
        AND expires_at > NOW()
`, dosenID, input.CourseID, input.PertemuanKe).Scan(&existingSession)
```

### Fix 3C: Add Date Check to ScanAttendance (mahasiswaController.go, after line 584)

```go
// ✅ NEW VALIDATION: Ensure session was created TODAY
var sessionDate time.Time
err = config.DB.QueryRow(`
    SELECT (created_at)::date FROM attendance_sessions WHERE id = $1
`, session.ID).Scan(&sessionDate)

if sessionDate.Before(time.Now().AddDate(0, 0, -1)) {  // More than 1 day old
    utils.ErrorResponse(c, http.StatusBadRequest, 
        "QR Code sudah kadaluarsa. Pertemuan ini dibuat kemarin atau lebih lama.")
    return
}
```

---

## 🟠 HIGH BUG #4: QR Code Format Mismatch

**Backend generates** (dosenController.go:627):
```go
"qr_data": fmt.Sprintf("%s|%s|%d|%d", token, courseID, pertemuanKe, time.Now().Unix())
```

**Frontend expects** (ScanAbsensi.jsx:236-252):
- Format 1: JSON with `session_token` field
- Format 2: Pipe-separated with token as first element

**FIX**: Standardize to JSON format

### Backend Fix (dosenController.go:627)

```go
// ✅ FIXED: Use JSON format
import "encoding/json"

type QRData struct {
    SessionToken string `json:"session_token"`
    CourseID     string `json:"course_id"`
    PertemuanKe  int    `json:"pertemuan_ke"`
    Timestamp    int64  `json:"timestamp"`
}

qrData := QRData{
    SessionToken: token,
    CourseID:     courseID,
    PertemuanKe:  pertemuanKe,
    Timestamp:    time.Now().Unix(),
}
qrBytes, _ := json.Marshal(qrData)

utils.SuccessResponse(c, gin.H{
    ...
    "qr_data": string(qrBytes),  // JSON string
})
```

---

## 🟠 HIGH BUG #5: Race Condition on Double-Click Attendance Submit

**File**: `mahasiswaController.go`
**Location**: Lines 610-624, 638-641

```go
// ❌ BUGGY: SELECT then INSERT (race condition window)
var existingStatus string
err = config.DB.QueryRow(`
    SELECT a.status FROM attendance a
    WHERE a.student_id = $1 AND a.session_id = $2
`)

// Between SELECT and INSERT: Another request could INSERT!

_, err = config.DB.Exec(`INSERT INTO attendance (...)`)
```

**FIX**: Use database constraint OR transaction

### Option A: Add Unique Constraint (Database Migration)

```sql
-- Run this migration
ALTER TABLE attendance 
ADD CONSTRAINT attendance_unique_per_session 
UNIQUE(student_id, session_id);

-- Then handle constraint error in code
```

### Option B: Use Transaction with Serializable Isolation

```go
// ✅ FIXED
tx, err := config.DB.BeginTx(c.Request.Context(), &sql.TxOptions{
    Isolation: sql.LevelSerializable,
})
if err != nil {
    utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal memulai transaksi")
    return
}
defer tx.Rollback()

// Check if already exists
var count int
err = tx.QueryRowContext(c.Request.Context(),
    `SELECT COUNT(*) FROM attendance WHERE student_id = $1 AND session_id = $2`,
    mahasiswaID, session.ID).Scan(&count)

if count > 0 {
    utils.ErrorResponse(c, http.StatusBadRequest, "Anda sudah absen untuk sesi ini")
    return
}

// Insert
_, err = tx.ExecContext(c.Request.Context(),
    `INSERT INTO attendance (student_id, session_id, student_code, status, pertemuan_ke, created_at)
     VALUES ($1, $2, $3, 'hadir', $4, NOW())`,
    mahasiswaID, session.ID, studentCode, session.PertemuanKe)

if err != nil {
    if strings.Contains(err.Error(), "unique") {
        utils.ErrorResponse(c, http.StatusBadRequest, "Anda sudah absen untuk sesi ini")
    } else {
        utils.ErrorResponse(c, http.StatusInternalServerError, "Gagal mencatat absensi: "+err.Error())
    }
    return
}

tx.Commit()
```

---

## 🟠 HIGH BUG #6: Missing Error Handling on attendance_summary Insert

**File**: `mahasiswaController.go`
**Location**: Lines 648-663

```go
// ❌ BUGGY: Error tidak dicek
_, err = config.DB.Exec(`
    INSERT INTO attendance_summary 
    (student_id, nim, student_name, session_id, course_id, course_name, status, 
     attendance_date, attendance_time, dosen_name, hari, jam_mulai, jam_selesai)
    SELECT 
        m.id, m.nim, m.name, $1, mk.kode, mk.nama, 'hadir',
        CURRENT_DATE, NOW(), d.name, mk.hari, mk.jam_mulai, mk.jam_selesai
    FROM mahasiswa m
    JOIN mata_kuliah mk ON mk.kode = $2
    JOIN dosen d ON mk.dosen_id = d.id
    WHERE m.id = $3
    ON CONFLICT (student_id, session_id) DO UPDATE SET
        status = 'hadir',
        attendance_time = NOW()
`, session.ID, session.CourseID, mahasiswaID)

// Error tidak dikembalikan!
```

**FIX**:
```go
// ✅ FIXED
_, err = config.DB.Exec(`
    INSERT INTO attendance_summary 
    (student_id, nim, student_name, session_id, course_id, course_name, status, 
     attendance_date, attendance_time, dosen_name, hari, jam_mulai, jam_selesai)
    SELECT 
        m.id, m.nim, m.name, $1, mk.kode, mk.nama, 'hadir',
        CURRENT_DATE, NOW(), d.name, mk.hari, mk.jam_mulai, mk.jam_selesai
    FROM mahasiswa m
    JOIN mata_kuliah mk ON mk.kode = $2
    JOIN dosen d ON mk.dosen_id = d.id
    WHERE m.id = $3
    ON CONFLICT (student_id, session_id) DO UPDATE SET
        status = 'hadir',
        attendance_time = NOW()
`, session.ID, session.CourseID, mahasiswaID)

// ✅ NOW CHECK ERROR
if err != nil {
    // Log tapi jangan return error ke user
    // (attendance table already inserted, summary is nice-to-have)
    log.Printf("Warning: attendance_summary insert failed: %v", err)
}
```

---

## 🟡 MEDIUM BUG #7: Refetch Interval Mismatch (Dosen vs Mahasiswa)

**File**: 
- `AbsensiDosen.jsx:126` → 5 second refetch
- `ScanAbsensi.jsx:112` → 30 second refetch

**FIX**: Standardize to 10 seconds

```jsx
// ✅ FIXED in both files
refetchInterval: 10000,  // 10 seconds
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Backend Fixes (dosenController.go)
- [ ] Fix GetActiveSessions parameter parsing (strconv.Atoi)
- [ ] Remove all `::text` type casts for session_id
- [ ] Fix session expiration logic (use input.Duration)
- [ ] Update duplicate check query (expires_at > NOW())
- [ ] Add date validation to GetQRCode

### Phase 2: Critical Backend Fixes (mahasiswaController.go)
- [ ] Fix GetAttendanceHistoryByCourse JOIN type casting
- [ ] Add ScanAttendance date check (not older than 1 day)
- [ ] Implement transaction-based duplicate prevention
- [ ] Fix attendance_summary error handling
- [ ] Add parameter validation for pertemuanFilter

### Phase 3: Frontend Fixes
- [ ] Fix QR code format to JSON (AbsensiDosen.jsx)
- [ ] Standardize refetch intervals to 10s
- [ ] Add proper QR token refresh display logic

### Phase 4: Database Fixes
- [ ] Verify attendance(student_id, session_id) unique constraint exists
- [ ] Run migration to fix constraint if missing
- [ ] Verify all type columns are INT not TEXT

---

## 🧪 TESTING AFTER FIXES

```bash
# Test 1: GetActiveSessions with invalid pertemuan_ke
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8080/api/dosen/absensi/active?pertemuan_ke=abc"
# Should return ValidationError, not 500

# Test 2: Double-click attendance scan
# Click scan 2x rapidly for same QR
# Should show "Sudah absen" on 2nd attempt, not duplicate insert

# Test 3: Scan old pertemuan QR
# Try scanning QR from 5 days ago
# Should reject: "QR Code sudah kadaluarsa"

# Test 4: Session expiration
# Create session, wait for duration
# Try scanning after expiration
# Should reject: "Sesi sudah berakhir"
```

---

## 🚀 PRIORITY ORDER

1. **URGENT** (Deploy today): Bug #0 (500 error), #1 (type casting), #3 (expiration)
2. **HIGH** (Deploy this week): Bug #2, #5 (race condition), #6 (error handling)
3. **MEDIUM** (Next sprint): Bug #4 (QR format), #7 (refetch intervals)

---

## 📝 NOTES

- All `session_id` should be INT, never TEXT
- All type casting with `::text` on attendance.session_id is WRONG
- Session expiration must NOT be 100 years in the future
- Frontend and backend QR format must match
- All database inserts must handle errors properly

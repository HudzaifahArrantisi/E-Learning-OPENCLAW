# 🎯 Mobile UI/UX Design Audit Prompt

## Instruksi Utama

Lakukan audit komprehensif terhadap seluruh aplikasi **NF-Student-HUB** untuk mengidentifikasi dan memperbaiki masalah responsiveness, UI/UX design, dan aksesibilitas mobile. 

---

## 📋 Checklist Audit Yang Harus Dilakukan

### 1️⃣ **Analisis Struktur File & Component**
- [ ] Baca semua file di `frontend/src/pages/` (semua role-based dashboards)
- [ ] Baca semua file di `frontend/src/components/` untuk component reusable
- [ ] Periksa `frontend/src/App.jsx` untuk route definitions
- [ ] Analisis `frontend/vite.config.js` dan `tailwind.config.js`
- [ ] Periksa CSS global di `frontend/src/styles/`

### 2️⃣ **Identifikasi Bug Mobile & Design Issues**

Cari masalah berikut di setiap halaman:

#### Layout & Responsive Issues
- ❌ Element yang overflow di mobile (width > 100%)
- ❌ Font size terlalu besar/kecil untuk mobile
- ❌ Padding/margin yang berlebihan di mobile
- ❌ Grid/Flex layout yang tidak responsive
- ❌ Fixed width element (px) yang tidak adaptif
- ❌ Horizontal scrolling yang tidak perlu
- ❌ Image yang tidak responsive (missing max-width)
- ❌ Table yang tidak readable di mobile

#### Touch & Interaction Issues
- ❌ Button/link < 48px (minimum touch target)
- ❌ Click area terlalu kecil untuk jari
- ❌ Spacing antar button/link < 8px
- ❌ Floating button yang menutupi konten
- ❌ Modal/dialog tidak optimized untuk mobile (terlalu besar)
- ❌ Input field terlalu kecil

#### Typography Issues
- ❌ Line-height < 1.5 (readability)
- ❌ Font size < 14px (hard to read)
- ❌ Letter-spacing yang aneh
- ❌ Color contrast < 4.5:1 (WCAG AA)
- ❌ Text yang terpotong (text-overflow issues)

#### Performance & Visual Issues
- ❌ Large image yang belum optimized
- ❌ Animation/transition yang berat
- ❌ Scroll lag atau jank
- ❌ Z-index conflicts
- ❌ Overflow hidden yang sembunyikan konten penting
- ❌ Background image yang jelek di mobile

#### Navigation Issues
- ❌ Menu tidak mobile-friendly (hamburger missing?)
- ❌ Bottom navigation tidak sticky di mobile
- ❌ Navbar yang terlalu tinggi (> 64px)
- ❌ Tab navigation yang tidak scrollable
- ❌ Sidebar yang tidak collapsible

#### Form Issues
- ❌ Input field dengan autocomplete disabled
- ❌ Placeholder text yang terlalu panjang
- ❌ Form field tidak grouped dengan jelas
- ❌ Label yang tidak terlihat
- ❌ Validation error message tidak clear

### 3️⃣ **Analisis Per Role/Dashboard**

Periksa setiap role dengan fokus mobile:
- `Mahasiswa` (Student) - Feed, courses, UKT, messages
- `Dosen` (Lecturer) - Course management, grading
- `Admin` - System dashboard, analytics
- `Orangtua` (Parent) - Child monitoring
- `UKM` & `Ormawa` - Organization dashboard
- `Public` - Landing page, public profiles
- `Auth` - Login page

Untuk setiap halaman tanyakan:
- Apakah halaman terlihat baik di: mobile (320px), tablet (768px), desktop (1024px+)?
- Apakah semua konten accessible tanpa horizontal scroll?
- Apakah touch target semua 48px+?

### 4️⃣ **Design System Check**

Verifikasi konsistensi:
- ✅ Spacing system (8px, 16px, 24px grid) konsisten?
- ✅ Color palette konsisten di semua halaman?
- ✅ Typography scale (h1, h2, body, caption) konsisten?
- ✅ Button style (primary, secondary, disabled) konsisten?
- ✅ Form element style konsisten?
- ✅ Icon set konsisten?
- ✅ Border radius konsisten?
- ✅ Shadow/elevation konsistent?

### 5️⃣ **Tailwind CSS Best Practices**

Periksa:
- ❌ Hardcoded pixel values (gunakan Tailwind spacing)
- ❌ Custom CSS yang bisa replace dengan Tailwind
- ❌ Missing responsive prefixes (sm:, md:, lg:, xl:)
- ❌ Unused/redundant class
- ❌ Color yang tidak di Tailwind palette
- ❌ Missing dark mode classes (jika ada)

### 6️⃣ **Aksesibilitas Mobile**

- [ ] Keyboard navigation works (tab order)
- [ ] ARIA labels present untuk icon-only button
- [ ] Focus indicator visible
- [ ] Color not only distinguishing method
- [ ] Text contrast sufficient
- [ ] Form label associated dengan input
- [ ] Screen reader friendly

---

## 🎨 Saran Desain UI/UX Mobile

Berdasarkan analisis, berikan saran spesifik:

### Untuk Setiap Bug yang Ditemukan, Sediakan:

```
### Bug: [Nama Bug]
- **Lokasi**: File path + component name
- **Deskripsi**: Apa masalahnya dan kenapa buruk untuk mobile
- **Dampak**: Severity (Critical/High/Medium/Low)
- **Root Cause**: Mengapa ini terjadi (CSS, layout, dll)

#### ✨ Solusi Rekomendasi:
1. **Code Change**: Tampilkan contoh kode yang diperbaiki
   ```jsx
   // Before
   <div className="w-500 h-300">Content</div>
   
   // After
   <div className="w-full max-w-md h-auto">Content</div>
   ```

2. **Tailwind Classes**: Berikan responsive classes
   ```
   - Mobile (default): p-4, text-base, w-full
   - Tablet (md:): p-6, text-lg, w-1/2
   - Desktop (lg:): p-8, text-xl, w-1/3
   ```

3. **Design Principle**: Jelaskan kenapa ini better
```

---

## 📱 Mobile-First Responsive Breakpoints

Gunakan breakpoints ini sebagai reference:

| Device | Width | Tailwind | Priority |
|--------|-------|----------|----------|
| Mobile (Small) | 320px | (default) | ⭐⭐⭐ |
| Mobile (Large) | 375px | (default) | ⭐⭐⭐ |
| Tablet Portrait | 768px | `md:` | ⭐⭐ |
| Tablet Landscape | 1024px | `lg:` | ⭐⭐ |
| Desktop | 1280px+ | `xl:` | ⭐ |

**Prioritas**: Mobile first! Pastikan 375px-420px bekerja sempurna.

---

## 🚀 Saran Umum Untuk Mobile

### Navigation
```jsx
// ❌ BAD: Static sidebar di mobile
<aside className="w-64">Menu</aside>

// ✅ GOOD: Hamburger menu untuk mobile
<nav>
  <button className="md:hidden">☰</button>
  <menu className="hidden md:flex">Menu</menu>
</nav>
```

### Layout
```jsx
// ❌ BAD: Fixed column width
<div className="grid grid-cols-3 gap-4">

// ✅ GOOD: Responsive columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Spacing
```jsx
// ❌ BAD: Same padding everywhere
<div className="p-8">Content</div>

// ✅ GOOD: Adaptive padding
<div className="p-4 md:p-6 lg:p-8">Content</div>
```

### Font Size
```jsx
// ❌ BAD: Too small untuk mobile
<p className="text-xs">Description</p>

// ✅ GOOD: Readable di semua device
<p className="text-sm md:text-base">Description</p>
```

### Images
```jsx
// ❌ BAD: Fixed size
<img src="photo.jpg" width="800" height="600" />

// ✅ GOOD: Responsive
<img src="photo.jpg" className="w-full h-auto" />
```

### Forms
```jsx
// ❌ BAD: Inline form di mobile
<div className="flex gap-4">
  <input className="w-64" />
  <button>Submit</button>
</div>

// ✅ GOOD: Stacked di mobile
<div className="flex flex-col md:flex-row gap-4">
  <input className="flex-1" />
  <button className="md:w-auto w-full">Submit</button>
</div>
```

### Buttons
```jsx
// ❌ BAD: Tiny touch target
<button className="px-2 py-1 text-xs">Click</button>

// ✅ GOOD: 48px minimum
<button className="px-4 py-3 text-sm md:px-6 md:py-2">Click</button>
```

---

## 📊 Output Format

Berikan laporan dalam format ini:

### 1. **Executive Summary**
- Total bugs ditemukan
- Severity breakdown (Critical, High, Medium, Low)
- Estimated fix effort (hours)
- Priority recommendations (top 5)

### 2. **Detailed Findings**
- Bug per halaman/component
- Screenshot/mockup sebelum-sesudah (jika bisa)
- Kode yang bermasalah + solusi

### 3. **Design System Recommendations**
- Improvement untuk consistency
- New component yang perlu dibuat
- Refactoring component yang ada

### 4. **Implementation Roadmap**
- Phase 1 (Critical - buat immediately)
- Phase 2 (High - next sprint)
- Phase 3 (Medium - backlog)
- Phase 4 (Low - nice-to-have)

### 5. **Testing Checklist**
- Device yang harus ditest
- Browser yang harus ditest
- Responsiveness test points
- Accessibility test points

---

## 🔧 Tools & Commands to Use

```bash
# 1. Baca semua pages
find frontend/src/pages -type f -name "*.jsx" -o -name "*.js"

# 2. Baca semua components
find frontend/src/components -type f -name "*.jsx" -o -name "*.js"

# 3. Check CSS issues
grep -r "width: " frontend/src --include="*.jsx" --include="*.js"
grep -r "px\|pt\|pb\|pl\|pr" frontend/src --include="*.jsx" --include="*.js"

# 4. Check hardcoded sizes
grep -r "w-\[" frontend/src --include="*.jsx"
grep -r "h-\[" frontend/src --include="*.jsx"

# 5. Responsive prefix check
grep -r "sm:\|md:\|lg:\|xl:" frontend/src --include="*.jsx" | wc -l
```

---

## ⚡ Quick Start

Untuk memulai audit, jalankan perintah ini di Claude Code:

```
Lakukan audit komprehensif UI/UX mobile untuk NF-Student-HUB:

1. Baca semua file di frontend/src/pages/** dan frontend/src/components/**
2. Identifikasi semua bug responsive design + mobile UX issues
3. Analisis Tailwind CSS usage dan design consistency
4. Berikan saran perbaikan dengan contoh kode
5. Buat prioritas fix (Critical/High/Medium/Low)
6. Buatkan implementation roadmap

Gunakan checklist di MOBILE_UIUX_AUDIT_PROMPT.md sebagai reference.
```

---

## 📝 Notes

- Focus pada **Mobile First** approach
- Prioritas: Functionality > Aesthetics (tapi keduanya penting)
- Test responsiveness di Chrome DevTools (375px width)
- Gunakan Lighthouse audit tools untuk performance
- Verifikasi touch interaction di actual mobile device jika memungkinkan

---

**Last Updated**: 2026-06-12  
**Version**: 1.0

-- ================================================================
-- MIGRATION: Semester 4 Mata Kuliah + Super Admin Dosen
-- NF Student HUB - Prodi TI
-- ================================================================

-- =====================================================
-- 1. UPDATE EXISTING MATKUL KE SEMESTER 4
-- =====================================================
UPDATE mata_kuliah SET semester = 4 WHERE kode IN ('KP001', 'KW002', 'PSO001', 'DEV001', 'RPL001', 'KWU001', 'BI002', 'IR001');

-- =====================================================
-- 2. UPDATE NAMA MATKUL SESUAI KURIKULUM SEMESTER 4
-- =====================================================
-- Matkul Wajib
UPDATE mata_kuliah SET nama = 'VIRTUALISASI KEAMANAN JARINGAN' WHERE kode = 'KP001';
UPDATE mata_kuliah SET nama = 'KECERDASAN ARTIFISIAL' WHERE kode = 'KW002';
UPDATE mata_kuliah SET nama = 'MANAJEMEN PROYEK' WHERE kode = 'DEV001';
UPDATE mata_kuliah SET nama = 'ETIKA PROFESI' WHERE kode = 'RPL001';
UPDATE mata_kuliah SET nama = 'PEMROGRAMAN FULLSTACK' WHERE kode = 'KWU001';

-- Matkul Peminatan CS (sudah ada)
UPDATE mata_kuliah SET nama = 'DIGITAL FORENSIC' WHERE kode = 'PSO001';
UPDATE mata_kuliah SET nama = 'KRIPTOGRAFI' WHERE kode = 'BI002';
UPDATE mata_kuliah SET nama = 'ETHICAL HACKING' WHERE kode = 'IR001';

-- =====================================================
-- 3. TAMBAH MATKUL PEMINATAN AI (3 matkul baru)
-- =====================================================
-- Cek dan tambah dosen baru dulu untuk matkul AI

-- Dosen untuk DATA MINING
INSERT INTO users (email, password, role) 
VALUES ('dosen.datamining@nurulfikri.ac.id', '$2a$10$f92RzFTKrJ/jkOmsLVC6Nebv/QVOXePEf7qJgNOCwCtiW2PtG3kri', 'dosen')
ON CONFLICT DO NOTHING;

INSERT INTO dosen (user_id, name, nip) 
SELECT id, 'Dr. Ahmad Ridho', 'NIP-DM-001'
FROM users WHERE email = 'dosen.datamining@nurulfikri.ac.id'
AND NOT EXISTS (SELECT 1 FROM dosen WHERE user_id = (SELECT id FROM users WHERE email = 'dosen.datamining@nurulfikri.ac.id'))
LIMIT 1;

-- Dosen untuk MACHINE LEARNING  
INSERT INTO users (email, password, role) 
VALUES ('dosen.ml@nurulfikri.ac.id', '$2a$10$f92RzFTKrJ/jkOmsLVC6Nebv/QVOXePEf7qJgNOCwCtiW2PtG3kri', 'dosen')
ON CONFLICT DO NOTHING;

INSERT INTO dosen (user_id, name, nip) 
SELECT id, 'Dr. Siti Nurhasanah', 'NIP-ML-001'
FROM users WHERE email = 'dosen.ml@nurulfikri.ac.id'
AND NOT EXISTS (SELECT 1 FROM dosen WHERE user_id = (SELECT id FROM users WHERE email = 'dosen.ml@nurulfikri.ac.id'))
LIMIT 1;

-- Dosen untuk NATURAL LANGUAGE PROCESSING
INSERT INTO users (email, password, role) 
VALUES ('dosen.nlp@nurulfikri.ac.id', '$2a$10$f92RzFTKrJ/jkOmsLVC6Nebv/QVOXePEf7qJgNOCwCtiW2PtG3kri', 'dosen')
ON CONFLICT DO NOTHING;

INSERT INTO dosen (user_id, name, nip) 
SELECT id, 'Dr. Fajar Wibowo', 'NIP-NLP-001'
FROM users WHERE email = 'dosen.nlp@nurulfikri.ac.id'
AND NOT EXISTS (SELECT 1 FROM dosen WHERE user_id = (SELECT id FROM users WHERE email = 'dosen.nlp@nurulfikri.ac.id'))
LIMIT 1;

-- Insert Matkul AI
INSERT INTO mata_kuliah (kode, nama, sks, dosen_id, semester, hari, jam_mulai, jam_selesai)
SELECT 'AI001', 'DATA MINING', 3, d.id, 4, 'Senin', '08:00:00', '10:30:00'
FROM dosen d JOIN users u ON d.user_id = u.id WHERE u.email = 'dosen.datamining@nurulfikri.ac.id'
AND NOT EXISTS (SELECT 1 FROM mata_kuliah WHERE kode = 'AI001')
LIMIT 1;

INSERT INTO mata_kuliah (kode, nama, sks, dosen_id, semester, hari, jam_mulai, jam_selesai)
SELECT 'AI002', 'MACHINE LEARNING', 3, d.id, 4, 'Selasa', '13:00:00', '15:30:00'
FROM dosen d JOIN users u ON d.user_id = u.id WHERE u.email = 'dosen.ml@nurulfikri.ac.id'
AND NOT EXISTS (SELECT 1 FROM mata_kuliah WHERE kode = 'AI002')
LIMIT 1;

INSERT INTO mata_kuliah (kode, nama, sks, dosen_id, semester, hari, jam_mulai, jam_selesai)
SELECT 'AI003', 'NATURAL LANGUAGE PROCESSING', 3, d.id, 4, 'Rabu', '10:00:00', '12:30:00'
FROM dosen d JOIN users u ON d.user_id = u.id WHERE u.email = 'dosen.nlp@nurulfikri.ac.id'
AND NOT EXISTS (SELECT 1 FROM mata_kuliah WHERE kode = 'AI003')
LIMIT 1;

-- =====================================================
-- 4. BUAT SUPER ADMIN DOSEN
-- =====================================================
INSERT INTO users (email, password, role) 
VALUES ('superdosen@nurulfikri.ac.id', '$2a$10$f92RzFTKrJ/jkOmsLVC6Nebv/QVOXePEf7qJgNOCwCtiW2PtG3kri', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO admin (user_id, name)
SELECT id, 'Super Dosen Admin'
FROM users WHERE email = 'superdosen@nurulfikri.ac.id'
AND NOT EXISTS (SELECT 1 FROM admin WHERE user_id = (SELECT id FROM users WHERE email = 'superdosen@nurulfikri.ac.id'))
LIMIT 1;

-- =====================================================
-- 5. TAMBAH KOLOM kategori DI mata_kuliah (optional)
-- =====================================================
ALTER TABLE mata_kuliah ADD COLUMN IF NOT EXISTS kategori VARCHAR(50) DEFAULT 'wajib';

UPDATE mata_kuliah SET kategori = 'wajib' WHERE kode IN ('KP001', 'KW002', 'DEV001', 'RPL001', 'KWU001');
UPDATE mata_kuliah SET kategori = 'peminatan_cs' WHERE kode IN ('PSO001', 'BI002', 'IR001');
UPDATE mata_kuliah SET kategori = 'peminatan_ai' WHERE kode IN ('AI001', 'AI002', 'AI003');

-- Verifikasi
SELECT id, kode, nama, sks, dosen_id, semester, kategori, hari FROM mata_kuliah WHERE semester = 4 ORDER BY kategori, kode;
SELECT id, email, role FROM users WHERE email = 'superdosen@nurulfikri.ac.id';

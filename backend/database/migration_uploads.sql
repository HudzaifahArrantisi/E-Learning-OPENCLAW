-- ============================================================
-- NF-Student-HUB: Enterprise Upload System Migration
-- Database: PostgreSQL (Supabase)
-- Date: 2026-04-20
-- Purpose: Create central file storage system (eliminating /uploads filesystem)
-- ============================================================

-- ============================================================
-- STEP 1: CREATE ENUM TYPES
-- ============================================================

DO $$ BEGIN
    CREATE TYPE upload_type AS ENUM (
        'post',              -- Gambar postingan (UKM/Ormawa/Admin/Mahasiswa)
        'materi',            -- Materi kuliah dari dosen
        'tugas_mahasiswa',   -- Submit tugas mahasiswa
        'tugas_dosen',       -- File tugas yang dibuat dosen
        'profile',           -- Foto profil user
        'document'           -- Dokumen umum
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE uploader_role AS ENUM (
        'ukm',
        'ormawa',
        'admin',
        'dosen',
        'mahasiswa',
        'orangtua'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE file_visibility AS ENUM (
        'public',       -- Bisa diakses semua user yang login
        'private',      -- Hanya owner yang bisa akses
        'restricted'    -- Hanya user dengan relasi tertentu
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE file_variant AS ENUM (
        'original',
        'compressed',
        'thumbnail'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE processing_status AS ENUM (
        'pending',
        'processing',
        'ready',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- STEP 2: CREATE UPLOADS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS uploads (
    -- Primary Key
    id                  BIGSERIAL PRIMARY KEY,
    
    -- Uploader Info
    uploader_id         INTEGER NOT NULL DEFAULT 0,
    uploader_role       uploader_role NOT NULL DEFAULT 'admin',
    
    -- File Classification
    type                upload_type NOT NULL,
    variant             file_variant NOT NULL DEFAULT 'original',
    
    -- File Metadata
    original_filename   VARCHAR(512) NOT NULL,
    mime_type           VARCHAR(128) NOT NULL,
    file_extension      VARCHAR(16) NOT NULL DEFAULT '',
    original_size       BIGINT NOT NULL DEFAULT 0,
    compressed_size     BIGINT NOT NULL DEFAULT 0,
    compression_ratio   REAL DEFAULT 0,
    
    -- File Binary Data (BYTEA — stored directly in PostgreSQL)
    file_data           BYTEA NOT NULL,
    
    -- Relasi ke entity lain (polymorphic foreign key)
    related_id          INTEGER,
    related_table       VARCHAR(64),
    
    -- Access Control
    visibility          file_visibility NOT NULL DEFAULT 'public',
    
    -- Processing Status
    status              processing_status NOT NULL DEFAULT 'ready',
    
    -- Deduplication
    checksum_hash       VARCHAR(64),
    
    -- Variant System (reference ke parent upload)
    parent_id           BIGINT REFERENCES uploads(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- ============================================================
-- STEP 3: CREATE INDEXES
-- ============================================================

-- Feed/listing query: type + waktu
CREATE INDEX IF NOT EXISTS idx_uploads_type_created 
    ON uploads (type, created_at DESC) 
    WHERE deleted_at IS NULL;

-- "My files" query
CREATE INDEX IF NOT EXISTS idx_uploads_uploader 
    ON uploads (uploader_id, uploader_role) 
    WHERE deleted_at IS NULL;

-- Related entity lookup
CREATE INDEX IF NOT EXISTS idx_uploads_related 
    ON uploads (related_id, related_table) 
    WHERE deleted_at IS NULL AND related_id IS NOT NULL;

-- Processing status filter
CREATE INDEX IF NOT EXISTS idx_uploads_status 
    ON uploads (status) 
    WHERE status != 'ready';

-- Variant lookup
CREATE INDEX IF NOT EXISTS idx_uploads_parent_variant 
    ON uploads (parent_id, variant) 
    WHERE parent_id IS NOT NULL;

-- Deduplication lookup
CREATE INDEX IF NOT EXISTS idx_uploads_checksum 
    ON uploads (checksum_hash) 
    WHERE checksum_hash IS NOT NULL;

-- Visibility filter for feed
CREATE INDEX IF NOT EXISTS idx_uploads_visibility 
    ON uploads (visibility, type, created_at DESC) 
    WHERE deleted_at IS NULL;

-- ============================================================
-- STEP 4: CONSTRAINTS
-- ============================================================

-- File size limit: 50MB max
DO $$ BEGIN
    ALTER TABLE uploads ADD CONSTRAINT chk_uploads_file_size 
        CHECK (original_size <= 52428800);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- MIME type must not be empty
DO $$ BEGIN
    ALTER TABLE uploads ADD CONSTRAINT chk_uploads_mime_type 
        CHECK (mime_type != '');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Filename must not be empty
DO $$ BEGIN
    ALTER TABLE uploads ADD CONSTRAINT chk_uploads_filename 
        CHECK (original_filename != '');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- STEP 5: TRIGGER - Auto update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_uploads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_uploads_updated_at ON uploads;
CREATE TRIGGER trg_uploads_updated_at
    BEFORE UPDATE ON uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_uploads_timestamp();

-- ============================================================
-- STEP 6: CREATE UPLOAD SESSIONS TABLE (Chunked Upload)
-- ============================================================

CREATE TABLE IF NOT EXISTS upload_sessions (
    id              BIGSERIAL PRIMARY KEY,
    session_token   VARCHAR(128) UNIQUE NOT NULL,
    user_id         INTEGER NOT NULL,
    user_role       uploader_role NOT NULL DEFAULT 'mahasiswa',
    filename        VARCHAR(512) NOT NULL,
    mime_type       VARCHAR(128),
    total_size      BIGINT NOT NULL DEFAULT 0,
    total_chunks    INTEGER NOT NULL DEFAULT 1,
    uploaded_chunks INTEGER NOT NULL DEFAULT 0,
    upload_type     upload_type NOT NULL,
    related_id      INTEGER,
    status          VARCHAR(32) NOT NULL DEFAULT 'uploading',
    upload_id       BIGINT REFERENCES uploads(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_token 
    ON upload_sessions (session_token);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user 
    ON upload_sessions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_status 
    ON upload_sessions (status) 
    WHERE status NOT IN ('completed', 'failed', 'expired');

-- ============================================================
-- STEP 7: COMMENTS
-- ============================================================

COMMENT ON TABLE uploads IS 'Central file storage — semua file dari semua module disimpan di sini (BYTEA)';
COMMENT ON COLUMN uploads.file_data IS 'Binary file data — JANGAN SELECT kolom ini kecuali saat streaming ke browser';
COMMENT ON COLUMN uploads.related_id IS 'Polymorphic FK — bisa ke posts.id, materi.id, tugas.id, dll';
COMMENT ON COLUMN uploads.parent_id IS 'Self-referencing FK — untuk variant system (thumbnail, compressed)';
COMMENT ON COLUMN uploads.checksum_hash IS 'SHA-256 hash untuk deduplication dan ETag caching';
COMMENT ON TABLE upload_sessions IS 'Chunked upload tracking — status: uploading, compressing, completed, failed, expired';

-- ============================================================
-- DONE! Migration complete.
-- ============================================================

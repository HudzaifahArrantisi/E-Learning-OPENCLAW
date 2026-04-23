-- =============================================
-- TABEL post_media — Carousel items per post
-- Jalankan SQL ini secara MANUAL di database
-- =============================================

CREATE TABLE IF NOT EXISTS post_media (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    upload_id BIGINT REFERENCES uploads(id) ON DELETE SET NULL,
    
    -- Media info
    media_type VARCHAR(20) NOT NULL DEFAULT 'image',
    media_url TEXT NOT NULL,
    
    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_media_sort ON post_media(post_id, sort_order);

-- =============================================
-- MIGRASI DATA EXISTING
-- Post lama yang punya media_url → insert 1 row ke post_media
-- =============================================
INSERT INTO post_media (post_id, media_type, media_url, sort_order)
SELECT id, 'image', media_url, 0
FROM posts
WHERE media_url IS NOT NULL 
  AND media_url != '' 
  AND deleted_at IS NULL
  AND id NOT IN (SELECT DISTINCT post_id FROM post_media)
ON CONFLICT DO NOTHING;

package handlers

import (
	"image"
	"image/jpeg"
	_ "image/gif"
	_ "image/png"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/image/draw"
)

// ImageOptimizer menangani serving gambar yang sudah dikompresi
type ImageOptimizer struct {
	basePath   string
	maxWidth   int
	quality    int
	processing sync.Map // mencegah kompresi ganda untuk file yang sama
}

// NewImageOptimizer membuat instance baru
func NewImageOptimizer(basePath string) *ImageOptimizer {
	return &ImageOptimizer{
		basePath: basePath,
		maxWidth: 1200,  // max lebar 1200px
		quality:  75,    // JPEG quality 75% (balance antara ukuran dan kualitas)
	}
}

// ServeOptimized handler utama yang melayani gambar terkompresi
func (io *ImageOptimizer) ServeOptimized(c *gin.Context) {
	// Ambil path dari URL, contoh: /uploads/posts/foto.jpg
	requestPath := strings.TrimPrefix(c.Request.URL.Path, "/uploads")
	originalPath := filepath.Join(io.basePath, requestPath)

	// Bersihkan path untuk mencegah path traversal
	originalPath = filepath.Clean(originalPath)

	// Pastikan path masih dalam basePath
	absBase, _ := filepath.Abs(io.basePath)
	absOrig, _ := filepath.Abs(originalPath)
	if !strings.HasPrefix(absOrig, absBase) {
		c.Status(http.StatusForbidden)
		return
	}

	// Cek apakah file ada
	if _, err := os.Stat(originalPath); os.IsNotExist(err) {
		c.Status(http.StatusNotFound)
		return
	}

	ext := strings.ToLower(filepath.Ext(originalPath))

	// Hanya compress file gambar
	imageExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
	}
	if !imageExts[ext] {
		// Bukan gambar — serve langsung (PDF, ZIP, dll)
		c.File(originalPath)
		return
	}

	// File .webp sudah terkompresi — serve langsung
	if ext == ".webp" {
		c.File(originalPath)
		return
	}

	// Cek ukuran file — jika sudah kecil (< 100KB), skip kompresi
	info, err := os.Stat(originalPath)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	if info.Size() < 100*1024 {
		c.File(originalPath)
		return
	}

	// Cek apakah versi terkompresi sudah ada
	optimizedPath := originalPath + ".opt.jpg"
	if _, err := os.Stat(optimizedPath); err == nil {
		c.Header("X-Image-Optimized", "true")
		c.File(optimizedPath)
		return
	}

	// Cegah kompresi ganda (race condition)
	if _, loaded := io.processing.LoadOrStore(originalPath, true); loaded {
		// Sedang diproses oleh goroutine lain, serve original
		c.File(originalPath)
		return
	}
	defer io.processing.Delete(originalPath)

	// Lakukan kompresi
	if err := io.compressImage(originalPath, optimizedPath); err != nil {
		log.Printf("[ImageOptimizer] Gagal kompresi %s: %v", originalPath, err)
		c.File(originalPath) // fallback ke original
		return
	}

	// Log penghematan ukuran
	optInfo, _ := os.Stat(optimizedPath)
	if optInfo != nil {
		savedPercent := 100.0 - (float64(optInfo.Size()) / float64(info.Size()) * 100.0)
		log.Printf("[ImageOptimizer] %s: %.0f%% smaller (%d KB → %d KB)",
			filepath.Base(originalPath),
			savedPercent,
			info.Size()/1024,
			optInfo.Size()/1024)
	}

	c.Header("X-Image-Optimized", "true")
	c.File(optimizedPath)
}

// compressImage melakukan resize + kompresi JPEG
func (io *ImageOptimizer) compressImage(inputPath, outputPath string) error {
	// Buka file asli
	f, err := os.Open(inputPath)
	if err != nil {
		return err
	}
	defer f.Close()

	// Decode gambar (otomatis mengenali format dari header)
	img, _, err := image.Decode(f)
	if err != nil {
		return err
	}

	// Hitung dimensi baru
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	var finalImg image.Image = img

	// Resize jika lebih lebar dari maxWidth
	if origWidth > io.maxWidth {
		newHeight := origHeight * io.maxWidth / origWidth
		dst := image.NewRGBA(image.Rect(0, 0, io.maxWidth, newHeight))

		// Gunakan BiLinear interpolation (kualitas bagus, cukup cepat)
		draw.BiLinear.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		finalImg = dst
	}

	// Simpan sebagai JPEG terkompresi
	out, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer out.Close()

	return jpeg.Encode(out, finalImg, &jpeg.Options{Quality: io.quality})
}

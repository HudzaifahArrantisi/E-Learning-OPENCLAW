package utils

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"strings"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp" 
)
const (
	MaxDimension = 1920

	OutputJPEGQuality = 80


)

type ProcessedImage struct {
	Data             []byte  // Compressed image bytes
	MimeType         string  // e.g. "image/jpeg" or "image/png"
	Extension        string  // e.g. ".jpg" or ".png"
	Width            int     // Final width in pixels
	Height           int     // Final height in pixels
	OriginalSize     int64   // Size before processing
	CompressedSize   int64   // Size after processing
	CompressionRatio float32 // Percentage saved (0-100)
}


func ProcessUploadedImage(data []byte, detectedMime string) (*ProcessedImage, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("empty image data")
	}

	// Only process image MIME types
	if !strings.HasPrefix(detectedMime, "image/") {
		return nil, fmt.Errorf("not an image: %s", detectedMime)
	}

	originalSize := int64(len(data))

	// 1. Decode the image (auto-detects format from registered decoders)
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image (%s): %w", detectedMime, err)
	}

	// 2. Smart resize — constrain the longest edge to MaxDimension
	img, resized := smartResize(img, MaxDimension)

	bounds := img.Bounds()
	finalWidth := bounds.Dx()
	finalHeight := bounds.Dy()

	// 3. Detect if the image has an alpha channel that is actually used
	hasAlpha := imageHasAlpha(img)

	// 4. Encode based on alpha channel presence
	var compressed []byte
	var outMime, outExt string

	if hasAlpha {
		// Preserve transparency with optimized PNG
		compressed, outMime, outExt, err = encodeToOptimizedPNG(img)
	} else {
		// Use JPEG for maximum compression on opaque images
		compressed, outMime, outExt, err = encodeToJPEG(img)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to encode image: %w", err)
	}

	compressedSize := int64(len(compressed))

	// If compression made the file larger (rare, very small images),
	// and we didn't resize, return original with dimensions
	if compressedSize >= originalSize && !resized {
		return &ProcessedImage{
			Data:             data,
			MimeType:         detectedMime,
			Extension:        mimeToExtension(detectedMime),
			Width:            finalWidth,
			Height:           finalHeight,
			OriginalSize:     originalSize,
			CompressedSize:   originalSize,
			CompressionRatio: 0,
		}, nil
	}

	ratio := float32(100.0 - (float64(compressedSize) / float64(originalSize) * 100.0))
	if ratio < 0 {
		ratio = 0
	}

	return &ProcessedImage{
		Data:             compressed,
		MimeType:         outMime,
		Extension:        outExt,
		Width:            finalWidth,
		Height:           finalHeight,
		OriginalSize:     originalSize,
		CompressedSize:   compressedSize,
		CompressionRatio: ratio,
	}, nil
}


func smartResize(img image.Image, maxDim int) (image.Image, bool) {
	if maxDim <= 0 {
		return img, false
	}

	bounds := img.Bounds()
	origW := bounds.Dx()
	origH := bounds.Dy()

	if origW <= maxDim && origH <= maxDim {
		return img, false
	}

	var newW, newH int
	if origW >= origH {
		newW = maxDim
		newH = int(float64(origH) * float64(maxDim) / float64(origW))
	} else {
		newH = maxDim
		newW = int(float64(origW) * float64(maxDim) / float64(origH))
	}

	if newW < 1 {
		newW = 1
	}
	if newH < 1 {
		newH = 1
	}

	dst := image.NewNRGBA(image.Rect(0, 0, newW, newH))

	draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)

	return dst, true
}

func encodeToJPEG(img image.Image) ([]byte, string, string, error) {
	bounds := img.Bounds()
	flat := image.NewRGBA(bounds)

	draw.Src.Draw(flat, bounds, image.White, image.Point{})
	draw.Over.Draw(flat, bounds, img, bounds.Min)

	var buf bytes.Buffer
	err := jpeg.Encode(&buf, flat, &jpeg.Options{Quality: OutputJPEGQuality})
	if err != nil {
		return nil, "", "", fmt.Errorf("jpeg encode failed: %w", err)
	}

	return buf.Bytes(), "image/jpeg", ".jpg", nil
}

func encodeToOptimizedPNG(img image.Image) ([]byte, string, string, error) {
	var buf bytes.Buffer
	encoder := &png.Encoder{
		CompressionLevel: png.BestCompression,
	}
	err := encoder.Encode(&buf, img)
	if err != nil {
		return nil, "", "", fmt.Errorf("png encode failed: %w", err)
	}

	return buf.Bytes(), "image/png", ".png", nil
}


func imageHasAlpha(img image.Image) bool {
	bounds := img.Bounds()

	switch img.(type) {
	case *image.YCbCr, *image.Gray, *image.Gray16:
		return false 
	}

	stepX := bounds.Dx() / 32
	stepY := bounds.Dy() / 32
	if stepX < 1 {
		stepX = 1
	}
	if stepY < 1 {
		stepY = 1
	}

	for y := bounds.Min.Y; y < bounds.Max.Y; y += stepY {
		for x := bounds.Min.X; x < bounds.Max.X; x += stepX {
			_, _, _, a := img.At(x, y).RGBA()
			if a < 0xFFFF {
				return true 
			}
		}
	}

	return false 
}

func mimeToExtension(mime string) string {
	switch strings.ToLower(mime) {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	default:
		return ".bin"
	}
}

func IsImageMime(mime string) bool {
	switch strings.ToLower(mime) {
	case "image/jpeg", "image/png", "image/webp", "image/gif":
		return true
	default:
		return false
	}
}

func ValidateMagicBytes(data []byte) (string, bool) {
	if len(data) < 4 {
		return "", false
	}

	// JPEG: FF D8 FF
	if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg", true
	}

	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if len(data) >= 8 &&
		data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 &&
		data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A {
		return "image/png", true
	}

	// WebP: RIFF....WEBP
	if len(data) >= 12 &&
		data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F' &&
		data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P' {
		return "image/webp", true
	}

	// GIF: GIF87a or GIF89a
	if len(data) >= 6 &&
		data[0] == 'G' && data[1] == 'I' && data[2] == 'F' &&
		data[3] == '8' && (data[4] == '7' || data[4] == '9') && data[5] == 'a' {
		return "image/gif", true
	}

	// PDF: %PDF
	if data[0] == '%' && data[1] == 'P' && data[2] == 'D' && data[3] == 'F' {
		return "application/pdf", true
	}

	return "", false
}

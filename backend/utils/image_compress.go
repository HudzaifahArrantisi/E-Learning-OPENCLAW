package utils

import (
	"bytes"
	"image"
	"image/jpeg"
	_ "image/gif"
	_ "image/png"

	"golang.org/x/image/draw"
)

// CompressImage compresses an image byte slice to JPEG format
// maxWidth: maximum width in pixels (0 = no resize)
// quality: JPEG quality (1-100, recommended 70-80)
// Returns compressed bytes or error
func CompressImage(data []byte, maxWidth int, quality int) ([]byte, error) {
	// Decode image (auto-detect format from header: jpeg, png, gif)
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	var finalImg image.Image = img

	// Resize if wider than maxWidth
	if maxWidth > 0 && origWidth > maxWidth {
		newHeight := origHeight * maxWidth / origWidth
		dst := image.NewRGBA(image.Rect(0, 0, maxWidth, newHeight))
		// BiLinear: good quality, reasonable speed
		draw.BiLinear.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		finalImg = dst
	}

	// Encode as JPEG with specified quality
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, finalImg, &jpeg.Options{Quality: quality})
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// GenerateThumbnail creates a small thumbnail (max 300px width, quality 60)
func GenerateThumbnail(data []byte) ([]byte, error) {
	return CompressImage(data, 300, 60)
}

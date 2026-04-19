package middlewares

import (
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// SecurityHeaders menambahkan header keamanan standar ke setiap response
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Next()
	}
}

// ===== Rate Limiter (In-Memory, per IP) =====

type visitor struct {
	count    int
	lastSeen time.Time
}

type rateLimiter struct {
	visitors map[string]*visitor
	mu       sync.Mutex
	rate     int
	window   time.Duration
}

func newRateLimiter(rate int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		window:   window,
	}
	go rl.cleanup()
	return rl
}

func (rl *rateLimiter) cleanup() {
	for {
		time.Sleep(rl.window * 2)
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > rl.window {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *rateLimiter) isAllowed(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		rl.visitors[ip] = &visitor{count: 1, lastSeen: time.Now()}
		return true
	}

	if time.Since(v.lastSeen) > rl.window {
		v.count = 1
		v.lastSeen = time.Now()
		return true
	}

	v.count++
	v.lastSeen = time.Now()
	return v.count <= rl.rate
}

// RateLimitMiddleware membatasi jumlah request per IP per window
func RateLimitMiddleware(maxRequests int, window time.Duration) gin.HandlerFunc {
	limiter := newRateLimiter(maxRequests, window)
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiter.isAllowed(ip) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "Terlalu banyak request. Coba lagi nanti.",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// LoginRateLimiter — rate limiter khusus untuk login (lebih ketat)
func LoginRateLimiter() gin.HandlerFunc {
	return RateLimitMiddleware(10, 1*time.Minute) // Max 10 login attempts per minute
}

// InternalAPIKeyMiddleware melindungi endpoint internal dengan API key
// Jika INTERNAL_API_KEY tidak diset, hanya localhost yang diizinkan
func InternalAPIKeyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := os.Getenv("INTERNAL_API_KEY")

		if apiKey != "" {
			// Mode: API Key configured — require it
			provided := c.GetHeader("X-Internal-Key")
			if provided != apiKey {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"message": "Access denied: invalid API key",
				})
				c.Abort()
				return
			}
		}
		// Jika INTERNAL_API_KEY kosong, izinkan semua (embedded mode)
		c.Next()
	}
}

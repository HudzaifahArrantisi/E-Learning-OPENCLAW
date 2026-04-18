package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Struktur data untuk request dan response
type ChatRequest struct {
	Message        string `json:"message"`
	ConversationID string `json:"conversationId,omitempty"`
	UserID         string `json:"userId,omitempty"`
}

type ChatResponse struct {
	Success        bool          `json:"success"`
	Message        string        `json:"message,omitempty"`
	Error          string        `json:"error,omitempty"`
	ConversationID string        `json:"conversationId,omitempty"`
	History        []ChatMessage `json:"history,omitempty"`
}

type ChatMessage struct {
	Role      string `json:"role"`
	Content   string `json:"content"`
	Timestamp string `json:"timestamp"`
}

type PuterAIRequest struct {
	Model       string           `json:"model"`
	Messages    []PuterAIMessage `json:"messages"`
	Stream      bool             `json:"stream"`
	MaxTokens   int              `json:"max_tokens,omitempty"`
	Temperature float64          `json:"temperature,omitempty"`
}

type PuterAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type PuterAIResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int    `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}

// In-memory storage untuk chat history
var chatHistories = make(map[string][]ChatMessage)

// Initialize random seed
func init() {
	rand.Seed(time.Now().UnixNano())
}

// HandleChat - Main handler untuk chat messages
func HandleChat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ChatResponse{
			Success: false,
			Error:   "Invalid request body: " + err.Error(),
		})
		return
	}

	if req.Message == "" {
		c.JSON(http.StatusBadRequest, ChatResponse{
			Success: false,
			Error:   "Message cannot be empty",
		})
		return
	}

	// Generate atau gunakan conversation ID
	conversationID := req.ConversationID
	if conversationID == "" {
		conversationID = generateConversationID()
	}

	// Dapatkan atau buat history
	history, exists := chatHistories[conversationID]
	if !exists {
		history = []ChatMessage{}
	}

	// Tambahkan pesan user ke history
	userMessage := ChatMessage{
		Role:      "user",
		Content:   req.Message,
		Timestamp: time.Now().Format(time.RFC3339),
	}
	history = append(history, userMessage)

	// Panggil Puter AI API
	aiResponse, err := callPuterAI(req.Message, history)
	if err != nil {
		log.Printf("AI API error: %v", err)
		
		// Gunakan smart fallback system
		aiResponse = getSmartResponse(req.Message, history)
		log.Println("Using smart fallback response")
	}

	// Tambahkan response AI ke history
	aiMessage := ChatMessage{
		Role:      "assistant",
		Content:   aiResponse,
		Timestamp: time.Now().Format(time.RFC3339),
	}
	history = append(history, aiMessage)

	// Simpan history (maksimal 50 pesan per conversation)
	if len(history) > 50 {
		history = history[len(history)-50:]
	}
	chatHistories[conversationID] = history

	// Kirim response
	c.JSON(http.StatusOK, ChatResponse{
		Success:        true,
		Message:        aiResponse,
		ConversationID: conversationID,
		History:        history,
	})
}

// callPuterAI - Memanggil Puter.com API
func callPuterAI(currentMessage string, history []ChatMessage) (string, error) {
	// Siapkan messages untuk AI
	messages := []PuterAIMessage{
		{
			Role:    "system",
			Content: getSystemPrompt(),
		},
	}

	// Tambahkan history conversation (maksimal 8 pesan terakhir untuk efisiensi)
	startIndex := len(history) - 8
	if startIndex < 0 {
		startIndex = 0
	}
	
	for i := startIndex; i < len(history); i++ {
		msg := history[i]
		messages = append(messages, PuterAIMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Buat request ke Puter AI
	aiReq := PuterAIRequest{
		Model:       "gpt-3.5-turbo",
		Messages:    messages,
		Stream:      false,
		MaxTokens:   1000,
		Temperature: 0.7,
	}

	reqBody, err := json.Marshal(aiReq)
	if err != nil {
		return "", fmt.Errorf("failed to marshal AI request: %v", err)
	}

	// Puter.com API endpoint
	req, err := http.NewRequest("POST", "https://api.puter.com/v1/chat/completions", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", fmt.Errorf("failed to create AI request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "STUDENT HUB/1.0")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("AI API request failed: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read AI response: %v", err)
	}

	// Debug logging
	log.Printf("Puter API Response Status: %d", resp.StatusCode)
	
	if resp.StatusCode != http.StatusOK {
		log.Printf("Puter API Error Body: %s", string(body))
		
		// Coba parsing error message
		var errorResp struct {
			Error struct {
				Message string `json:"message"`
				Type    string `json:"type"`
			} `json:"error"`
		}
		
		if err := json.Unmarshal(body, &errorResp); err == nil && errorResp.Error.Message != "" {
			return "", fmt.Errorf("AI API error: %s (type: %s)", errorResp.Error.Message, errorResp.Error.Type)
		}
		
		return "", fmt.Errorf("AI API returned status %d", resp.StatusCode)
	}

	var aiResp PuterAIResponse
	if err := json.Unmarshal(body, &aiResp); err != nil {
		return "", fmt.Errorf("failed to parse AI response: %v", err)
	}

	if len(aiResp.Choices) > 0 && aiResp.Choices[0].Message.Content != "" {
		log.Printf("AI Response successful - Tokens: %d", aiResp.Usage.TotalTokens)
		return aiResp.Choices[0].Message.Content, nil
	}

	if aiResp.Error.Message != "" {
		return "", fmt.Errorf("AI API error: %s", aiResp.Error.Message)
	}

	return "", fmt.Errorf("no valid response from AI")
}

// getSystemPrompt - System prompt untuk AI
func getSystemPrompt() string {
	currentTime := time.Now().Format("January 2, 2006 15:04")
	
	return `You are NF Assistant, a helpful AI assistant for STUDENT HUB. Answer in the same language as the user's question.

IMPORTANT GUIDELINES:
1. Always provide direct, specific answers to the user's questions
2. Do not give generic introductions or lists of what you can do unless specifically asked
3. Be concise but informative
4. Use the same language as the question (Indonesian or English)
5. Provide practical, actionable advice
6. If you don't know something, admit it honestly and suggest alternatives
7. For coding questions, provide working code examples when possible
8. For academic questions, provide clear explanations and steps

CONTEXT:
- Platform: STUDENT HUB
- Current time: ` + currentTime + `
- You are an AI assistant with knowledge in programming, mathematics, academics, and general topics

Always be helpful, accurate, and engaging in your responses.`
}

// getSmartResponse - Smart fallback system berdasarkan konteks pesan
func getSmartResponse(message string, history []ChatMessage) string {
	lowerMsg := strings.ToLower(message)
	
	// Cek konteks dari history percakapan
	conversationContext := getConversationContext(history)
	
	// Response berdasarkan konteks history
	if conversationContext != "" {
		switch conversationContext {
		case "programming":
			return getProgrammingResponse(message, true)
		case "mathematics":
			return getMathResponse(message, true)
		case "academic":
			return getAcademicResponse(message, true)
		case "creative":
			return getCreativeResponse(message, true)
		}
	}
	
	// Response berdasarkan kata kunci dalam pesan saat ini
	if containsAny(lowerMsg, []string{"programming", "coding", "code", "javascript", "python", "java", "html", "css", "react", "node", "vue", "angular", "algorithm", "function", "variable", "debug", "error", "syntax", "compiler", "framework", "api", "database", "sql", "nosql"}) {
		return getProgrammingResponse(message, false)
	}
	
	if containsAny(lowerMsg, []string{"math", "matematika", "kalkulus", "aljabar", "geometri", "statistik", "probabilitas", "trigonometri", "integral", "turunan", "persamaan", "rumus", "angka", "hitung", "kuadrat", "vektor", "matriks"}) {
		return getMathResponse(message, false)
	}
	
	if containsAny(lowerMsg, []string{"tugas", "assignment", "deadline", "kuliah", "kampus", "akademik", "dosen", "mahasiswa", "skripsi", "thesis", "paper", "research", "studi", "belajar", "ujian", "nilai", "ipk", "sks", "kurikulum"}) {
		return getAcademicResponse(message, false)
	}
	
	if containsAny(lowerMsg, []string{"creative", "kreatif", "puisi", "cerita", "story", "poem", "desain", "design", "ide", "idea", "inovasi", "innovation", "art", "seni", "tulis", "write", "buat", "create"}) {
		return getCreativeResponse(message, false)
	}
	
	if containsAny(lowerMsg, []string{"salam", "halo", "hai", "hello", "hi", "apa kabar", "how are you"}) {
		return getGreetingResponse()
	}
	
	// Default smart response
	return getGeneralResponse(message)
}

// getConversationContext - Mendapatkan konteks dari history percakapan
func getConversationContext(history []ChatMessage) string {
	if len(history) < 2 {
		return ""
	}
	
	// Analisis 5 pesan terakhir untuk menentukan konteks
	startIndex := len(history) - 5
	if startIndex < 0 {
		startIndex = 0
	}
	
	combinedText := ""
	for i := startIndex; i < len(history); i++ {
		combinedText += " " + strings.ToLower(history[i].Content)
	}
	
	// Prioritaskan berdasarkan frekuensi kata kunci
	programmingScore := countKeywords(combinedText, []string{"programming", "coding", "code", "javascript", "python", "java", "html", "css", "function", "variable", "debug"})
	mathScore := countKeywords(combinedText, []string{"math", "matematika", "kalkulus", "aljabar", "geometri", "statistik", "integral", "turunan", "persamaan", "rumus"})
	academicScore := countKeywords(combinedText, []string{"tugas", "assignment", "deadline", "kuliah", "kampus", "akademik", "skripsi", "thesis", "paper"})
	creativeScore := countKeywords(combinedText, []string{"creative", "kreatif", "puisi", "cerita", "desain", "ide", "inovasi", "art", "seni"})
	
	scores := map[string]int{
		"programming": programmingScore,
		"mathematics": mathScore,
		"academic":    academicScore,
		"creative":    creativeScore,
	}
	
	maxScore := 0
	maxCategory := ""
	for category, score := range scores {
		if score > maxScore {
			maxScore = score
			maxCategory = category
		}
	}
	
	// Hanya return kategori jika ada cukup kata kunci
	if maxScore >= 2 {
		return maxCategory
	}
	
	return ""
}

// getProgrammingResponse - Response untuk pertanyaan programming
func getProgrammingResponse(message string, fromContext bool) string {
	responses := []string{
		`**Programming Help - ` + message + `**

Saat ini layanan AI sedang mengalami gangguan, tetapi saya bisa memberikan guidance:

ðŸ’¡ **Untuk ` + message + `**, pertimbangkan:
â€¢ Stack Overflow untuk solusi spesifik
â€¢ MDN Web Docs (developer.mozilla.org) untuk web technologies
â€¢ Official documentation framework/language yang digunakan
â€¢ GitHub repositories untuk contoh code

ðŸ”§ **Tips Programming:**
1. Always check the documentation first
2. Use console.log/print statements for debugging
3. Break complex problems into smaller functions
4. Write clean, readable code with comments
5. Test your code frequently

Butuh bantuan lebih spesifik tentang aspek tertentu?`,

		`**Programming: ` + message + `**

Untuk pertanyaan programming seperti ini, saya sarankan:

ðŸ“š **Learning Resources:**
â€¢ FreeCodeCamp - Tutorial interaktif gratis
â€¢ Codecademy - Kursus programming online
â€¢ W3Schools - Referensi web development
â€¢ JavaScript.info - Panduan JavaScript modern

ðŸ› ï¸ **Tools yang Membantu:**
â€¢ VS Code dengan extensions
â€¢ Chrome DevTools untuk debugging
â€¢ Postman untuk API testing
â€¢ Git untuk version control

Mau fokus pada bahasa atau framework tertentu?`,

		`**Coding Assistance: ` + message + `**

Walaupun sedang limited mode, saya bisa bantu dengan:

â€¢ **Concept Explanation** - Penjelasan konsep programming
â€¢ **Best Practices** - Tips menulis code yang baik
â€¢ **Learning Path** - Roadmap belajar programming
â€¢ **Resource Recommendations** - Sumber belajar terbaik

ðŸš€ **Quick Tips:**
- Practice coding regularly
- Build small projects first
- Learn debugging techniques
- Read other people's code
- Don't be afraid to experiment

Ada area programming spesifik yang ingin didalami?`,
	}
	
	contextNote := ""
	if fromContext {
		contextNote = "\n\n*Saya lanjutkan dari percakapan programming sebelumnya*"
	}
	
	return responses[rand.Intn(len(responses))] + contextNote
}

// getMathResponse - Response untuk pertanyaan matematika
func getMathResponse(message string, fromContext bool) string {
	responses := []string{
		`**Matematika: ` + message + `**

Untuk menyelesaikan soal matematika:

ðŸ“ **Langkah-langkah Umum:**
1. Pahami soal dengan baik - baca perlahan
2. Identifikasi apa yang diketahui dan ditanyakan
3. Tentukan rumus atau konsep yang relevan
4. Selesaikan step by step
5. Verifikasi hasil akhir

ðŸ§® **Resources Matematika:**
â€¢ Khan Academy - Video tutorial matematika
â€¢ Wolfram Alpha - Computational engine
â€¢ Desmos - Graphing calculator online
â€¢ Mathway - Problem solver

Butuh penjelasan konsep matematika tertentu?`,

		`**Pertanyaan Matematika: ` + message + `**

Matematika membutuhkan pemahaman konsep dan latihan:

ðŸ’¡ **Tips Belajar Matematika:**
â€¢ Practice regularly dengan variasi soal
â€¢ Understand the concepts, not just memorization
â€¢ Use visual aids and diagrams
â€¢ Study in groups for discussion
â€¢ Don't hesitate to ask for help

ðŸ“Š **Kategori Matematika:**
â€¢ Aljabar & Persamaan
â€¢ Geometri & Trigonometri
â€¢ Kalkulus (Diferensial & Integral)
â€¢ Statistik & Probabilitas
â€¢ Matematika Diskrit

Mau fokus pada topik matematika mana?`,

		`**Math Help: ` + message + `**

Walaupun dalam mode terbatas, saya bisa bantu dengan:

â€¢ **Concept Explanation** - Penjelasan konsep matematika
â€¢ **Problem Solving Strategies** - Strategi penyelesaian soal
â€¢ **Step-by-step Guidance** - Panduan langkah demi langkah
â€¢ **Real-world Applications** - Aplikasi matematika di kehidupan

ðŸŽ¯ **Penting:**
- Mathematics is about understanding patterns
- Every problem has multiple solution paths
- Mistakes are learning opportunities
- Consistency is key to improvement

Ada jenis soal matematika spesifik yang sedang dikerjakan?`,
	}
	
	contextNote := ""
	if fromContext {
		contextNote = "\n\n*Melanjutkan diskusi matematika kita*"
	}
	
	return responses[rand.Intn(len(responses))] + contextNote
}

// getAcademicResponse - Response untuk pertanyaan akademik
func getAcademicResponse(message string, fromContext bool) string {
	responses := []string{
		`**Bantuan Akademik: ` + message + `**

Untuk masalah akademik dan perkuliahan:

ðŸŽ“ **Strategi Akademik:**
â€¢ Buat jadwal belajar yang realistis
â€¢ Prioritaskan tugas berdasarkan deadline
â€¢ Gunakan teknik Pomodoro (25 menit fokus, 5 menit istirahat)
â€¢ Buat catatan yang terorganisir
â€¢ Jangan ragu bertanya ke dosen

ðŸ“… **Manajemen Waktu:**
- Gunakan planner digital (Google Calendar, Notion)
- Break down tugas besar menjadi subtugas kecil
- Set specific, achievable goals
- Review progress regularly

Butuh bantuan dengan aspek akademik tertentu?`,

		`**Academic Assistance: ` + message + `**

Sebagai asisten akademik, saya bisa bantu dengan:

âœï¸ **Penulisan Akademik:**
â€¢ Structure paper dan report
â€¢ Citation dan referencing
â€¢ Research methodology
â€¢ Critical thinking dan analysis

ðŸ“– **Study Techniques:**
â€¢ Active recall dan spaced repetition
â€¢ Mind mapping untuk visual learning
â€¢ Group study sessions
â€¢ Teaching concepts to others

ðŸ« **Campus Resources:**
â€¢ Perpustakaan kampus
â€¢ Academic advising
â€¢ Writing center
â€¢ Tutoring services

Ada tantangan akademik spesifik yang dihadapi?`,

		`**Dukungan Perkuliahan: ` + message + `**

Untuk sukses di perkuliahan:

ðŸš€ **Tips Mahasiswa:**
â€¢ Attend classes regularly dan aktif bertanya
â€¢ Develop good relationships dengan dosen
â€¢ Join study groups dan organisasi kampus
â€¢ Balance academic dan extracurricular activities
â€¢ Take care of your mental health

ðŸ’¼ **Skill Development:**
- Critical thinking dan problem solving
- Time management dan organization
- Communication dan presentation
- Research dan analysis

Mau fokus pada skill atau mata kuliah tertentu?`,
	}
	
	contextNote := ""
	if fromContext {
		contextNote = "\n\n*Melanjutkan pembahasan akademik kita*"
	}
	
	return responses[rand.Intn(len(responses))] + contextNote
}

// getCreativeResponse - Response untuk pertanyaan kreatif
func getCreativeResponse(message string, fromContext bool) string {
	responses := []string{
		`**Creative Assistance: ` + message + `**

Untuk project kreatif dan inovasi:

ðŸŽ¨ **Proses Kreatif:**
â€¢ Brainstorming tanpa batasan dulu
â€¢ Research inspirasi dari berbagai sumber
â€¢ Develop ideas secara bertahap
â€¢ Get feedback dari orang lain
â€¢ Refine dan improve continuously

ðŸ’¡ **Creative Techniques:**
- Mind mapping untuk ide generation
- SCAMPER method (Substitute, Combine, Adapt, etc.)
- Reverse thinking - what wouldn't work?
- Constraint-based creativity

Butuh bantuan dengan aspek kreatif tertentu?`,

		`**Bantuan Kreatif: ` + message + `**

Saya bisa bantu dengan project kreatif:

ðŸ“ **Creative Writing:**
â€¢ Story development dan plot structure
â€¢ Character creation dan development
â€¢ Setting dan world-building
â€¢ Dialogue dan narrative style

ðŸŽ­ **Creative Projects:**
â€¢ Art dan design concepts
â€¢ Innovation dan invention ideas
â€¢ Presentation dan pitching
â€¢ Project planning

ðŸš€ **Innovation Tips:**
- Combine existing ideas in new ways
- Solve real problems people face
- Think about user experience
- Iterate based on feedback

Ada jenis project kreatif spesifik yang sedang dikerjakan?`,

		`**Ideation Help: ` + message + `**

Untuk mengembangkan ide kreatif:

âœ¨ **Creative Thinking Methods:**
â€¢ Analogical Thinking - belajar dari domain lain
â€¢ First Principles - kembali ke dasar
â€¢ Six Thinking Hats - multiple perspectives
â€¢ Random Input - stimulasi acak untuk ide baru

ðŸŒˆ **Inspiration Sources:**
- Nature dan science
- History dan culture
- Technology dan futurism
- Art dan literature
- Personal experiences

Mau explore jenis kreativitas tertentu?`,
	}
	
	contextNote := ""
	if fromContext {
		contextNote = "\n\n*Lanjutkan diskusi kreatif kita*"
	}
	
	return responses[rand.Intn(len(responses))] + contextNote
}

// getGreetingResponse - Response untuk salam
func getGreetingResponse() string {
	responses := []string{
		`Halo! ðŸ‘‹ Saya NF Assistant, asisten AI STUDENT HUB.

Saat ini saya sedang dalam mode terbatas, tetapi saya masih bisa membantu Anda dengan:

ðŸ’» **Programming & Technology**
ðŸ“š **Matematika & Sains**  
ðŸŽ“ **Akademik & Perkuliahan**
ðŸŽ¨ **Kreativitas & Inovasi**
ðŸ’¡ **Problem Solving**

Ada yang bisa saya bantu hari ini?`,

		`Halo! ðŸ˜Š Saya NF Assistant.

Walaupun sedang mengalami kendala teknis dengan AI utama, saya tetap siap membantu dengan pengetahuan yang ada.

Saya bisa bantu dengan:
â€¢ Pemrograman dan coding
â€¢ Matematika dan logika
â€¢ Tugas akademik
â€¢ Ide kreatif
â€¢ Dan banyak lagi!

Silakan tanyakan apa yang ingin diketahui!`,

		`Hai! ðŸ™Œ NF Assistant di sini!

Saat ini sistem AI sedang dalam perbaikan, tapi jangan khawatir - saya masih bisa memberikan bantuan dan guidance.

Area yang bisa saya bantu:
ðŸ”§ Technical problems
ðŸ“– Learning resources  
ðŸŽ¯ Study strategies
ðŸ’­ Creative ideas
ðŸ“Š Analysis & planning

Apa yang ingin kita diskusikan?`,
	}
	
	return responses[rand.Intn(len(responses))]
}

// getGeneralResponse - Default response untuk pertanyaan umum
func getGeneralResponse(message string) string {
	responses := []string{
		`**NF Assistant - Mode Terbatas**

Terima kasih untuk pertanyaannya: "` + message + `"

Saat ini saya sedang mengalami kendala teknis dengan layanan AI utama, tetapi saya masih bisa membantu dengan:

ðŸ¤” **Problem Solving** - Bantu analisis masalah dan cari solusi
ðŸ“š **Learning Guidance** - Rekomendasi resources dan strategi belajar
ðŸ’¡ **Idea Generation** - Bantu kembangkan ide dan konsep
ðŸŽ¯ **Planning & Strategy** - Bantu buat rencana dan strategi

Silakan jelaskan lebih detail apa yang ingin dibahas!`,

		`**Pertanyaan: ` + message + `**

Menarik! Walaupun dalam mode terbatas, saya akan berusaha memberikan bantuan terbaik.

Saya bisa bantu dengan:
â€¢ **Explanation** - Penjelasan konsep dan ide
â€¢ **Resources** - Rekomendasi sumber belajar
â€¢ **Strategies** - Cara pendekatan masalah
â€¢ **Guidance** - Panduan step-by-step

Apa aspek spesifik dari "` + message + `" yang paling ingin didalami?`,

		`**Diskusi: ` + message + `**

Terima kasih sudah bertanya! Sebagai NF Assistant, saya di sini untuk membantu meskipun sedang dalam kondisi terbatas.

ðŸ› ï¸ **Yang masih bisa saya bantu:**
â€¢ Conceptual understanding
â€¢ Learning recommendations  
â€¢ Problem analysis
â€¢ Planning assistance
â€¢ Resource guidance

ðŸ” **Mari explore bersama:** "` + message + `"`,
	}
	
	return responses[rand.Intn(len(responses))]
}

// Helper functions
func containsAny(text string, keywords []string) bool {
	for _, keyword := range keywords {
		if strings.Contains(text, keyword) {
			return true
		}
	}
	return false
}

func countKeywords(text string, keywords []string) int {
	count := 0
	for _, keyword := range keywords {
		if strings.Contains(text, keyword) {
			count++
		}
	}
	return count
}

func generateConversationID() string {
	return fmt.Sprintf("conv_%d_%d", time.Now().UnixNano(), rand.Intn(1000))
}

// GetChatHistory - Mendapatkan history chat
func GetChatHistory(c *gin.Context) {
	conversationID := c.Param("conversationId")
	history, exists := chatHistories[conversationID]
	
	if !exists {
		history = []ChatMessage{}
	}

	c.JSON(http.StatusOK, ChatResponse{
		Success: true,
		History: history,
	})
}

// DeleteChatHistory - Menghapus history chat
func DeleteChatHistory(c *gin.Context) {
	conversationID := c.Param("conversationId")
	delete(chatHistories, conversationID)
	
	c.JSON(http.StatusOK, ChatResponse{
		Success: true,
		Message: "Chat history deleted successfully",
	})
}

// HealthCheck - Health check endpoint
func HealthCheck(c *gin.Context) {
	// Test Puter.com API connectivity
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://api.puter.com/v1/models")
	
	status := "healthy"
	apiStatus := "connected"
	
	if err != nil || resp.StatusCode != http.StatusOK {
		apiStatus = "disconnected"
		status = "degraded"
	}
	
	if resp != nil {
		resp.Body.Close()
	}
	
	c.JSON(http.StatusOK, gin.H{
		"status":        status,
		"service":       "STUDENT HUB Chatbot",
		"api_status":    apiStatus,
		"conversations": len(chatHistories),
		"timestamp":     time.Now().Format(time.RFC3339),
		"version":       "1.0.0",
	})
}

// GetStats - Mendapatkan statistics chatbot
func GetStats(c *gin.Context) {
	totalConversations := len(chatHistories)
	totalMessages := 0
	
	for _, history := range chatHistories {
		totalMessages += len(history)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"total_conversations": totalConversations,
		"total_messages":      totalMessages,
		"active_since":        "2024",
		"status":              "operational",
	})
}
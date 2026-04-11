package telegram

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// Sender handles Telegram Bot API communication
type Sender struct {
	BotToken  string
	ChannelID string
	Client    *http.Client
}

// NewSender creates a new Telegram sender
func NewSender(botToken, channelID string) *Sender {
	return &Sender{
		BotToken:  botToken,
		ChannelID: channelID,
		Client:    &http.Client{Timeout: 10 * time.Second},
	}
}

// SendMessageRequest represents the Telegram sendMessage API payload
type SendMessageRequest struct {
	ChatID    string `json:"chat_id"`
	Text      string `json:"text"`
	ParseMode string `json:"parse_mode"`
}

// SendMessageResponse represents the Telegram API response
type SendMessageResponse struct {
	OK          bool   `json:"ok"`
	Description string `json:"description,omitempty"`
}

// SendMessage sends a message to the configured Telegram channel
// Implements retry with exponential backoff (max 3 attempts)
func (s *Sender) SendMessage(text string) error {
	if s.BotToken == "" {
		return fmt.Errorf("TELEGRAM_BOT_TOKEN is not configured")
	}

	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		err := s.doSend(text)
		if err == nil {
			log.Printf("[Telegram] Message sent successfully to %s (attempt %d)", s.ChannelID, attempt)
			return nil
		}

		lastErr = err
		log.Printf("[Telegram] Send failed (attempt %d/3): %v", attempt, err)

		if attempt < 3 {
			// Exponential backoff: 1s, 2s, 4s
			backoff := time.Duration(1<<uint(attempt-1)) * time.Second
			log.Printf("[Telegram] Retrying in %v...", backoff)
			time.Sleep(backoff)
		}
	}

	return fmt.Errorf("all 3 attempts failed, last error: %v", lastErr)
}

// doSend performs the actual HTTP call to Telegram Bot API
func (s *Sender) doSend(text string) error {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", s.BotToken)

	reqBody := SendMessageRequest{
		ChatID:    s.ChannelID,
		Text:      text,
		ParseMode: "HTML",
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := s.Client.Post(url, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram API returned status %d: %s", resp.StatusCode, string(body))
	}

	var apiResp SendMessageResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if !apiResp.OK {
		return fmt.Errorf("telegram API error: %s", apiResp.Description)
	}

	return nil
}

// FormatInstantNotification formats the instant notification message
func FormatInstantNotification(title, courseName, description, dueDate string, pertemuan int) string {
	return fmt.Sprintf(
		"📚 <b>TUGAS BARU!</b>\n\n"+
			"📖 Mata Kuliah: <b>%s</b>\n"+
			"📝 Judul: <b>%s</b>\n"+
			"📋 Pertemuan: %d\n"+
			"📄 Deskripsi: %s\n"+
			"⏰ Deadline: <b>%s</b>\n\n"+
			"Segera kerjakan dan kumpulkan sebelum deadline! 💪",
		courseName, title, pertemuan, description, dueDate,
	)
}

func FormatReminderNotification(title, courseName, dueDate, reminderType string, daysLeft int) string {
	var urgency string
	switch reminderType {
	case "h3":
		urgency = "! 3 Hari Lagi"
	case "h2":
		urgency = "!! 2 Hari Lagi"
	case "h1":
		urgency = "!!! BESOK!"
	case "h0":
		urgency = "!!!! HARI INI!‼️"
	default:
		urgency = fmt.Sprintf("%d hari lagi", daysLeft)
	}

	return fmt.Sprintf(
		"⏰ <b>REMINDER TUGAS</b> — %s\n\n"+
			"📖 Mata Kuliah: <b>%s</b>\n"+
			"📝 Judul: <b>%s</b>\n"+
			"📅 Deadline: <b>%s</b>\n\n"+
			"Jangan lupa kumpulkan tugasmu! 📤",
		urgency, courseName, title, dueDate,
	)
}

func FormatMateriNotification(title, courseName, description string, pertemuan int) string {
	return fmt.Sprintf(
		"📘 <b>MATERI BARU!</b>\n\n"+
			"📖 Mata Kuliah: <b>%s</b>\n"+
			"📝 Judul: <b>%s</b>\n"+
			"📋 Pertemuan: %d\n"+
			"📄 Deskripsi: %s\n\n"+
			"Silakan pelajari materi yang baru diupload! 🤓",
		courseName, title, pertemuan, description,
	)
}

package utils

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"

	openclawHandler "nf-student-hub-backend/openclaw/handler"
	"nf-student-hub-backend/openclaw/telegram"
)

// TugasCreatedEvent represents the event payload sent to OpenClaw
type TugasCreatedEvent struct {
	EventID      string `json:"event_id"`
	TugasID      int64  `json:"tugas_id"`
	CourseID     string `json:"course_id"`
	Pertemuan    int    `json:"pertemuan"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	DueDate      string `json:"due_date"`
	CreatedAt    string `json:"created_at"`
	ActorDosenID int    `json:"actor_dosen_id"`
	Type         string `json:"type"` // "tugas" or "materi-uploaded"
}

// openclawEventHandler is the in-process event handler (set by StartOpenClaw)
var openclawEventHandler *openclawHandler.EventHandler

// SetOpenClawHandler allows main.go to inject the shared event handler
func SetOpenClawHandler(h *openclawHandler.EventHandler) {
	openclawEventHandler = h
}

// PublishTugasCreatedEvent processes the tugas-created event directly in-process.
// No more HTTP call to a separate service — everything runs in the same process.
func PublishTugasCreatedEvent(db *sql.DB, event TugasCreatedEvent) {
	if event.EventID == "" {
		event.EventID = uuid.New().String()
	}

	// If the in-process handler is available, call it directly
	if openclawEventHandler != nil {
		// Convert to the handler's event type
		handlerEvent := openclawHandler.TugasCreatedEvent{
			EventID:      event.EventID,
			TugasID:      int(event.TugasID),
			CourseID:     event.CourseID,
			Pertemuan:    event.Pertemuan,
			Title:        event.Title,
			Description:  event.Description,
			DueDate:      event.DueDate,
			CreatedAt:    event.CreatedAt,
			ActorDosenID: event.ActorDosenID,
			Type:         event.Type,
		}

		// Process directly in a goroutine (non-blocking)
		go openclawEventHandler.ProcessEventDirect(handlerEvent)
		log.Printf("[OpenClaw] Event dispatched in-process: event_id=%s tugas_id=%d", event.EventID, event.TugasID)
		return
	}

	// Fallback: if handler not initialized, store in outbox
	log.Println("[OpenClaw] Handler not initialized — falling back to outbox")
	InsertOutboxEvent(db, event)
}

// InsertOutboxEvent stores a failed event into the outbox table for later retry
func InsertOutboxEvent(db *sql.DB, event TugasCreatedEvent) {
	if event.EventID == "" {
		event.EventID = uuid.New().String()
	}

	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("[OpenClaw] Failed to marshal event for outbox: %v", err)
		return
	}

	query := `
		INSERT INTO openclaw_event_outbox (event_id, event_type, payload, status, attempts, next_retry_at, created_at)
		VALUES ($1, 'tugas_created', $2, 'pending', 0, NOW(), NOW())
		ON CONFLICT (event_id) DO UPDATE SET updated_at = NOW()
	`
	_, err = db.Exec(query, event.EventID, string(payload))
	if err != nil {
		log.Printf("[OpenClaw] Failed to insert outbox event: %v", err)
		return
	}

	log.Printf("[OpenClaw] Event stored in outbox: event_id=%s tugas_id=%d", event.EventID, event.TugasID)
}

// FormatDueDate formats a time.Time or sql.NullTime to the expected event format
func FormatDueDate(t time.Time) string {
	return t.Format("2006-01-02T15:04:05+07:00")
}

// FormatCreatedAt formats creation timestamp
func FormatCreatedAt(t time.Time) string {
	return t.Format("2006-01-02T15:04:05+07:00")
}

// BuildTugasEvent is a convenience function to build a TugasCreatedEvent
func BuildTugasEvent(tugasID int64, courseID string, pertemuan int, title, description string, dueDate time.Time, dosenID int) TugasCreatedEvent {
	return TugasCreatedEvent{
		EventID:      uuid.New().String(),
		TugasID:      tugasID,
		CourseID:     courseID,
		Pertemuan:    pertemuan,
		Title:        title,
		Description:  description,
		DueDate:      FormatDueDate(dueDate),
		CreatedAt:    FormatCreatedAt(time.Now()),
		ActorDosenID: dosenID,
		Type:         "tugas-created",
	}
}

// LogOpenClawSkip logs when an event is intentionally skipped
func LogOpenClawSkip(reason string, tugasID int64) {
	log.Printf("[OpenClaw] SKIP tugas_id=%d reason=%s", tugasID, reason)
}

// GetTelegramSender creates a Telegram sender from environment variables
func GetTelegramSender() *telegram.Sender {
	botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	channelID := os.Getenv("TELEGRAM_CHANNEL_ID")
	if channelID == "" {
		channelID = "@tugasreminder"
	}
	return telegram.NewSender(botToken, channelID)
}

// StartOutboxWorker is kept for backward compatibility — now a no-op since outbox is embedded.
func StartOutboxWorker() {
	fmt.Println("[OpenClaw] Outbox worker now runs embedded inside the main backend server")
}

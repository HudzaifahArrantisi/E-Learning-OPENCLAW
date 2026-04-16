package utils

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
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

// PublishTugasCreatedEvent sends the tugas-created event to OpenClaw service.
// If OpenClaw is unreachable, it falls back to inserting into the outbox table.
func PublishTugasCreatedEvent(db *sql.DB, event TugasCreatedEvent) {
	if event.EventID == "" {
		event.EventID = uuid.New().String()
	}

	openclawURL := os.Getenv("OPENCLAW_BASE_URL")
	if openclawURL == "" {
		openclawURL = "http://localhost:9090"
	}

	endpoint := openclawURL + "/internal/events/tugas-created"

	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("[OpenClaw] Failed to marshal event: %v", err)
		InsertOutboxEvent(db, event)
		return
	}

	// Try to send to OpenClaw with a short timeout
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(endpoint, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("[OpenClaw] Failed to reach OpenClaw service: %v — falling back to outbox", err)
		InsertOutboxEvent(db, event)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("[OpenClaw] Event published successfully: event_id=%s tugas_id=%d", event.EventID, event.TugasID)
	} else {
		log.Printf("[OpenClaw] OpenClaw returned status %d — falling back to outbox", resp.StatusCode)
		InsertOutboxEvent(db, event)
	}
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

// StartOutboxWorker is a placeholder — the real outbox worker runs inside OpenClaw service.
// This function is here to document the architecture: the main backend only WRITES to outbox,
// the OpenClaw service is responsible for processing the outbox.
func StartOutboxWorker() {
	fmt.Println("[OpenClaw] Outbox worker runs inside OpenClaw service, not in main backend")
}

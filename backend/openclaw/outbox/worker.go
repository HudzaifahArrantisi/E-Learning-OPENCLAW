package outbox

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"log"
	"math"
	"net/http"
	"os"
	"time"
)

// Worker processes events from the openclaw_event_outbox table
type Worker struct {
	DB     *sql.DB
	Client *http.Client
}

// NewWorker creates a new outbox worker
func NewWorker(db *sql.DB) *Worker {
	return &Worker{
		DB:     db,
		Client: &http.Client{Timeout: 10 * time.Second},
	}
}

// OutboxEvent represents a row in openclaw_event_outbox
type OutboxEvent struct {
	ID          int64
	EventID     string
	EventType   string
	Payload     string
	Status      string
	Attempts    int
	MaxAttempts int
}

// Start begins the outbox worker loop
// It checks for pending events every 30 seconds
func (w *Worker) Start() {
	log.Println("[OutboxWorker] Started — checking every 30 seconds")

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Process immediately on start
	w.processOutbox()

	for range ticker.C {
		w.processOutbox()
	}
}

// processOutbox fetches and processes all pending outbox events
func (w *Worker) processOutbox() {
	events, err := w.fetchPendingEvents()
	if err != nil {
		log.Printf("[OutboxWorker] Failed to fetch pending events: %v", err)
		return
	}

	if len(events) == 0 {
		return
	}

	log.Printf("[OutboxWorker] Processing %d pending events", len(events))

	openclawURL := os.Getenv("OPENCLAW_BASE_URL")
	if openclawURL == "" {
		openclawURL = "http://localhost:9090"
	}
	endpoint := openclawURL + "/internal/events/tugas-created"

	for _, event := range events {
		w.processEvent(event, endpoint)
	}
}

// fetchPendingEvents retrieves pending events that are ready for retry
func (w *Worker) fetchPendingEvents() ([]OutboxEvent, error) {
	rows, err := w.DB.Query(`
		SELECT id, event_id, event_type, payload, status, attempts, max_attempts
		FROM openclaw_event_outbox
		WHERE status IN ('pending', 'processing')
			AND attempts < max_attempts
			AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		ORDER BY created_at ASC
		LIMIT 20
	`)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []OutboxEvent
	for rows.Next() {
		var e OutboxEvent
		err := rows.Scan(&e.ID, &e.EventID, &e.EventType, &e.Payload,
			&e.Status, &e.Attempts, &e.MaxAttempts)
		if err != nil {
			continue
		}
		events = append(events, e)
	}

	return events, nil
}

// processEvent attempts to deliver a single outbox event
func (w *Worker) processEvent(event OutboxEvent, endpoint string) {
	log.Printf("[OutboxWorker] Processing event_id=%s (attempt %d/%d)",
		event.EventID, event.Attempts+1, event.MaxAttempts)

	// Mark as processing
	w.updateStatus(event.ID, "processing", "", event.Attempts)

	// Validate payload is valid JSON
	var payload json.RawMessage
	if err := json.Unmarshal([]byte(event.Payload), &payload); err != nil {
		log.Printf("[OutboxWorker] Invalid JSON payload for event_id=%s: %v", event.EventID, err)
		w.updateStatus(event.ID, "failed", "Invalid JSON payload: "+err.Error(), event.Attempts+1)
		return
	}

	// Send to OpenClaw event handler (self — since outbox worker runs inside OpenClaw)
	resp, err := w.Client.Post(endpoint, "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("[OutboxWorker] Failed to deliver event_id=%s: %v", event.EventID, err)
		w.scheduleRetry(event)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("[OutboxWorker] Successfully delivered event_id=%s", event.EventID)
		w.updateStatus(event.ID, "success", "", event.Attempts+1)
	} else {
		log.Printf("[OutboxWorker] Event_id=%s delivery returned status %d", event.EventID, resp.StatusCode)
		w.scheduleRetry(event)
	}
}

// scheduleRetry increments attempts and sets next_retry_at with exponential backoff
func (w *Worker) scheduleRetry(event OutboxEvent) {
	newAttempts := event.Attempts + 1

	if newAttempts >= event.MaxAttempts {
		log.Printf("[OutboxWorker] Max attempts reached for event_id=%s — marking as failed", event.EventID)
		w.updateStatus(event.ID, "failed", "Max attempts reached", newAttempts)
		return
	}

	// Exponential backoff: 30s, 60s, 120s, ...
	backoffSeconds := 30 * math.Pow(2, float64(event.Attempts))
	nextRetry := time.Now().Add(time.Duration(backoffSeconds) * time.Second)

	log.Printf("[OutboxWorker] Scheduling retry for event_id=%s at %s (attempt %d/%d)",
		event.EventID, nextRetry.Format("15:04:05"), newAttempts, event.MaxAttempts)

	_, err := w.DB.Exec(`
		UPDATE openclaw_event_outbox 
		SET status = 'pending', attempts = $1, next_retry_at = $2, last_error = 'Retry scheduled', updated_at = NOW()
		WHERE id = $3
	`, newAttempts, nextRetry, event.ID)

	if err != nil {
		log.Printf("[OutboxWorker] Failed to schedule retry: %v", err)
	}
}

// updateStatus updates the status of an outbox event
func (w *Worker) updateStatus(id int64, status, errorMsg string, attempts int) {
	_, err := w.DB.Exec(`
		UPDATE openclaw_event_outbox 
		SET status = $1, last_error = $2, attempts = $3, updated_at = NOW()
		WHERE id = $4
	`, status, errorMsg, attempts, id)

	if err != nil {
		log.Printf("[OutboxWorker] Failed to update status for id=%d: %v", id, err)
	}
}

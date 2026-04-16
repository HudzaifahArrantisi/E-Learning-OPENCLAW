package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"openclaw/notiflog"
	"openclaw/telegram"
)

// TugasCreatedEvent is the incoming event from the main backend
type TugasCreatedEvent struct {
	EventID      string `json:"event_id"`
	TugasID      int    `json:"tugas_id"`
	CourseID     string `json:"course_id"`
	Pertemuan    int    `json:"pertemuan"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	DueDate      string `json:"due_date"`
	CreatedAt    string `json:"created_at"`
	ActorDosenID int    `json:"actor_dosen_id"`
	Type         string `json:"type"` // "tugas-created" or "materi-uploaded"
}

// EventHandler handles incoming tugas-created events
type EventHandler struct {
	DB     *sql.DB
	Sender *telegram.Sender
}

// NewEventHandler creates a new EventHandler
func NewEventHandler(db *sql.DB, sender *telegram.Sender) *EventHandler {
	return &EventHandler{
		DB:     db,
		Sender: sender,
	}
}

// HandleTugasCreated processes the tugas-created event
func (h *EventHandler) HandleTugasCreated(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]interface{}{
			"success": false,
			"message": "Method not allowed",
		})
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[EventHandler] Failed to read request body: %v", err)
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Failed to read request body",
		})
		return
	}
	defer r.Body.Close()

	var event TugasCreatedEvent
	if err := json.Unmarshal(body, &event); err != nil {
		log.Printf("[EventHandler] Failed to parse event: %v", err)
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Invalid event payload",
		})
		return
	}

	// Validate required fields
	if event.TugasID == 0 || event.CourseID == "" || event.Title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Missing required fields: tugas_id, course_id, title",
		})
		return
	}

	log.Printf("[EventHandler] Received event: event_id=%s tugas_id=%d course_id=%s title=%s",
		event.EventID, event.TugasID, event.CourseID, event.Title)

	// Send instant notification
	go h.sendInstantNotification(event)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Event received and instant notification queued",
	})
}

// sendInstantNotification sends an instant Telegram notification for a new tugas
func (h *EventHandler) sendInstantNotification(event TugasCreatedEvent) {
	recipientID := h.Sender.ChannelID

	// Check dedup
	if notiflog.IsDuplicate(h.DB, event.TugasID, "instant", recipientID, time.Now()) {
		log.Printf("[EventHandler] SKIP instant notification — already sent today: tugas_id=%d", event.TugasID)
		return
	}

	// Get course name from DB
	courseName := h.getCourseName(event.CourseID)

	// Format due date for display
	dueDateDisplay := event.DueDate
	if t, err := time.Parse("2006-01-02T15:04:05+07:00", event.DueDate); err == nil {
		dueDateDisplay = t.Format("02 Jan 2006 15:04")
	} else if t, err := time.Parse("2006-01-02T15:04:05Z07:00", event.DueDate); err == nil {
		dueDateDisplay = t.Format("02 Jan 2006 15:04")
	}

	// Format message based on event Type
	var message string
	if event.Type == "materi-uploaded" {
		message = telegram.FormatMateriNotification(
			event.Title, courseName, event.Description, event.Pertemuan,
		)
	} else {
		message = telegram.FormatInstantNotification(
			event.Title, courseName, event.Description, dueDateDisplay, event.Pertemuan,
		)
	}

	// Send
	err := h.Sender.SendMessage(message)
	if err != nil {
		log.Printf("[EventHandler] Failed to send instant notification: %v", err)
		notiflog.InsertLog(h.DB, event.TugasID, "instant", "channel", recipientID, "failed", message, err.Error())
		return
	}

	// Log success
	notiflog.InsertLog(h.DB, event.TugasID, "instant", "channel", recipientID, "success", message, "")
	log.Printf("[EventHandler] Instant notification sent for tugas_id=%d", event.TugasID)
}

// getCourseName fetches the course name from the database
func (h *EventHandler) getCourseName(courseID string) string {
	var courseName string
	err := h.DB.QueryRow("SELECT nama FROM mata_kuliah WHERE kode = $1", courseID).Scan(&courseName)
	if err != nil {
		return courseID // Fallback to course ID if not found
	}
	return courseName
}

// HealthCheck handles the health check endpoint
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"service": "openclaw",
		"status":  "healthy",
		"time":    time.Now().Format("2006-01-02T15:04:05Z07:00"),
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// FormatDueDateForDisplay parses and formats a due date string for display
func FormatDueDateForDisplay(dueDateStr string) string {
	formats := []string{
		"2006-01-02T15:04:05+07:00",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}

	for _, f := range formats {
		if t, err := time.Parse(f, dueDateStr); err == nil {
			return t.Format("02 Jan 2006 15:04")
		}
	}

	return dueDateStr
}

// GetStudentCountForCourse returns the number of enrolled students for a course
func GetStudentCountForCourse(db *sql.DB, courseID string) int {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(DISTINCT mmk.mahasiswa_id) 
		FROM mahasiswa_mata_kuliah mmk 
		WHERE mmk.mata_kuliah_kode = $1
	`, courseID).Scan(&count)

	if err != nil {
		return 0
	}
	return count
}

// GetPendingStudentsForTask returns student IDs who haven't submitted a specific task
func GetPendingStudentsForTask(db *sql.DB, tugasID int, courseID string) ([]int, error) {
	rows, err := db.Query(`
		SELECT DISTINCT mmk.mahasiswa_id
		FROM mahasiswa_mata_kuliah mmk
		WHERE mmk.mata_kuliah_kode = $1
			AND mmk.mahasiswa_id NOT IN (
				SELECT s.student_id FROM submissions s WHERE s.task_id = $2
			)
	`, courseID, tugasID)

	if err != nil {
		return nil, fmt.Errorf("failed to query pending students: %w", err)
	}
	defer rows.Close()

	var studentIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			continue
		}
		studentIDs = append(studentIDs, id)
	}

	return studentIDs, nil
}

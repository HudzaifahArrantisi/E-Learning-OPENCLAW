package notiflog

import (
	"database/sql"
	"log"
	"time"
)

// NotificationLog represents a record in openclaw_notification_log
type NotificationLog struct {
	ID            int64
	TugasID       int
	ReminderType  string
	RecipientType string
	RecipientID   string
	Status        string
	SentOn        string
	MessageText   string
	ErrorMessage  string
	Attempts      int
}

// IsDuplicate checks if a notification has already been sent for this combination
// Dedup key: tugas_id + reminder_type + recipient_id + sent_on
func IsDuplicate(db *sql.DB, tugasID int, reminderType, recipientID string, sentOn time.Time) bool {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM openclaw_notification_log 
		WHERE tugas_id = $1 AND reminder_type = $2 AND recipient_id = $3 AND sent_on = $4 AND status = 'success'
	`, tugasID, reminderType, recipientID, sentOn.Format("2006-01-02")).Scan(&count)

	if err != nil {
		log.Printf("[NotifLog] Error checking duplicate: %v", err)
		return false // Don't block on error, allow sending
	}

	if count > 0 {
		log.Printf("[NotifLog] DUPLICATE detected: tugas_id=%d type=%s recipient=%s date=%s",
			tugasID, reminderType, recipientID, sentOn.Format("2006-01-02"))
		return true
	}

	return false
}

// InsertLog inserts a notification log record
// Uses INSERT ... ON DUPLICATE KEY UPDATE to handle concurrent execution safely
func InsertLog(db *sql.DB, tugasID int, reminderType, recipientType, recipientID, status, messageText, errorMessage string) error {
	sentOn := time.Now().Format("2006-01-02")

	query := `
		INSERT INTO openclaw_notification_log 
			(tugas_id, reminder_type, recipient_type, recipient_id, status, sent_on, message_text, error_message, attempts, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW())
		ON CONFLICT (tugas_id, reminder_type, recipient_id, sent_on) DO UPDATE SET 
			status = EXCLUDED.status,
			error_message = EXCLUDED.error_message,
			attempts = openclaw_notification_log.attempts + 1,
			updated_at = NOW()
	`

	_, err := db.Exec(query, tugasID, reminderType, recipientType, recipientID, status, sentOn, messageText, errorMessage)
	if err != nil {
		log.Printf("[NotifLog] Failed to insert log: tugas_id=%d type=%s error=%v", tugasID, reminderType, err)
		return err
	}

	log.Printf("[NotifLog] Logged: tugas_id=%d type=%s recipient=%s status=%s", tugasID, reminderType, recipientID, status)
	return nil
}

// UpdateLogStatus updates the status of a notification log entry
func UpdateLogStatus(db *sql.DB, tugasID int, reminderType, recipientID, status, errorMessage string) error {
	sentOn := time.Now().Format("2006-01-02")

	query := `
		UPDATE openclaw_notification_log 
		SET status = $1, error_message = $2, attempts = attempts + 1, updated_at = NOW()
		WHERE tugas_id = $3 AND reminder_type = $4 AND recipient_id = $5 AND sent_on = $6
	`

	_, err := db.Exec(query, status, errorMessage, tugasID, reminderType, recipientID, sentOn)
	if err != nil {
		log.Printf("[NotifLog] Failed to update log: %v", err)
	}
	return err
}

// GetFailedLogs returns failed notification logs that can be retried (attempts < maxAttempts)
func GetFailedLogs(db *sql.DB, maxAttempts int) ([]NotificationLog, error) {
	rows, err := db.Query(`
		SELECT id, tugas_id, reminder_type, recipient_type, recipient_id, status, sent_on, 
		       COALESCE(message_text, '') as message_text, COALESCE(error_message, '') as error_message, attempts
		FROM openclaw_notification_log 
		WHERE status = 'failed' AND attempts < $1 AND sent_on = CURRENT_DATE
		ORDER BY created_at ASC
		LIMIT 50
	`, maxAttempts)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []NotificationLog
	for rows.Next() {
		var l NotificationLog
		err := rows.Scan(&l.ID, &l.TugasID, &l.ReminderType, &l.RecipientType,
			&l.RecipientID, &l.Status, &l.SentOn, &l.MessageText, &l.ErrorMessage, &l.Attempts)
		if err != nil {
			continue
		}
		logs = append(logs, l)
	}

	return logs, nil
}

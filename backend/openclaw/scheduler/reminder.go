package scheduler

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"openclaw/notiflog"
	"openclaw/telegram"

	"github.com/robfig/cron/v3"
)

// ReminderTask contains tugas information needed for reminder processing
type ReminderTask struct {
	ID          int
	CourseID    string
	CourseName  string
	Title       string
	Description string
	DueDate     time.Time
	Pertemuan   int
}

// Scheduler manages the cron-based reminder system
type Scheduler struct {
	DB     *sql.DB
	Sender *telegram.Sender
	Cron   *cron.Cron
}

// NewScheduler creates a new Scheduler instance
func NewScheduler(db *sql.DB, sender *telegram.Sender) *Scheduler {
	return &Scheduler{
		DB:     db,
		Sender: sender,
		Cron:   cron.New(),
	}
}

// Start begins the cron scheduler with the given schedule expression
func (s *Scheduler) Start(schedule string) {
	_, err := s.Cron.AddFunc(schedule, s.processReminders)
	if err != nil {
		log.Fatalf("[Scheduler] Failed to add cron job: %v", err)
	}

	// Also add a job to retry failed notifications every 30 minutes
	_, err = s.Cron.AddFunc("*/30 * * * *", s.retryFailedNotifications)
	if err != nil {
		log.Printf("[Scheduler] Failed to add retry cron job: %v", err)
	}

	s.Cron.Start()
	log.Printf("[Scheduler] Started with schedule: %s", schedule)
	log.Printf("[Scheduler] Failed notification retry: every 30 minutes")
}

// Stop gracefully stops the scheduler
func (s *Scheduler) Stop() {
	s.Cron.Stop()
	log.Println("[Scheduler] Stopped")
}

// processReminders is the main cron job that checks for due reminders
func (s *Scheduler) processReminders() {
	log.Println("[Scheduler] ========== Running reminder check ==========")
	now := time.Now()

	// Query all active tugas that need reminders
	// Filter: type='tugas', deleted_at IS NULL, due_date IS NOT NULL, due_date >= today
	tasks, err := s.getActiveTasks()
	if err != nil {
		log.Printf("[Scheduler] Failed to fetch active tasks: %v", err)
		return
	}

	log.Printf("[Scheduler] Found %d active tasks to check", len(tasks))

	for _, task := range tasks {
		s.processTaskReminders(task, now)
	}

	log.Println("[Scheduler] ========== Reminder check completed ==========")
}

// getActiveTasks fetches all tugas eligible for reminders
func (s *Scheduler) getActiveTasks() ([]ReminderTask, error) {
	query := `
		SELECT 
			t.id, t.course_id, mk.nama, t.title, 
			COALESCE(t.description, '') as description,
			t.due_date, t.pertemuan
		FROM tugas t
		JOIN mata_kuliah mk ON t.course_id = mk.kode
		WHERE t.type = 'tugas'
			AND t.deleted_at IS NULL
			AND t.due_date IS NOT NULL
			AND t.due_date >= CURRENT_DATE
		ORDER BY t.due_date ASC
	`

	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []ReminderTask
	for rows.Next() {
		var task ReminderTask
		err := rows.Scan(&task.ID, &task.CourseID, &task.CourseName, &task.Title,
			&task.Description, &task.DueDate, &task.Pertemuan)
		if err != nil {
			log.Printf("[Scheduler] Error scanning task: %v", err)
			continue
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
}

// processTaskReminders determines and sends appropriate reminders for a single task
func (s *Scheduler) processTaskReminders(task ReminderTask, now time.Time) {
	// Calculate days remaining until due date (using date only, not time)
	dueDay := time.Date(task.DueDate.Year(), task.DueDate.Month(), task.DueDate.Day(), 0, 0, 0, 0, task.DueDate.Location())
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	daysRemaining := int(dueDay.Sub(today).Hours() / 24)

	// Determine which reminder type to send based on days remaining
	var reminderType string
	switch daysRemaining {
	case 3:
		reminderType = "h3"
	case 2:
		reminderType = "h2"
	case 1:
		reminderType = "h1"
	case 0:
		reminderType = "h0"
	default:
		// No reminder needed for this day
		return
	}

	log.Printf("[Scheduler] Task %d (%s) — days_remaining=%d reminder_type=%s",
		task.ID, task.Title, daysRemaining, reminderType)

	recipientID := s.Sender.ChannelID

	// Check dedup
	if notiflog.IsDuplicate(s.DB, task.ID, reminderType, recipientID, now) {
		log.Printf("[Scheduler] SKIP — already sent %s for tugas_id=%d today", reminderType, task.ID)
		return
	}

	// Check if there are students who haven't submitted yet
	pendingCount, err := s.getPendingStudentCount(task.ID, task.CourseID)
	if err != nil {
		log.Printf("[Scheduler] Error checking pending students: %v", err)
		// Continue anyway — send to channel regardless
	}

	if pendingCount == 0 {
		log.Printf("[Scheduler] SKIP — all students have submitted tugas_id=%d", task.ID)
		notiflog.InsertLog(s.DB, task.ID, reminderType, "channel", recipientID,
			"success", "Skipped: all students submitted", "")
		return
	}

	// Format and send the reminder
	dueDateDisplay := task.DueDate.Format("02 Jan 2006 15:04")
	message := telegram.FormatReminderNotification(
		task.Title, task.CourseName, dueDateDisplay, reminderType, daysRemaining,
	)

	// Append pending student count info
	message += fmt.Sprintf("\n\n👥 %d mahasiswa belum mengumpulkan", pendingCount)

	err = s.Sender.SendMessage(message)
	if err != nil {
		log.Printf("[Scheduler] Failed to send %s reminder for tugas_id=%d: %v", reminderType, task.ID, err)
		notiflog.InsertLog(s.DB, task.ID, reminderType, "channel", recipientID,
			"failed", message, err.Error())
		return
	}

	notiflog.InsertLog(s.DB, task.ID, reminderType, "channel", recipientID,
		"success", message, "")
	log.Printf("[Scheduler] Sent %s reminder for tugas_id=%d (%s)", reminderType, task.ID, task.Title)
}

// getPendingStudentCount returns the number of students who haven't submitted a task
func (s *Scheduler) getPendingStudentCount(tugasID int, courseID string) (int, error) {
	var count int
	err := s.DB.QueryRow(`
		SELECT COUNT(DISTINCT mmk.mahasiswa_id)
		FROM mahasiswa_mata_kuliah mmk
		WHERE mmk.mata_kuliah_kode = $1
			AND mmk.mahasiswa_id NOT IN (
				SELECT s.student_id FROM submissions s WHERE s.task_id = $2
			)
	`, courseID, tugasID).Scan(&count)

	if err != nil {
		return 0, err
	}
	return count, nil
}

// retryFailedNotifications retries failed notifications from today
func (s *Scheduler) retryFailedNotifications() {
	failedLogs, err := notiflog.GetFailedLogs(s.DB, 3)
	if err != nil {
		log.Printf("[Scheduler] Failed to get failed logs: %v", err)
		return
	}

	if len(failedLogs) == 0 {
		return
	}

	log.Printf("[Scheduler] Retrying %d failed notifications", len(failedLogs))

	for _, l := range failedLogs {
		if l.MessageText == "" {
			log.Printf("[Scheduler] SKIP retry — no message text for log_id=%d", l.ID)
			continue
		}

		err := s.Sender.SendMessage(l.MessageText)
		if err != nil {
			log.Printf("[Scheduler] Retry failed for tugas_id=%d type=%s: %v", l.TugasID, l.ReminderType, err)
			notiflog.UpdateLogStatus(s.DB, l.TugasID, l.ReminderType, l.RecipientID, "failed", err.Error())
		} else {
			log.Printf("[Scheduler] Retry succeeded for tugas_id=%d type=%s", l.TugasID, l.ReminderType)
			notiflog.UpdateLogStatus(s.DB, l.TugasID, l.ReminderType, l.RecipientID, "success", "")
		}
	}
}

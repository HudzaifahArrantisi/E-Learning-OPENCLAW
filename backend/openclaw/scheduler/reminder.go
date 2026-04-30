package scheduler

import (
	"database/sql"
	"log"
	"time"

	"nf-student-hub-backend/openclaw/notiflog"
	"nf-student-hub-backend/openclaw/telegram"

	"github.com/robfig/cron/v3"
)

// ReminderTask contains tugas information needed for reminder processing
type ReminderTask struct {
	ID          int
	CourseID    string
	CourseName  string
	Category    string
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
	tasks, err := s.getActiveTasks()
	if err != nil {
		log.Printf("[Scheduler] Failed to fetch active tasks: %v", err)
		return
	}

	log.Printf("[Scheduler] Found %d active tasks to check", len(tasks))

	var remindersToGroup []map[string]interface{}
	var tasksToLog []struct {
		task         ReminderTask
		reminderType string
		pendingCount int
	}

	recipientID := s.Sender.ChannelID

	for _, task := range tasks {
		// Calculate days remaining until due date
		dueDay := time.Date(task.DueDate.Year(), task.DueDate.Month(), task.DueDate.Day(), 0, 0, 0, 0, task.DueDate.Location())
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		daysRemaining := int(dueDay.Sub(today).Hours() / 24)

		// Determine which reminder type to send
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
			continue
		}

		// Check dedup
		if notiflog.IsDuplicate(s.DB, task.ID, reminderType, recipientID, now) {
			continue
		}

		// Check pending count
		pendingCount, err := s.getPendingStudentCount(task.ID, task.CourseID)
		if err != nil {
			log.Printf("[Scheduler] Error checking pending students for task %d: %v", task.ID, err)
			continue
		}

		if pendingCount == 0 {
			notiflog.InsertLog(s.DB, task.ID, reminderType, "channel", recipientID,
				"success", "Skipped: all students submitted", "")
			continue
		}

		// Add to group
		remindersToGroup = append(remindersToGroup, map[string]interface{}{
			"title":        task.Title,
			"courseName":   task.CourseName,
			"dueDate":      task.DueDate.Format("02 Jan 2006 15:04"),
			"reminderType": reminderType,
			"daysLeft":     daysRemaining,
			"pendingCount": pendingCount,
		})

		tasksToLog = append(tasksToLog, struct {
			task         ReminderTask
			reminderType string
			pendingCount int
		}{
			task:         task,
			reminderType: reminderType,
			pendingCount: pendingCount,
		})
	}

	// Send grouped message if any
	if len(remindersToGroup) > 0 {
		message := telegram.FormatGroupedReminderNotification(remindersToGroup)
		err = s.Sender.SendMessage(message)

		status := "success"
		errMsg := ""
		if err != nil {
			status = "failed"
			errMsg = err.Error()
			log.Printf("[Scheduler] Failed to send grouped reminder: %v", err)
		}

		for _, item := range tasksToLog {
			notiflog.InsertLog(s.DB, item.task.ID, item.reminderType, "channel", recipientID,
				status, message, errMsg)
		}
		
		if err == nil {
			log.Printf("[Scheduler] Sent grouped reminder for %d tasks", len(remindersToGroup))
		}
	}

	log.Println("[Scheduler] ========== Reminder check completed ==========")
}

// getActiveTasks fetches all tugas eligible for reminders
func (s *Scheduler) getActiveTasks() ([]ReminderTask, error) {
	query := `
		SELECT 
			t.id, t.course_id, mk.nama, COALESCE(mk.kategori, 'wajib') as kategori, t.title, 
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
		err := rows.Scan(&task.ID, &task.CourseID, &task.CourseName, &task.Category, &task.Title,
			&task.Description, &task.DueDate, &task.Pertemuan)
		if err != nil {
			log.Printf("[Scheduler] Error scanning task: %v", err)
			continue
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
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

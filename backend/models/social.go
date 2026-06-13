package models

import "time"

type Follow struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	FollowerID  int       `json:"follower_id" gorm:"not null;uniqueIndex:idx_follow_relation"`
	FollowingID int       `json:"following_id" gorm:"not null;uniqueIndex:idx_follow_relation"`
	CreatedAt   time.Time `json:"created_at"`
}

type SocialNotification struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	RecipientID int        `json:"recipient_id" gorm:"not null;index"`
	ActorID     int        `json:"actor_id" gorm:"not null;index"`
	Type        string     `json:"type" gorm:"size:32;not null;index"`
	ReferenceID *uint      `json:"reference_id,omitempty"`
	Message     string     `json:"message" gorm:"size:255;not null"`
	IsRead      bool       `json:"is_read" gorm:"not null;default:false;index"`
	CreatedAt   time.Time  `json:"created_at" gorm:"index"`
}

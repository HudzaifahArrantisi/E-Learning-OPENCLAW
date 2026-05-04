package models

import (
	"database/sql"
	"time"
)

// ==================== CHAT MODELS ====================

type Conversation struct {
	ID           int        `json:"id" gorm:"primaryKey"`
	Type         string     `json:"type" gorm:"type:ENUM('private','group');not null;default:'private'"`
	Name         string     `json:"name" gorm:"size:255"`
	MataKuliahID *int       `json:"mata_kuliah_id"`
	CreatedBy    int        `json:"created_by" gorm:"not null"`
	CreatedAt    time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt    *time.Time `json:"deleted_at" gorm:"-"`
	
	// Relations
	MataKuliah   *MataKuliah              `json:"mata_kuliah,omitempty" gorm:"foreignKey:MataKuliahID"`
	Participants []ConversationParticipant `json:"participants,omitempty" gorm:"foreignKey:ConversationID"`
	Messages     []Message                `json:"messages,omitempty" gorm:"foreignKey:ConversationID"`
	Creator      User                     `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
}

type ConversationParticipant struct {
	ID             int        `json:"id" gorm:"primaryKey"`
	ConversationID int        `json:"conversation_id" gorm:"not null"`
	UserID         int        `json:"user_id" gorm:"not null"`
	Role           string     `json:"role" gorm:"type:ENUM('admin','member','owner');default:'member'"`
	JoinedAt       time.Time  `json:"joined_at" gorm:"autoCreateTime"`
	LastReadAt     *time.Time `json:"last_read_at"`
	DeletedAt      *time.Time `json:"deleted_at" gorm:"-"`
	
	// Relations
	User         User        `json:"user" gorm:"foreignKey:UserID"`
	Conversation Conversation `json:"conversation,omitempty" gorm:"foreignKey:ConversationID"`
}

type Message struct {
	ID             int        `json:"id" gorm:"primaryKey"`
	ConversationID int        `json:"conversation_id" gorm:"not null"`
	SenderID       int        `json:"sender_id" gorm:"not null"`
	MessageType    string     `json:"message_type" gorm:"type:ENUM('text','image','file','system');default:'text'"`
	Content        string     `json:"content" gorm:"type:text;not null"`
	FileURL        *string    `json:"file_url" gorm:"size:500"`
	FileName       *string    `json:"file_name" gorm:"size:255"`
	FileSize       *int       `json:"file_size"`
	IsRead         bool       `json:"is_read" gorm:"default:false"`
	ReadAt         *time.Time `json:"read_at"`
	CreatedAt      time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt      time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt      *time.Time `json:"deleted_at"`
	
	// Relations
	Sender       User        `json:"sender" gorm:"foreignKey:SenderID"`
	Conversation Conversation `json:"conversation,omitempty" gorm:"foreignKey:ConversationID"`
}

type MataKuliahChatGroup struct {
	ID             int        `json:"id" gorm:"primaryKey"`
	MataKuliahID   int        `json:"mata_kuliah_id" gorm:"not null;unique"`
	ConversationID int        `json:"conversation_id" gorm:"not null"`
	CreatedBy      int        `json:"created_by" gorm:"not null"`
	CreatedAt      time.Time  `json:"created_at" gorm:"autoCreateTime"`
	DeletedAt      *time.Time `json:"deleted_at"`
	
	// Relations
	MataKuliah   MataKuliah   `json:"mata_kuliah" gorm:"foreignKey:MataKuliahID"`
	Conversation Conversation `json:"conversation" gorm:"foreignKey:ConversationID"`
	Creator      User         `json:"creator" gorm:"foreignKey:CreatedBy"`
}

type PinnedConversation struct {
	ID             int       `json:"id" gorm:"primaryKey"`
	UserID         int       `json:"user_id" gorm:"not null"`
	ConversationID int       `json:"conversation_id" gorm:"not null"`
	CreatedAt      time.Time `json:"created_at" gorm:"autoCreateTime"`
	
	// Relations
	User         User        `json:"user" gorm:"foreignKey:UserID"`
	Conversation Conversation `json:"conversation" gorm:"foreignKey:ConversationID"`
}

// ==================== REQUEST STRUCTS ====================

type CreateConversationRequest struct {
	Type         string  `json:"type" binding:"required,oneof=private group"`
	Name         *string `json:"name"`
	MataKuliahID *int    `json:"mata_kuliah_id"`
	Participants []int   `json:"participants" binding:"required,min=1"`
}

type SendMessageRequest struct {
	ConversationID int     `json:"conversation_id" binding:"required"`
	Content        string  `json:"content" binding:"required"`
	MessageType    string  `json:"message_type" binding:"required,oneof=text image file"`
	FileURL        *string `json:"file_url"`
	FileName       *string `json:"file_name"`
	FileSize       *int    `json:"file_size"`
}

type CreateGroupMatkulRequest struct {
	MataKuliahID int `json:"mata_kuliah_id" binding:"required"`
}

type AddRemoveParticipantRequest struct {
	UserID int `json:"user_id" binding:"required"`
}

type UpdateConversationRequest struct {
	Name *string `json:"name"`
}

// ==================== RESPONSE STRUCTS ====================

type ConversationResponse struct {
	ID           int                  `json:"id"`
	Type         string               `json:"type"`
	Name         string               `json:"name"`
	MataKuliah   *MataKuliahResponse  `json:"mata_kuliah,omitempty"`
	LastMessage  *MessageResponse     `json:"last_message,omitempty"`
	UnreadCount  int                  `json:"unread_count"`
	Participants []ParticipantResponse `json:"participants"`
	IsPinned     bool                 `json:"is_pinned"`
	CreatedAt    time.Time            `json:"created_at"`
	UpdatedAt    time.Time            `json:"updated_at"`
}

type MessageResponse struct {
	ID          int          `json:"id"`
	Sender      UserResponse `json:"sender"`
	Content     string       `json:"content"`
	MessageType string       `json:"message_type"`
	FileURL     *string      `json:"file_url,omitempty"`
	FileName    *string      `json:"file_name,omitempty"`
	FileSize    *int         `json:"file_size,omitempty"`
	IsRead      bool         `json:"is_read"`
	CreatedAt   time.Time    `json:"created_at"`
}

type ParticipantResponse struct {
	UserID     int          `json:"user_id"`
	User       UserResponse `json:"user"`
	Role       string       `json:"role"`
	JoinedAt   time.Time    `json:"joined_at"`
	LastReadAt *time.Time   `json:"last_read_at,omitempty"`
}

type UserResponse struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Photo    string `json:"photo,omitempty"`
	NIM      string `json:"nim,omitempty"`
	NIP      string `json:"nip,omitempty"`
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone,omitempty"`
}

type MataKuliahResponse struct {
	ID    int         `json:"id"`
	Kode  string      `json:"kode"`
	Nama  string      `json:"nama"`
	SKS   int         `json:"sks"`
	Dosen UserResponse `json:"dosen"`
}

type ChatStatsResponse struct {
	TotalConversations int `json:"total_conversations"`
	TotalMessages      int `json:"total_messages"`
	UnreadMessages     int `json:"unread_messages"`
	GroupChats         int `json:"group_chats"`
	PrivateChats       int `json:"private_chats"`
}

type WebsocketMessage struct {
	Type    string      `json:"type"`
	Data    interface{} `json:"data"`
	UserID  int         `json:"user_id,omitempty"`
}

type TypingIndicator struct {
	ConversationID int    `json:"conversation_id"`
	UserID         int    `json:"user_id"`
	UserName       string `json:"user_name"`
	IsTyping       bool   `json:"is_typing"`
}

// Helper functions
func MapUserToResponse(user User) UserResponse {
	resp := UserResponse{
		ID:    user.ID,
		Role:  user.Role,
		Email: user.Email,
	}

	// Extract fields based on role
	if user.Role == "mahasiswa" && user.Mahasiswa != nil {
		resp.Name = user.Mahasiswa.Name
		resp.Photo = user.Mahasiswa.Photo
		resp.NIM = user.Mahasiswa.NIM
	} else if user.Role == "dosen" && user.Dosen != nil {
		resp.Name = user.Dosen.Name
		// Assuming Dosen does not have photo based on schema, or if it does, add it here
		resp.NIP = sql.NullString{String: user.Dosen.NIP, Valid: user.Dosen.NIP != ""}.String
	} else if user.Role == "ukm" && user.Ukm != nil {
		resp.Name = user.Ukm.Name
		resp.Username = user.Ukm.Username
		resp.Photo = user.Ukm.ProfilePicture
		resp.Phone = user.Ukm.Phone
	} else if user.Role == "ormawa" && user.Ormawa != nil {
		resp.Name = user.Ormawa.Name
		resp.Username = user.Ormawa.Username
		resp.Photo = user.Ormawa.ProfilePicture
		resp.Phone = user.Ormawa.Phone
	} else {
		// Fallback for admin or if relations are missing
		resp.Name = user.Email // Fallback to email if name is truly unknown
	}

	return resp
}

func (c *Conversation) GetParticipantIDs() []int {
	var ids []int
	for _, p := range c.Participants {
		ids = append(ids, p.UserID)
	}
	return ids
}
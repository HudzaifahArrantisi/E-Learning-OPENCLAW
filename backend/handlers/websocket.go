package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"nf-student-hub-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // For development only
	},
}

// Client represents a WebSocket connection
type Client struct {
	UserID   int
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *WebSocketHub
}

// WebSocketHub manages WebSocket connections
type WebSocketHub struct {
	Clients      map[int]*Client // Map user ID to client
	Register     chan *Client
	Unregister   chan *Client
	Broadcast    chan models.WebsocketMessage
	mu           sync.RWMutex
	DB           *gorm.DB
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub(db *gorm.DB) *WebSocketHub {
	return &WebSocketHub{
		Clients:    make(map[int]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan models.WebsocketMessage, 256),
		DB:         db,
	}
}

// Run starts the WebSocket hub
func (h *WebSocketHub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client.UserID] = client
			h.mu.Unlock()
			log.Printf("Client registered: %d (total: %d)", client.UserID, len(h.Clients))

			// Send connection successful message
			msg := models.WebsocketMessage{
				Type: "connected",
				Data: gin.H{
					"message": "WebSocket connected successfully",
					"user_id": client.UserID,
					"time":    time.Now(),
				},
			}
			client.SendMessage(msg)

			// Broadcast user_online to all other clients
			h.mu.RLock()
			for _, c := range h.Clients {
				if c.UserID != client.UserID {
					c.SendMessage(models.WebsocketMessage{
						Type: "user_online",
						Data: gin.H{"user_id": client.UserID},
					})
				}
			}
			h.mu.RUnlock()

		case client := <-h.Unregister:
			h.mu.Lock()
			if c, ok := h.Clients[client.UserID]; ok {
				close(c.Send)
				delete(h.Clients, client.UserID)
			}
			h.mu.Unlock()
			log.Printf("Client unregistered: %d (total: %d)", client.UserID, len(h.Clients))

			// Broadcast user_offline to all remaining clients
			h.mu.RLock()
			for _, c := range h.Clients {
				c.SendMessage(models.WebsocketMessage{
					Type: "user_offline",
					Data: gin.H{"user_id": client.UserID},
				})
			}
			h.mu.RUnlock()

		case message := <-h.Broadcast:
			h.mu.RLock()
			for _, client := range h.Clients {
				select {
				case client.Send <- h.marshalMessage(message):
				default:
					close(client.Send)
					delete(h.Clients, client.UserID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastToUser sends a message to a specific user
func (h *WebSocketHub) BroadcastToUser(userID int, message models.WebsocketMessage) {
	h.mu.RLock()
	client, ok := h.Clients[userID]
	h.mu.RUnlock()

	if ok {
		client.SendMessage(message)
	}
}

// BroadcastToConversation sends a message to all participants of a conversation
func (h *WebSocketHub) BroadcastToConversation(conversationID int, message models.WebsocketMessage) {
	// Get all participants of the conversation
	var participants []models.ConversationParticipant
	h.DB.Where("conversation_id = ?", conversationID).
		Find(&participants)

	// Broadcast to each participant
	for _, p := range participants {
		h.BroadcastToUser(p.UserID, message)
	}
}

// HandleWebSocket handles WebSocket connections
func (h *WebSocketHub) HandleWebSocket(c *gin.Context) {
	// Get user from context (set by middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	client := &Client{
		UserID: userID.(int),
		Conn:   conn,
		Send:   make(chan []byte, 256),
		Hub:    h,
	}

	h.Register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

// writePump sends messages to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
		c.Hub.Unregister <- c
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Write error: %v", err)
				return
			}

		case <-ticker.C:
			// Send ping to keep connection alive
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump receives messages from the WebSocket connection
func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		c.handleMessage(message)
	}
}

// handleMessage processes incoming WebSocket messages
func (c *Client) handleMessage(message []byte) {
	var wsMsg models.WebsocketMessage
	if err := json.Unmarshal(message, &wsMsg); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		return
	}

	wsMsg.UserID = c.UserID

	switch wsMsg.Type {
	case "typing":
		// Handle typing indicator
		c.handleTypingIndicator(wsMsg)
	case "message_read":
		// Handle message read receipt
		c.handleMessageRead(wsMsg)
	case "ping":
		// Respond to ping
		c.SendMessage(models.WebsocketMessage{
			Type: "pong",
			Data: gin.H{"timestamp": time.Now().Unix()},
		})
	default:
		// Broadcast to appropriate recipients
		if data, ok := wsMsg.Data.(map[string]interface{}); ok {
			if conversationID, exists := data["conversation_id"]; exists {
				if convID, ok := conversationID.(float64); ok {
					c.Hub.BroadcastToConversation(int(convID), wsMsg)
				}
			}
		}
	}
}

// handleTypingIndicator processes typing indicators
func (c *Client) handleTypingIndicator(wsMsg models.WebsocketMessage) {
	var typingIndicator models.TypingIndicator
	if data, err := json.Marshal(wsMsg.Data); err == nil {
		if err := json.Unmarshal(data, &typingIndicator); err == nil {
			// Get user info for the typing indicator
			var user models.User
			if err := c.Hub.DB.First(&user, c.UserID).Error; err == nil {
				typingIndicator.UserName = user.Name
				typingIndicator.UserID = c.UserID
			}
			
			// Broadcast to conversation except sender
			var participants []models.ConversationParticipant
			c.Hub.DB.Where("conversation_id = ? AND user_id != ?", 
				typingIndicator.ConversationID, c.UserID).
				Find(&participants)

			for _, p := range participants {
				c.Hub.BroadcastToUser(p.UserID, models.WebsocketMessage{
					Type: "typing",
					Data: typingIndicator,
				})
			}
		}
	}
}

// handleMessageRead processes message read receipts
func (c *Client) handleMessageRead(wsMsg models.WebsocketMessage) {
	var readData struct {
		ConversationID int `json:"conversation_id"`
		MessageID      int `json:"message_id"`
	}
	
	if data, err := json.Marshal(wsMsg.Data); err == nil {
		if err := json.Unmarshal(data, &readData); err == nil {
			// Update message as read in database
			c.Hub.DB.Model(&models.Message{}).
				Where("id = ? AND conversation_id = ?", readData.MessageID, readData.ConversationID).
				Updates(map[string]interface{}{
					"is_read": true,
					"read_at": time.Now(),
				})

			// Broadcast read receipt to conversation
			c.Hub.BroadcastToConversation(readData.ConversationID, models.WebsocketMessage{
				Type: "message_read",
				Data: gin.H{
					"message_id": readData.MessageID,
					"user_id":    c.UserID,
					"read_at":    time.Now(),
				},
			})
		}
	}
}

// SendMessage sends a message to the client
func (c *Client) SendMessage(msg models.WebsocketMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	select {
	case c.Send <- data:
	default:
		close(c.Send)
		delete(c.Hub.Clients, c.UserID)
	}
}

// marshalMessage converts a message to JSON
func (h *WebSocketHub) marshalMessage(msg models.WebsocketMessage) []byte {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return []byte("{}")
	}
	return data
}

// GetConnectedUsers returns list of currently connected users
func (h *WebSocketHub) GetConnectedUsers() []int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	var userIDs []int
	for userID := range h.Clients {
		userIDs = append(userIDs, userID)
	}
	return userIDs
}

// IsUserConnected checks if a user is currently connected
func (h *WebSocketHub) IsUserConnected(userID int) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	_, ok := h.Clients[userID]
	return ok
}
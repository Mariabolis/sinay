package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"sinay/backend/internal/config"
	"sinay/backend/internal/models"
)

type AuthHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthHandler(db *gorm.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg}
}

// ── request bodies ────────────────────────────────────────────────────────────

type registerRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
}

type loginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// ── response types ────────────────────────────────────────────────────────────

type UserResponse struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

type TokenResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         UserResponse `json:"user"`
}

// ── handlers ──────────────────────────────────────────────────────────────────

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if h.db.Where("email = ?", req.Email).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		FullName:     nullableStr(req.FullName),
		Phone:        nullableStr(req.Phone),
		Role:         "customer",
	}
	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create user"})
		return
	}

	resp, err := h.issueTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue tokens"})
		return
	}
	h.mergeCarts(c, user.ID)
	c.JSON(http.StatusCreated, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	resp, err := h.issueTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue tokens"})
		return
	}
	h.mergeCarts(c, user.ID)
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	claims, err := h.parseToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}
	if tt, _ := claims["token_type"].(string); tt != "refresh" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not a refresh token"})
		return
	}

	userID, _ := claims["user_id"].(string)
	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	resp, err := h.issueTokens(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue tokens"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Me(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	c.JSON(http.StatusOK, UserResponse{
		ID:       user.ID.String(),
		Email:    user.Email,
		FullName: derefStr(user.FullName),
		Role:     user.Role,
	})
}

// PUT /api/auth/me
func (h *AuthHandler) UpdateMe(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	var req struct {
		FullName string `json:"full_name"`
		Phone    string `json:"phone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updates := map[string]any{}
	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if len(updates) > 0 {
		h.db.Model(&user).Updates(updates)
	}
	h.db.First(&user, "id = ?", user.ID)
	c.JSON(http.StatusOK, UserResponse{
		ID:       user.ID.String(),
		Email:    user.Email,
		FullName: derefStr(user.FullName),
		Role:     user.Role,
	})
}

// ── token helpers ─────────────────────────────────────────────────────────────

func (h *AuthHandler) issueTokens(user models.User) (TokenResponse, error) {
	access, err := h.signToken(jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})
	if err != nil {
		return TokenResponse{}, err
	}

	refresh, err := h.signToken(jwt.MapClaims{
		"user_id":    user.ID.String(),
		"token_type": "refresh",
		"exp":        time.Now().Add(30 * 24 * time.Hour).Unix(),
	})
	if err != nil {
		return TokenResponse{}, err
	}

	return TokenResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		User: UserResponse{
			ID:       user.ID.String(),
			Email:    user.Email,
			FullName: derefStr(user.FullName),
			Role:     user.Role,
		},
	}, nil
}

func (h *AuthHandler) signToken(claims jwt.MapClaims) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.cfg.JWTSecret))
}

func (h *AuthHandler) parseToken(raw string) (jwt.MapClaims, error) {
	t, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(h.cfg.JWTSecret), nil
	})
	if err != nil || !t.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	claims, ok := t.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	return claims, nil
}

// ── cart merge ────────────────────────────────────────────────────────────────

// mergeCarts moves items from the session cart (sinay_sid cookie) into the
// user's persistent cart after login or registration. Silently no-ops when
// there is no session cart to merge.
func (h *AuthHandler) mergeCarts(c *gin.Context, userID uuid.UUID) {
	sessionID, err := c.Cookie(sessionCookieName)
	if err != nil || sessionID == "" {
		return
	}

	var sessionCart models.Cart
	if h.db.Where("session_id = ?", sessionID).First(&sessionCart).Error != nil {
		return
	}

	var userCart models.Cart
	if h.db.Where("user_id = ?", userID).First(&userCart).Error != nil {
		// No user cart yet — promote the session cart in place.
		h.db.Model(&sessionCart).Updates(map[string]any{
			"user_id":    userID,
			"session_id": nil,
		})
		c.SetCookie(sessionCookieName, "", -1, "/", "", false, true)
		return
	}

	// User already has a cart — move session items over and drop the session cart.
	if sessionCart.ID != userCart.ID {
		h.db.Model(&models.CartItem{}).
			Where("cart_id = ?", sessionCart.ID).
			Update("cart_id", userCart.ID)
		h.db.Delete(&sessionCart)
	}
	c.SetCookie(sessionCookieName, "", -1, "/", "", false, true)
}

// ── utilities ─────────────────────────────────────────────────────────────────

func nullableStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
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
	"sinay/backend/internal/services/email"
)

type AuthHandler struct {
	db    *gorm.DB
	cfg   *config.Config
	email *email.Service
}

func NewAuthHandler(db *gorm.DB, cfg *config.Config, emailSvc *email.Service) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg, email: emailSvc}
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
// Changing email requires current_password to confirm it's really the
// account owner — name/phone can change freely without it.
func (h *AuthHandler) UpdateMe(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	var req struct {
		FullName        string `json:"full_name"`
		Phone           string `json:"phone"`
		Email           string `json:"email"`
		CurrentPassword string `json:"current_password"`
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

	if req.Email != "" && req.Email != user.Email {
		if req.CurrentPassword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "current_password is required to change email"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
			return
		}
		var existing models.User
		if h.db.Where("email = ? AND id != ?", req.Email, user.ID).First(&existing).Error == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
			return
		}
		updates["email"] = req.Email
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

// PUT /api/auth/password
func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password"     binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
		return
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	h.db.Model(&user).Update("password_hash", string(newHash))
	c.JSON(http.StatusOK, gin.H{"message": "Password updated."})
}

// POST /api/auth/forgot-password
// Always responds with a generic success message, whether or not the email
// is registered — this prevents leaking which emails have accounts.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	const genericMsg = "If that email has an account, we've sent a password reset link."

	var user models.User
	if h.db.Where("email = ?", req.Email).First(&user).Error != nil {
		c.JSON(http.StatusOK, gin.H{"message": genericMsg})
		return
	}

	rawToken := make([]byte, 32)
	if _, err := rand.Read(rawToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	rawHex := hex.EncodeToString(rawToken)
	hash := sha256.Sum256([]byte(rawHex))

	reset := models.PasswordReset{
		UserID:    user.ID,
		TokenHash: hex.EncodeToString(hash[:]),
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	if err := h.db.Create(&reset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", h.cfg.FrontendURL, rawHex)
	html := fmt.Sprintf(`
		<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#4A3F38">
			<h2 style="font-weight:600">Reset your password</h2>
			<p>Click the link below to set a new password. This link expires in 1 hour.</p>
			<p><a href="%s" style="color:#8B7568">%s</a></p>
			<p style="color:#8B7568;font-size:13px">Didn't request this? You can ignore this email.</p>
		</div>`, resetLink, resetLink)
	h.email.Send(user.Email, "Reset your SINAY password", html)

	c.JSON(http.StatusOK, gin.H{"message": genericMsg})
}

// POST /api/auth/reset-password
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Token    string `json:"token"    binding:"required"`
		Password string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash := sha256.Sum256([]byte(req.Token))
	tokenHash := hex.EncodeToString(hash[:])

	var reset models.PasswordReset
	if h.db.Where("token_hash = ? AND used = false AND expires_at > ?", tokenHash, time.Now()).
		First(&reset).Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired reset link"})
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	h.db.Model(&models.User{}).Where("id = ?", reset.UserID).Update("password_hash", string(newHash))
	h.db.Model(&reset).Update("used", true)

	c.JSON(http.StatusOK, gin.H{"message": "Password updated — you can log in now."})
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

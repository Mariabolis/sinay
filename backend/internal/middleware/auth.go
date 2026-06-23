package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

// AuthRequired validates the Bearer token, loads the user from DB, and sets
// "user", "user_id", and "role" in the gin context.
func AuthRequired(db *gorm.DB, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			return
		}

		t, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !t.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		claims, ok := t.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		// Reject refresh tokens used as access tokens
		if tt, _ := claims["token_type"].(string); tt == "refresh" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "use access token, not refresh token"})
			return
		}

		userID, _ := claims["user_id"].(string)
		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			return
		}

		c.Set("user", user)
		c.Set("user_id", userID)
		c.Set("role", user.Role)
		c.Next()
	}
}

// OptionalAuth parses a Bearer token if present and sets "user_id" in the gin
// context. Unlike AuthRequired it never aborts — absent or invalid tokens are
// silently ignored so the handler can serve anonymous requests.
func OptionalAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.Next()
			return
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}
		t, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !t.Valid {
			c.Next()
			return
		}
		claims, ok := t.Claims.(jwt.MapClaims)
		if !ok {
			c.Next()
			return
		}
		if tt, _ := claims["token_type"].(string); tt == "refresh" {
			c.Next()
			return
		}
		if userID, _ := claims["user_id"].(string); userID != "" {
			c.Set("user_id", userID)
		}
		c.Next()
	}
}

// AdminRequired is AuthRequired + role check. Apply after AuthRequired or
// use standalone on admin route groups.
func AdminRequired(db *gorm.DB, jwtSecret string) gin.HandlerFunc {
	authFn := AuthRequired(db, jwtSecret)
	return func(c *gin.Context) {
		authFn(c)
		if c.IsAborted() {
			return
		}
		if role, _ := c.Get("role"); role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		}
	}
}

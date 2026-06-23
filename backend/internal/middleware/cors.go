package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS returns a middleware that sets Access-Control headers for origins listed
// in allowedOriginsCSV (comma-separated). Preflight OPTIONS requests are
// short-circuited with 204.
func CORS(allowedOriginsCSV string) gin.HandlerFunc {
	allowed := make(map[string]bool)
	for _, o := range strings.Split(allowedOriginsCSV, ",") {
		if o = strings.TrimSpace(o); o != "" {
			allowed[o] = true
		}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

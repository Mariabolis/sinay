package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminCustomerHandler struct {
	db *gorm.DB
}

func NewAdminCustomerHandler(db *gorm.DB) *AdminCustomerHandler {
	return &AdminCustomerHandler{db: db}
}

// GET /api/admin/customers
func (h *AdminCustomerHandler) List(c *gin.Context) {
	type customerRow struct {
		ID         string  `json:"id"`
		Email      string  `json:"email"`
		FullName   *string `json:"full_name"`
		Phone      *string `json:"phone"`
		OrderCount int     `json:"order_count"`
		CreatedAt  string  `json:"created_at"`
	}

	var rows []customerRow
	h.db.Raw(`
		SELECT u.id,
		       u.email,
		       u.full_name,
		       u.phone,
		       u.created_at,
		       COUNT(o.id) AS order_count
		FROM users u
		LEFT JOIN orders o ON o.user_id = u.id
		WHERE u.role = 'customer'
		GROUP BY u.id
		ORDER BY u.created_at DESC
	`).Scan(&rows)

	if rows == nil {
		rows = []customerRow{}
	}
	c.JSON(http.StatusOK, rows)
}

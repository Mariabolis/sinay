package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminCustomerHandler struct {
	db *gorm.DB
}

func NewAdminCustomerHandler(db *gorm.DB) *AdminCustomerHandler {
	return &AdminCustomerHandler{db: db}
}

// ── shared response types ─────────────────────────────────────────────────────

type customerRow struct {
	ID         string  `json:"id"`
	Email      string  `json:"email"`
	FullName   *string `json:"full_name"`
	Phone      *string `json:"phone"`
	OrderCount int     `json:"order_count"`
	TotalSpend float64 `json:"total_spend"`
	JoinDate   string  `json:"created_at"`
}

// intermediate scan target — keeps time.Time so we can format it ourselves
type customerScan struct {
	ID         string
	Email      string
	FullName   *string
	Phone      *string
	OrderCount int
	TotalSpend float64
	CreatedAt  time.Time
}

func (s customerScan) toRow() customerRow {
	return customerRow{
		ID:         s.ID,
		Email:      s.Email,
		FullName:   s.FullName,
		Phone:      s.Phone,
		OrderCount: s.OrderCount,
		TotalSpend: s.TotalSpend,
		JoinDate:   s.CreatedAt.Format(time.RFC3339),
	}
}

// ── GET /api/admin/customers ──────────────────────────────────────────────────

func (h *AdminCustomerHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	search  := strings.TrimSpace(c.Query("search"))
	sortKey := c.DefaultQuery("sort", "join_date")
	sortDir := c.DefaultQuery("sort_dir", "desc")
	if sortDir != "asc" {
		sortDir = "desc"
	}

	// Whitelist sort column
	orderSQL := "u.created_at " + sortDir
	switch sortKey {
	case "total_spend":
		orderSQL = "total_spend " + sortDir
	case "order_count":
		orderSQL = "order_count " + sortDir
	}

	// Build optional WHERE extension (base always filters role=customer)
	whereExt := ""
	args := []any{}
	if search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		whereExt = " AND (LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.phone::text) LIKE ?)"
		args = append(args, pattern, pattern, pattern)
	}

	baseWhere := "WHERE u.role = 'customer'" + whereExt

	// Count — no join needed since search is on user fields only
	var total int64
	h.db.Raw("SELECT COUNT(*) FROM users u "+baseWhere, args...).Scan(&total)

	// Data — join orders to aggregate per-customer stats
	dataSQL := `
		SELECT
			u.id,
			u.email,
			u.full_name,
			u.phone,
			u.created_at,
			COUNT(o.id)                                                                      AS order_count,
			COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0)     AS total_spend
		FROM users u
		LEFT JOIN orders o ON o.user_id = u.id
		` + baseWhere + `
		GROUP BY u.id
		ORDER BY ` + orderSQL + `
		LIMIT ? OFFSET ?`

	dataArgs := append(args, perPage, (page-1)*perPage)
	var scanned []customerScan
	h.db.Raw(dataSQL, dataArgs...).Scan(&scanned)

	rows := make([]customerRow, len(scanned))
	for i, s := range scanned {
		rows[i] = s.toRow()
	}
	if rows == nil {
		rows = []customerRow{}
	}
	c.JSON(http.StatusOK, gin.H{
		"customers": rows,
		"total":     total,
		"page":      page,
		"per_page":  perPage,
	})
}

// ── GET /api/admin/customers/:id ──────────────────────────────────────────────

func (h *AdminCustomerHandler) Get(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := h.db.Preload("Addresses").
		First(&user, "id = ? AND role = 'customer'", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "customer not found"})
		return
	}

	// Load full order history for this customer
	var orders []models.Order
	preloadOrder(h.db).
		Where("user_id = ?", id).
		Order("created_at DESC").
		Find(&orders)

	// Compute total spend (exclude cancelled)
	var totalSpend float64
	for _, o := range orders {
		if o.Status != "cancelled" {
			totalSpend += o.Total
		}
	}

	// Addresses
	type addrResp struct {
		ID          string  `json:"id"`
		Label       *string `json:"label"`
		FullName    *string `json:"full_name"`
		Phone       *string `json:"phone"`
		Governorate *string `json:"governorate"`
		City        *string `json:"city"`
		Street      *string `json:"street"`
		Building    *string `json:"building"`
		Notes       *string `json:"notes"`
		IsDefault   bool    `json:"is_default"`
	}
	addrs := make([]addrResp, len(user.Addresses))
	for i, a := range user.Addresses {
		addrs[i] = addrResp{
			ID:          a.ID.String(),
			Label:       a.Label,
			FullName:    a.FullName,
			Phone:       a.Phone,
			Governorate: a.Governorate,
			City:        a.City,
			Street:      a.Street,
			Building:    a.Building,
			Notes:       a.Notes,
			IsDefault:   a.IsDefault,
		}
	}

	// Orders — reuse the same shape as admin orders list
	orderResps := make([]adminOrderResp, len(orders))
	for i, o := range orders {
		orderResps[i] = toAdminOrder(o)
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID.String(),
		"email":       user.Email,
		"full_name":   user.FullName,
		"phone":       user.Phone,
		"created_at":  user.CreatedAt.Format(time.RFC3339),
		"total_spend": totalSpend,
		"order_count": len(orders),
		"addresses":   addrs,
		"orders":      orderResps,
	})
}

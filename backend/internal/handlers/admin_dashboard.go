package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminDashboardHandler struct {
	db *gorm.DB
}

func NewAdminDashboardHandler(db *gorm.DB) *AdminDashboardHandler {
	return &AdminDashboardHandler{db: db}
}

// GET /api/admin/dashboard/summary
func (h *AdminDashboardHandler) Summary(c *gin.Context) {
	var totalRevenue float64
	h.db.Raw(`
		SELECT COALESCE(SUM(total), 0) FROM orders
		WHERE status IN ('paid','processing','shipped','delivered')
	`).Scan(&totalRevenue)

	var ordersCount int64
	h.db.Raw(`SELECT COUNT(*) FROM orders WHERE status != 'cancelled'`).Scan(&ordersCount)

	today := time.Now().Truncate(24 * time.Hour)
	var ordersToday int64
	h.db.Raw(`SELECT COUNT(*) FROM orders WHERE status != 'cancelled' AND created_at >= ?`, today).Scan(&ordersToday)

	type topVariant struct {
		VariantID   string `json:"variant_id"`
		ColorName   string `json:"color_name"`
		ColorHex    string `json:"color_hex"`
		Size        string `json:"size"`
		ProductName string `json:"product_name"`
		TotalSold   int    `json:"total_sold"`
	}
	var topVariants []topVariant
	h.db.Raw(`
		SELECT oi.variant_id::text, pv.color_name, pv.color_hex, pv.size,
		       p.name AS product_name, SUM(oi.quantity)::int AS total_sold
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		JOIN product_variants pv ON pv.id = oi.variant_id
		JOIN products p ON p.id = pv.product_id
		WHERE o.status IN ('paid','processing','shipped','delivered')
		GROUP BY oi.variant_id, pv.color_name, pv.color_hex, pv.size, p.name
		ORDER BY total_sold DESC
		LIMIT 5
	`).Scan(&topVariants)
	if topVariants == nil {
		topVariants = []topVariant{}
	}

	type lowStockItem struct {
		VariantID   string `json:"variant_id"`
		ColorName   string `json:"color_name"`
		ColorHex    string `json:"color_hex"`
		Size        string `json:"size"`
		ProductName string `json:"product_name"`
		Stock       int    `json:"stock"`
	}
	var lowStock []lowStockItem
	h.db.Raw(`
		SELECT pv.id::text AS variant_id, pv.color_name, pv.color_hex, pv.size,
		       p.name AS product_name, pv.stock_quantity AS stock
		FROM product_variants pv
		JOIN products p ON p.id = pv.product_id
		WHERE pv.stock_quantity <= 5 AND p.is_active = true
		ORDER BY pv.stock_quantity ASC, p.name
		LIMIT 20
	`).Scan(&lowStock)
	if lowStock == nil {
		lowStock = []lowStockItem{}
	}

	c.JSON(http.StatusOK, gin.H{
		"total_revenue":        totalRevenue,
		"orders_count":         ordersCount,
		"orders_today":         ordersToday,
		"top_selling_variants": topVariants,
		"low_stock_variants":   lowStock,
	})
}

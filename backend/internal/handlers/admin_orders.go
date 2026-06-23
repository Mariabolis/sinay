package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminOrderHandler struct {
	db *gorm.DB
}

func NewAdminOrderHandler(db *gorm.DB) *AdminOrderHandler {
	return &AdminOrderHandler{db: db}
}

type adminOrderResp struct {
	ID            string           `json:"id"`
	Status        string           `json:"status"`
	PaymentMethod string           `json:"payment_method"`
	Subtotal      float64          `json:"subtotal"`
	Discount      float64          `json:"discount"`
	Total         float64          `json:"total"`
	CouponCode    *string          `json:"coupon_code"`
	PaymentStatus string           `json:"payment_status"`
	CreatedAt     string           `json:"created_at"`
	CustomerEmail *string          `json:"customer_email"`
	Items         []orderItemResp  `json:"items"`
}

// GET /api/admin/orders
func (h *AdminOrderHandler) List(c *gin.Context) {
	var orders []models.Order
	h.db.
		Preload("Items.Variant.Product").
		Preload("Items.Variant").
		Preload("Items").
		Preload("Payment").
		Preload("User").
		Order("created_at DESC").
		Find(&orders)

	resp := make([]adminOrderResp, 0, len(orders))
	for _, o := range orders {
		base := toOrderResp(o)
		var email *string
		if o.User != nil {
			email = &o.User.Email
		}
		resp = append(resp, adminOrderResp{
			ID:            base.ID,
			Status:        base.Status,
			PaymentMethod: base.PaymentMethod,
			Subtotal:      base.Subtotal,
			Discount:      base.Discount,
			Total:         base.Total,
			CouponCode:    base.CouponCode,
			PaymentStatus: base.PaymentStatus,
			CreatedAt:     base.CreatedAt,
			CustomerEmail: email,
			Items:         base.Items,
		})
	}
	c.JSON(http.StatusOK, resp)
}

// PUT /api/admin/orders/:id/status
func (h *AdminOrderHandler) UpdateStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	valid := map[string]bool{
		"pending": true, "paid": true, "processing": true,
		"shipped": true, "delivered": true, "cancelled": true,
	}
	if !valid[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status value"})
		return
	}

	result := h.db.Model(&models.Order{}).
		Where("id = ?", c.Param("id")).
		Update("status", req.Status)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": req.Status})
}

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

type adminAddressResp struct {
	FullName    *string `json:"full_name"`
	Phone       *string `json:"phone"`
	Governorate *string `json:"governorate"`
	City        *string `json:"city"`
	Street      *string `json:"street"`
	Building    *string `json:"building"`
	Notes       *string `json:"notes"`
}

type adminOrderResp struct {
	ID            string           `json:"id"`
	Status        string           `json:"status"`
	PaymentMethod string           `json:"payment_method"`
	Subtotal      float64          `json:"subtotal"`
	Discount      float64          `json:"discount"`
	ShippingFee   float64          `json:"shipping_fee"`
	Total         float64          `json:"total"`
	CouponCode    *string          `json:"coupon_code"`
	PaymentStatus string           `json:"payment_status"`
	CreatedAt     string           `json:"created_at"`
	CustomerEmail *string          `json:"customer_email"`
	CustomerName  *string          `json:"customer_name"`
	CustomerPhone *string          `json:"customer_phone"`
	Address       *adminAddressResp `json:"address"`
	Items         []orderItemResp  `json:"items"`
}

func toAdminOrder(o models.Order) adminOrderResp {
	base := toOrderResp(o)

	var email, name, phone *string
	if o.User != nil {
		email = &o.User.Email
		name  = o.User.FullName
		phone = o.User.Phone
	}

	var addr *adminAddressResp
	if o.Address != nil {
		a := o.Address
		addr = &adminAddressResp{
			FullName:    a.FullName,
			Phone:       a.Phone,
			Governorate: a.Governorate,
			City:        a.City,
			Street:      a.Street,
			Building:    a.Building,
			Notes:       a.Notes,
		}
	}

	return adminOrderResp{
		ID:            base.ID,
		Status:        base.Status,
		PaymentMethod: base.PaymentMethod,
		Subtotal:      base.Subtotal,
		Discount:      base.Discount,
		ShippingFee:   base.ShippingFee,
		Total:         base.Total,
		CouponCode:    base.CouponCode,
		PaymentStatus: base.PaymentStatus,
		CreatedAt:     base.CreatedAt,
		CustomerEmail: email,
		CustomerName:  name,
		CustomerPhone: phone,
		Address:       addr,
		Items:         base.Items,
	}
}

func preloadOrder(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Items.Variant.Product").
		Preload("Items.Variant").
		Preload("Items").
		Preload("Payment").
		Preload("User").
		Preload("Address")
}

// GET /api/admin/orders
func (h *AdminOrderHandler) List(c *gin.Context) {
	var orders []models.Order
	preloadOrder(h.db).Order("created_at DESC").Find(&orders)

	resp := make([]adminOrderResp, 0, len(orders))
	for _, o := range orders {
		resp = append(resp, toAdminOrder(o))
	}
	c.JSON(http.StatusOK, resp)
}

// GET /api/admin/orders/:id
func (h *AdminOrderHandler) Get(c *gin.Context) {
	var order models.Order
	if preloadOrder(h.db).First(&order, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	c.JSON(http.StatusOK, toAdminOrder(order))
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

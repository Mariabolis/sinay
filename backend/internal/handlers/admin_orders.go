package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

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

// ── response types ─────────────────────────────────────────────────────────────

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
	ID            string            `json:"id"`
	Status        string            `json:"status"`
	PaymentMethod string            `json:"payment_method"`
	Subtotal      float64           `json:"subtotal"`
	Discount      float64           `json:"discount"`
	ShippingFee   float64           `json:"shipping_fee"`
	Total         float64           `json:"total"`
	CouponCode    *string           `json:"coupon_code"`
	PaymentStatus string            `json:"payment_status"`
	CreatedAt     string            `json:"created_at"`
	CustomerEmail *string           `json:"customer_email"`
	CustomerName  *string           `json:"customer_name"`
	CustomerPhone *string           `json:"customer_phone"`
	Address       *adminAddressResp `json:"address"`
	Items         []orderItemResp   `json:"items"`
}

type adminOrdersListResp struct {
	Orders  []adminOrderResp `json:"orders"`
	Total   int64            `json:"total"`
	Page    int              `json:"page"`
	PerPage int              `json:"per_page"`
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

// ── GET /api/admin/orders ─────────────────────────────────────────────────────

func (h *AdminOrderHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	status        := c.Query("status")
	paymentMethod := c.Query("payment_method")
	dateFrom      := c.Query("date_from")
	dateTo        := c.Query("date_to")
	search        := strings.TrimSpace(c.Query("search"))
	sortDir       := c.DefaultQuery("sort", "desc")
	if sortDir != "asc" {
		sortDir = "desc"
	}

	q := h.db.Model(&models.Order{})

	if status != "" {
		q = q.Where("status = ?", status)
	}
	if paymentMethod != "" {
		q = q.Where("payment_method = ?", paymentMethod)
	}
	if dateFrom != "" {
		q = q.Where("created_at >= ?", dateFrom)
	}
	if dateTo != "" {
		// include the entire dateTo day
		q = q.Where("created_at <= ?", dateTo+" 23:59:59")
	}
	if search != "" {
		// match order-id prefix or customer phone
		q = q.Where(
			"CAST(id AS TEXT) ILIKE ? OR EXISTS (SELECT 1 FROM users u WHERE u.id = orders.user_id AND u.phone ILIKE ?)",
			search+"%",
			"%"+search+"%",
		)
	}

	var total int64
	q.Count(&total)

	var orders []models.Order
	preloadOrder(q).
		Order("created_at " + sortDir).
		Offset((page - 1) * perPage).
		Limit(perPage).
		Find(&orders)

	resp := make([]adminOrderResp, len(orders))
	for i, o := range orders {
		resp[i] = toAdminOrder(o)
	}
	c.JSON(http.StatusOK, adminOrdersListResp{
		Orders:  resp,
		Total:   total,
		Page:    page,
		PerPage: perPage,
	})
}

// ── GET /api/admin/orders/:id ─────────────────────────────────────────────────

func (h *AdminOrderHandler) Get(c *gin.Context) {
	var order models.Order
	if preloadOrder(h.db).First(&order, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	c.JSON(http.StatusOK, toAdminOrder(order))
}

// ── PUT /api/admin/orders/:id/status ─────────────────────────────────────────

// allowedTransitions defines which status changes are permitted.
// Delivered and Cancelled are terminal states.
var allowedTransitions = map[string][]string{
	"pending":    {"paid", "processing", "cancelled"},
	"paid":       {"processing", "cancelled"},
	"processing": {"shipped", "cancelled"},
	"shipped":    {"delivered", "cancelled"},
	"delivered":  {},
	"cancelled":  {},
}

func (h *AdminOrderHandler) UpdateStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var order models.Order
	if h.db.First(&order, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	allowed, knownStatus := allowedTransitions[order.Status]
	if !knownStatus {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown current order status"})
		return
	}

	canTransition := false
	for _, s := range allowed {
		if s == req.Status {
			canTransition = true
			break
		}
	}
	if !canTransition {
		if len(allowed) == 0 {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": fmt.Sprintf("order is %s — no further status changes allowed", order.Status),
			})
		} else {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": fmt.Sprintf("cannot change status from '%s' to '%s'", order.Status, req.Status),
			})
		}
		return
	}

	h.db.Model(&order).Update("status", req.Status)
	c.JSON(http.StatusOK, gin.H{"status": req.Status, "previous": order.Status})
}

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

type AdminCouponHandler struct {
	db *gorm.DB
}

func NewAdminCouponHandler(db *gorm.DB) *AdminCouponHandler {
	return &AdminCouponHandler{db: db}
}

func couponStatus(cp models.Coupon, now time.Time) string {
	if cp.ExpiresAt != nil && cp.ExpiresAt.Before(now) {
		return "Expired"
	}
	if cp.UsageLimit != nil && cp.TimesUsed >= *cp.UsageLimit {
		return "Used Up"
	}
	if !cp.Active {
		return "Disabled"
	}
	return "Active"
}

func toCouponJSON(cp models.Coupon) gin.H {
	now := time.Now()
	var exp *string
	if cp.ExpiresAt != nil {
		s := cp.ExpiresAt.Format(time.RFC3339)
		exp = &s
	}
	return gin.H{
		"id":              cp.ID.String(),
		"code":            cp.Code,
		"type":            cp.Type,
		"value":           cp.Value,
		"active":          cp.Active,
		"expires_at":      exp,
		"min_order_value": cp.MinOrderValue,
		"usage_limit":     cp.UsageLimit,
		"times_used":      cp.TimesUsed,
		"created_at":      cp.CreatedAt.Format(time.RFC3339),
		"status":          couponStatus(cp, now),
	}
}

// GET /api/admin/coupons
func (h *AdminCouponHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "50"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 200 {
		perPage = 50
	}

	var total int64
	h.db.Model(&models.Coupon{}).Count(&total)

	var coupons []models.Coupon
	h.db.Order("created_at DESC").
		Offset((page - 1) * perPage).
		Limit(perPage).
		Find(&coupons)

	resp := make([]gin.H, 0, len(coupons))
	for _, cp := range coupons {
		resp = append(resp, toCouponJSON(cp))
	}
	c.JSON(http.StatusOK, gin.H{
		"coupons":  resp,
		"total":    total,
		"page":     page,
		"per_page": perPage,
	})
}

// POST /api/admin/coupons
func (h *AdminCouponHandler) Create(c *gin.Context) {
	var req struct {
		Code          string     `json:"code"            binding:"required"`
		Type          string     `json:"type"            binding:"required"`
		Value         float64    `json:"value"           binding:"required"`
		ExpiresAt     *time.Time `json:"expires_at"`
		MinOrderValue *float64   `json:"min_order_value"`
		UsageLimit    *int       `json:"usage_limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Type != "percent" && req.Type != "fixed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'percent' or 'fixed'"})
		return
	}
	if req.Type == "percent" && (req.Value <= 0 || req.Value > 100) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "percentage value must be between 1 and 100"})
		return
	}
	if req.Type == "fixed" && req.Value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "flat value must be greater than 0"})
		return
	}
	if req.UsageLimit != nil && *req.UsageLimit < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "usage_limit must be at least 1"})
		return
	}

	coupon := models.Coupon{
		Code:          strings.ToUpper(strings.TrimSpace(req.Code)),
		Type:          req.Type,
		Value:         req.Value,
		Active:        true,
		ExpiresAt:     req.ExpiresAt,
		MinOrderValue: req.MinOrderValue,
		UsageLimit:    req.UsageLimit,
	}
	if err := h.db.Create(&coupon).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "coupon code already exists"})
		return
	}
	c.JSON(http.StatusCreated, toCouponJSON(coupon))
}

// PUT /api/admin/coupons/:id
func (h *AdminCouponHandler) Update(c *gin.Context) {
	var coupon models.Coupon
	if h.db.First(&coupon, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "coupon not found"})
		return
	}

	var req struct {
		Code          string     `json:"code"            binding:"required"`
		Type          string     `json:"type"            binding:"required"`
		Value         float64    `json:"value"           binding:"required"`
		Active        bool       `json:"active"`
		ExpiresAt     *time.Time `json:"expires_at"`
		MinOrderValue *float64   `json:"min_order_value"`
		UsageLimit    *int       `json:"usage_limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))

	if req.Type != "percent" && req.Type != "fixed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'percent' or 'fixed'"})
		return
	}
	if req.Type == "percent" && (req.Value <= 0 || req.Value > 100) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "percentage value must be between 1 and 100"})
		return
	}
	if req.Type == "fixed" && req.Value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "flat value must be greater than 0"})
		return
	}
	if req.UsageLimit != nil && *req.UsageLimit < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "usage_limit must be at least 1"})
		return
	}

	if code != coupon.Code {
		var dup models.Coupon
		if h.db.Where("code = ? AND id != ?", code, coupon.ID).First(&dup).Error == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "coupon code already exists"})
			return
		}
	}

	if err := h.db.Model(&coupon).
		Select("code", "type", "value", "active", "expires_at", "min_order_value", "usage_limit").
		Updates(map[string]any{
			"code":            code,
			"type":            req.Type,
			"value":           req.Value,
			"active":          req.Active,
			"expires_at":      req.ExpiresAt,
			"min_order_value": req.MinOrderValue,
			"usage_limit":     req.UsageLimit,
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}

	h.db.First(&coupon, "id = ?", coupon.ID)
	c.JSON(http.StatusOK, toCouponJSON(coupon))
}

// PATCH /api/admin/coupons/:id/toggle
func (h *AdminCouponHandler) Toggle(c *gin.Context) {
	var coupon models.Coupon
	if h.db.First(&coupon, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "coupon not found"})
		return
	}
	h.db.Model(&coupon).Update("active", !coupon.Active)
	coupon.Active = !coupon.Active
	c.JSON(http.StatusOK, toCouponJSON(coupon))
}

// DELETE /api/admin/coupons/:id
func (h *AdminCouponHandler) Delete(c *gin.Context) {
	var coupon models.Coupon
	if h.db.First(&coupon, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "coupon not found"})
		return
	}
	h.db.Delete(&coupon)
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

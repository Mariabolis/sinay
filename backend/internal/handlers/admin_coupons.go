package handlers

import (
	"net/http"
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

// GET /api/admin/coupons
func (h *AdminCouponHandler) List(c *gin.Context) {
	var coupons []models.Coupon
	h.db.Order("code ASC").Find(&coupons)
	resp := make([]gin.H, 0, len(coupons))
	for _, cp := range coupons {
		var exp *string
		if cp.ExpiresAt != nil {
			s := cp.ExpiresAt.Format(time.RFC3339)
			exp = &s
		}
		resp = append(resp, gin.H{
			"id":         cp.ID.String(),
			"code":       cp.Code,
			"type":       cp.Type,
			"value":      cp.Value,
			"active":     cp.Active,
			"expires_at": exp,
		})
	}
	c.JSON(http.StatusOK, resp)
}

// POST /api/admin/coupons
func (h *AdminCouponHandler) Create(c *gin.Context) {
	var req struct {
		Code      string     `json:"code"       binding:"required"`
		Type      string     `json:"type"       binding:"required"`
		Value     float64    `json:"value"      binding:"required"`
		ExpiresAt *time.Time `json:"expires_at"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Type != "percent" && req.Type != "fixed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'percent' or 'fixed'"})
		return
	}

	coupon := models.Coupon{
		Code:      strings.ToUpper(strings.TrimSpace(req.Code)),
		Type:      req.Type,
		Value:     req.Value,
		Active:    true,
		ExpiresAt: req.ExpiresAt,
	}
	if err := h.db.Create(&coupon).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "coupon code already exists"})
		return
	}

	var exp *string
	if coupon.ExpiresAt != nil {
		s := coupon.ExpiresAt.Format(time.RFC3339)
		exp = &s
	}
	c.JSON(http.StatusCreated, gin.H{
		"id":         coupon.ID.String(),
		"code":       coupon.Code,
		"type":       coupon.Type,
		"value":      coupon.Value,
		"active":     coupon.Active,
		"expires_at": exp,
	})
}

// PATCH /api/admin/coupons/:id/toggle
func (h *AdminCouponHandler) Toggle(c *gin.Context) {
	var coupon models.Coupon
	if h.db.First(&coupon, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "coupon not found"})
		return
	}
	h.db.Model(&coupon).Update("active", !coupon.Active)
	c.JSON(http.StatusOK, gin.H{"active": !coupon.Active})
}

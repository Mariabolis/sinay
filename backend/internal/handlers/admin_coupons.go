package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminCouponHandler struct {
	db *gorm.DB
}

func NewAdminCouponHandler(db *gorm.DB) *AdminCouponHandler {
	return &AdminCouponHandler{db: db}
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

func stringsToJSON(ids []string) datatypes.JSON {
	if len(ids) == 0 {
		return datatypes.JSON("null")
	}
	b, _ := json.Marshal(ids)
	return datatypes.JSON(b)
}

func jsonToStrings(j datatypes.JSON) []string {
	if len(j) == 0 || string(j) == "null" {
		return []string{}
	}
	var ids []string
	json.Unmarshal(j, &ids) //nolint:errcheck
	return ids
}

func toCouponJSON(cp models.Coupon) gin.H {
	now := time.Now()
	var exp *string
	if cp.ExpiresAt != nil {
		s := cp.ExpiresAt.Format(time.RFC3339)
		exp = &s
	}
	cat := cp.DiscountCategory
	if cat == "" {
		cat = "order"
	}
	return gin.H{
		"id":                   cp.ID.String(),
		"code":                 cp.Code,
		"discount_category":    cat,
		"type":                 cp.Type,
		"value":                cp.Value,
		"active":               cp.Active,
		"expires_at":           exp,
		"min_order_value":      cp.MinOrderValue,
		"usage_limit":          cp.UsageLimit,
		"times_used":           cp.TimesUsed,
		"created_at":           cp.CreatedAt.Format(time.RFC3339),
		"status":               couponStatus(cp, now),
		"applies_to_products":  jsonToStrings(cp.AppliesToProducts),
		"buy_quantity":         cp.BuyQuantity,
		"buy_product_ids":      jsonToStrings(cp.BuyProductIds),
		"get_quantity":         cp.GetQuantity,
		"get_product_ids":      jsonToStrings(cp.GetProductIds),
		"get_discount_percent": cp.GetDiscountPercent,
	}
}

// shared request body (all fields optional except code)
type couponReq struct {
	Code               string     `json:"code"`
	DiscountCategory   string     `json:"discount_category"`
	Type               string     `json:"type"`
	Value              *float64   `json:"value"`
	Active             *bool      `json:"active"`
	ExpiresAt          *time.Time `json:"expires_at"`
	MinOrderValue      *float64   `json:"min_order_value"`
	UsageLimit         *int       `json:"usage_limit"`
	AppliesToProducts  []string   `json:"applies_to_products"`
	BuyQuantity        *int       `json:"buy_quantity"`
	BuyProductIds      []string   `json:"buy_product_ids"`
	GetQuantity        *int       `json:"get_quantity"`
	GetProductIds      []string   `json:"get_product_ids"`
	GetDiscountPercent *float64   `json:"get_discount_percent"`
}

func validateCouponReq(req *couponReq) (string, bool) {
	if req.DiscountCategory == "" {
		req.DiscountCategory = "order"
	}
	switch req.DiscountCategory {
	case "order", "product":
		if req.Type != "percent" && req.Type != "fixed" {
			return "type must be 'percent' or 'fixed'", false
		}
		if req.Value == nil || *req.Value <= 0 {
			return "value must be greater than 0", false
		}
		if req.Type == "percent" && *req.Value > 100 {
			return "percentage cannot exceed 100", false
		}
	case "bxgy":
		if req.BuyQuantity == nil || *req.BuyQuantity < 1 {
			return "buy_quantity must be at least 1", false
		}
		if req.GetQuantity == nil || *req.GetQuantity < 1 {
			return "get_quantity must be at least 1", false
		}
	case "shipping":
		// no extra validation
	default:
		return "discount_category must be order, product, bxgy, or shipping", false
	}
	if req.UsageLimit != nil && *req.UsageLimit < 1 {
		return "usage_limit must be at least 1", false
	}
	return "", true
}

func buildCouponModel(req *couponReq) models.Coupon {
	typ := req.Type
	val := 0.0
	if req.Value != nil {
		val = *req.Value
	}
	if req.DiscountCategory == "bxgy" || req.DiscountCategory == "shipping" {
		typ = "percent" // field is unused for these categories
	}
	active := true
	if req.Active != nil {
		active = *req.Active
	}
	return models.Coupon{
		Code:               strings.ToUpper(strings.TrimSpace(req.Code)),
		DiscountCategory:   req.DiscountCategory,
		Type:               typ,
		Value:              val,
		Active:             active,
		ExpiresAt:          req.ExpiresAt,
		MinOrderValue:      req.MinOrderValue,
		UsageLimit:         req.UsageLimit,
		AppliesToProducts:  stringsToJSON(req.AppliesToProducts),
		BuyQuantity:        req.BuyQuantity,
		BuyProductIds:      stringsToJSON(req.BuyProductIds),
		GetQuantity:        req.GetQuantity,
		GetProductIds:      stringsToJSON(req.GetProductIds),
		GetDiscountPercent: req.GetDiscountPercent,
	}
}

// ── GET /api/admin/coupons ────────────────────────────────────────────────────

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

// ── POST /api/admin/coupons ───────────────────────────────────────────────────

func (h *AdminCouponHandler) Create(c *gin.Context) {
	var req couponReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.TrimSpace(req.Code) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}
	if msg, ok := validateCouponReq(&req); !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	coupon := buildCouponModel(&req)
	if err := h.db.Create(&coupon).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "coupon code already exists"})
		return
	}
	c.JSON(http.StatusCreated, toCouponJSON(coupon))
}

// ── PUT /api/admin/coupons/:id ────────────────────────────────────────────────

func (h *AdminCouponHandler) Update(c *gin.Context) {
	var coupon models.Coupon
	if h.db.First(&coupon, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "coupon not found"})
		return
	}

	var req couponReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.TrimSpace(req.Code) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}
	if msg, ok := validateCouponReq(&req); !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code != coupon.Code {
		var dup models.Coupon
		if h.db.Where("code = ? AND id != ?", code, coupon.ID).First(&dup).Error == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "coupon code already exists"})
			return
		}
	}

	updated := buildCouponModel(&req)
	val := 0.0
	if req.Value != nil {
		val = *req.Value
	}
	active := coupon.Active
	if req.Active != nil {
		active = *req.Active
	}

	if err := h.db.Model(&coupon).
		Select("code", "discount_category", "type", "value", "active",
			"expires_at", "min_order_value", "usage_limit",
			"applies_to_products", "buy_quantity", "buy_product_ids",
			"get_quantity", "get_product_ids", "get_discount_percent").
		Updates(map[string]any{
			"code":                 updated.Code,
			"discount_category":    updated.DiscountCategory,
			"type":                 updated.Type,
			"value":                val,
			"active":               active,
			"expires_at":           req.ExpiresAt,
			"min_order_value":      req.MinOrderValue,
			"usage_limit":          req.UsageLimit,
			"applies_to_products":  updated.AppliesToProducts,
			"buy_quantity":         req.BuyQuantity,
			"buy_product_ids":      updated.BuyProductIds,
			"get_quantity":         req.GetQuantity,
			"get_product_ids":      updated.GetProductIds,
			"get_discount_percent": req.GetDiscountPercent,
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}

	h.db.First(&coupon, "id = ?", coupon.ID)
	c.JSON(http.StatusOK, toCouponJSON(coupon))
}

// ── PATCH /api/admin/coupons/:id/toggle ──────────────────────────────────────

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

// ── DELETE /api/admin/coupons/:id ────────────────────────────────────────────

func (h *AdminCouponHandler) Delete(c *gin.Context) {
	var coupon models.Coupon
	if h.db.First(&coupon, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "coupon not found"})
		return
	}
	h.db.Delete(&coupon)
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

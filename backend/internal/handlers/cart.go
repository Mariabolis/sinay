package handlers

import (
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

const (
	sessionCookieName = "sinay_sid"
	sessionCookieTTL  = 30 * 24 * 60 * 60 // 30 days
)

type CartHandler struct {
	db *gorm.DB
}

func NewCartHandler(db *gorm.DB) *CartHandler {
	return &CartHandler{db: db}
}

// ── response types ────────────────────────────────────────────────────────────

type cartProductResp struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Type  string `json:"type"`
	Style string `json:"style"`
}

type cartVariantResp struct {
	ID        string          `json:"id"`
	ColorName string          `json:"color_name"`
	ColorHex  string          `json:"color_hex"`
	Size      string          `json:"size"`
	Product   cartProductResp `json:"product"`
}

type cartItemResp struct {
	ID        string          `json:"id"`
	VariantID string          `json:"variant_id"`
	Quantity  int             `json:"quantity"`
	SetID     *string         `json:"set_id"`
	UnitPrice float64         `json:"unit_price"`
	Variant   cartVariantResp `json:"variant"`
}

type cartResp struct {
	CartID     string         `json:"cart_id"`
	Items      []cartItemResp `json:"items"`
	ItemCount  int            `json:"item_count"`
	Subtotal   float64        `json:"subtotal"`
	CouponCode *string        `json:"coupon_code"`
	Discount   float64        `json:"discount"`
	Total      float64        `json:"total"`
}

// ── cart resolution ───────────────────────────────────────────────────────────

// getOrCreateCart finds or creates the cart for the current request.
// Prefers the user's persistent cart when authenticated, falls back to session
// cookie for anonymous visitors (creating a new session ID if needed).
func (h *CartHandler) getOrCreateCart(c *gin.Context) (*models.Cart, error) {
	var cart models.Cart

	if uid, ok := c.Get("user_id"); ok {
		userUUID, err := uuid.Parse(uid.(string))
		if err != nil {
			return nil, err
		}
		if h.db.Where("user_id = ?", userUUID).First(&cart).Error == nil {
			return &cart, nil
		}
		cart = models.Cart{UserID: &userUUID}
		return &cart, h.db.Create(&cart).Error
	}

	sessionID, _ := c.Cookie(sessionCookieName)
	if sessionID == "" {
		sessionID = uuid.New().String()
	}
	if h.db.Where("session_id = ?", sessionID).First(&cart).Error != nil {
		cart = models.Cart{SessionID: &sessionID}
		if err := h.db.Create(&cart).Error; err != nil {
			return nil, err
		}
	}

	c.SetCookie(sessionCookieName, sessionID, sessionCookieTTL, "/", "", false, true)
	return &cart, nil
}

// ── response builder ──────────────────────────────────────────────────────────

func (h *CartHandler) buildResponse(cartID uuid.UUID) (*cartResp, error) {
	var cart models.Cart
	if err := h.db.
		Preload("Items").
		Preload("Items.Variant").
		Preload("Items.Variant.Product").
		Where("id = ?", cartID).
		First(&cart).Error; err != nil {
		return nil, err
	}

	items := make([]cartItemResp, 0, len(cart.Items))
	var subtotal float64

	for _, item := range cart.Items {
		var setIDStr *string
		if item.SetID != nil {
			s := item.SetID.String()
			setIDStr = &s
		}

		var vr cartVariantResp
		if v := item.Variant; v != nil {
			vr = cartVariantResp{
				ID:        v.ID.String(),
				ColorName: v.ColorName,
				ColorHex:  v.ColorHex,
				Size:      v.Size,
			}
			if p := v.Product; p != nil {
				vr.Product = cartProductResp{
					ID:    p.ID.String(),
					Name:  p.Name,
					Slug:  p.Slug,
					Type:  p.Type,
					Style: p.Style,
				}
			}
		}

		items = append(items, cartItemResp{
			ID:        item.ID.String(),
			VariantID: item.VariantID.String(),
			Quantity:  item.Quantity,
			SetID:     setIDStr,
			UnitPrice: item.UnitPrice,
			Variant:   vr,
		})
		subtotal += item.UnitPrice * float64(item.Quantity)
	}

	discount := h.computeDiscount(&cart, subtotal)
	total := subtotal - discount
	if total < 0 {
		total = 0
	}

	return &cartResp{
		CartID:     cart.ID.String(),
		Items:      items,
		ItemCount:  len(items),
		Subtotal:   subtotal,
		CouponCode: cart.CouponCode,
		Discount:   discount,
		Total:      total,
	}, nil
}

func (h *CartHandler) computeDiscount(cart *models.Cart, subtotal float64) float64 {
	if cart.CouponCode == nil || *cart.CouponCode == "" {
		return 0
	}
	var coupon models.Coupon
	if h.db.Where("code = ? AND active = true", *cart.CouponCode).First(&coupon).Error != nil {
		return 0
	}
	if coupon.ExpiresAt != nil && coupon.ExpiresAt.Before(time.Now()) {
		return 0
	}
	switch coupon.Type {
	case "percent":
		return math.Round(subtotal*coupon.Value/100*100) / 100
	case "fixed":
		if coupon.Value > subtotal {
			return subtotal
		}
		return coupon.Value
	}
	return 0
}

// effectivePrice returns the selling price for a variant, falling back to the
// product's base price when no per-variant override exists.
func effectivePrice(v *models.ProductVariant) float64 {
	if v.PriceOverride != nil {
		return *v.PriceOverride
	}
	if v.Product != nil {
		return v.Product.BasePrice
	}
	return 0
}

// ── GET /api/cart ─────────────────────────────────────────────────────────────

func (h *CartHandler) Get(c *gin.Context) {
	cart, err := h.getOrCreateCart(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not resolve cart"})
		return
	}
	resp, err := h.buildResponse(cart.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load cart"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ── POST /api/cart/sets ───────────────────────────────────────────────────────

func (h *CartHandler) AddSet(c *gin.Context) {
	var req struct {
		TopVariantID    string `json:"top_variant_id"    binding:"required"`
		BottomVariantID string `json:"bottom_variant_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	topVID, err := uuid.Parse(req.TopVariantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid top_variant_id"})
		return
	}
	botVID, err := uuid.Parse(req.BottomVariantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bottom_variant_id"})
		return
	}

	var topVariant, botVariant models.ProductVariant
	if h.db.Preload("Product").First(&topVariant, "id = ?", topVID).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "top variant not found"})
		return
	}
	if h.db.Preload("Product").First(&botVariant, "id = ?", botVID).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "bottom variant not found"})
		return
	}
	if topVariant.StockQuantity < 1 || botVariant.StockQuantity < 1 {
		c.JSON(http.StatusConflict, gin.H{"error": "one or more variants are out of stock"})
		return
	}

	cart, err := h.getOrCreateCart(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not resolve cart"})
		return
	}

	setID := uuid.New()
	items := []models.CartItem{
		{CartID: cart.ID, VariantID: topVID, SetID: &setID, UnitPrice: effectivePrice(&topVariant), Quantity: 1},
		{CartID: cart.ID, VariantID: botVID, SetID: &setID, UnitPrice: effectivePrice(&botVariant), Quantity: 1},
	}
	if err := h.db.Create(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not add set to cart"})
		return
	}

	resp, err := h.buildResponse(cart.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load cart"})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

// ── POST /api/cart/items ──────────────────────────────────────────────────────

func (h *CartHandler) AddItem(c *gin.Context) {
	var req struct {
		VariantID string `json:"variant_id" binding:"required"`
		Quantity  int    `json:"quantity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	variantUUID, err := uuid.Parse(req.VariantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid variant_id"})
		return
	}

	var variant models.ProductVariant
	if h.db.Preload("Product").First(&variant, "id = ?", variantUUID).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "variant not found"})
		return
	}
	if variant.StockQuantity < req.Quantity {
		c.JSON(http.StatusConflict, gin.H{"error": "not enough stock"})
		return
	}

	cart, err := h.getOrCreateCart(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not resolve cart"})
		return
	}

	// Increment quantity if the same standalone variant is already in the cart.
	var existing models.CartItem
	if h.db.Where("cart_id = ? AND variant_id = ? AND set_id IS NULL", cart.ID, variantUUID).First(&existing).Error == nil {
		existing.Quantity += req.Quantity
		h.db.Save(&existing)
	} else {
		item := models.CartItem{
			CartID:    cart.ID,
			VariantID: variantUUID,
			Quantity:  req.Quantity,
			UnitPrice: effectivePrice(&variant),
		}
		if err := h.db.Create(&item).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not add item"})
			return
		}
	}

	resp, err := h.buildResponse(cart.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load cart"})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

// ── PUT /api/cart/items/:id ───────────────────────────────────────────────────

func (h *CartHandler) UpdateItem(c *gin.Context) {
	itemUUID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}

	var req struct {
		Quantity int `json:"quantity" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cart, err := h.getOrCreateCart(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not resolve cart"})
		return
	}

	var item models.CartItem
	if h.db.Where("id = ? AND cart_id = ?", itemUUID, cart.ID).First(&item).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}

	item.Quantity = req.Quantity
	h.db.Save(&item)

	resp, err := h.buildResponse(cart.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load cart"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ── DELETE /api/cart/items/:id ────────────────────────────────────────────────

func (h *CartHandler) RemoveItem(c *gin.Context) {
	itemUUID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}

	cart, err := h.getOrCreateCart(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not resolve cart"})
		return
	}

	var item models.CartItem
	if h.db.Where("id = ? AND cart_id = ?", itemUUID, cart.ID).First(&item).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	}

	// Removing one item of a set removes both pieces to keep set integrity.
	if item.SetID != nil {
		h.db.Where("cart_id = ? AND set_id = ?", cart.ID, *item.SetID).Delete(&models.CartItem{})
	} else {
		h.db.Delete(&item)
	}

	resp, err := h.buildResponse(cart.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load cart"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ── POST /api/cart/coupon ─────────────────────────────────────────────────────

func (h *CartHandler) ApplyCoupon(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var coupon models.Coupon
	if h.db.Where("code = ? AND active = true", req.Code).First(&coupon).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "coupon not found or inactive"})
		return
	}
	if coupon.ExpiresAt != nil && coupon.ExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "coupon has expired"})
		return
	}

	cart, err := h.getOrCreateCart(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not resolve cart"})
		return
	}
	cart.CouponCode = &coupon.Code
	h.db.Save(cart)

	resp, err := h.buildResponse(cart.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load cart"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ── DELETE /api/cart/coupon ───────────────────────────────────────────────────

func (h *CartHandler) RemoveCoupon(c *gin.Context) {
	cart, err := h.getOrCreateCart(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not resolve cart"})
		return
	}
	cart.CouponCode = nil
	h.db.Save(cart)

	resp, err := h.buildResponse(cart.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load cart"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

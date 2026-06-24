package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminProductHandler struct {
	db *gorm.DB
}

func NewAdminProductHandler(db *gorm.DB) *AdminProductHandler {
	return &AdminProductHandler{db: db}
}

// adminVariantResp is the variant shape returned to the admin.
type adminVariantResp struct {
	ID            string   `json:"id"`
	ColorName     string   `json:"color_name"`
	ColorHex      string   `json:"color_hex"`
	Size          string   `json:"size"`
	SKU           string   `json:"sku"`
	PriceOverride *float64 `json:"price_override"`
	StockQuantity int      `json:"stock_quantity"`
	ImageURL      *string  `json:"image_url"`
}

type adminProductResp struct {
	ID        string             `json:"id"`
	Slug      string             `json:"slug"`
	Name      string             `json:"name"`
	Type      string             `json:"type"`
	Style     string             `json:"style"`
	BasePrice float64            `json:"base_price"`
	IsActive  bool               `json:"is_active"`
	Variants  []adminVariantResp `json:"variants"`
}

func toAdminProduct(p models.Product) adminProductResp {
	variants := make([]adminVariantResp, 0, len(p.Variants))
	for _, v := range p.Variants {
		variants = append(variants, adminVariantResp{
			ID:            v.ID.String(),
			ColorName:     v.ColorName,
			ColorHex:      v.ColorHex,
			Size:          v.Size,
			SKU:           v.SKU,
			PriceOverride: v.PriceOverride,
			StockQuantity: v.StockQuantity,
			ImageURL:      v.ImageURL,
		})
	}
	return adminProductResp{
		ID:        p.ID.String(),
		Slug:      p.Slug,
		Name:      p.Name,
		Type:      p.Type,
		Style:     p.Style,
		BasePrice: p.BasePrice,
		IsActive:  p.IsActive,
		Variants:  variants,
	}
}

// GET /api/admin/products
func (h *AdminProductHandler) List(c *gin.Context) {
	var products []models.Product
	h.db.Preload("Variants").Order("name ASC").Find(&products)
	resp := make([]adminProductResp, len(products))
	for i, p := range products {
		resp[i] = toAdminProduct(p)
	}
	c.JSON(http.StatusOK, resp)
}

// POST /api/admin/products
func (h *AdminProductHandler) Create(c *gin.Context) {
	var req struct {
		Name        string  `json:"name"        binding:"required"`
		Type        string  `json:"type"        binding:"required"`
		Style       string  `json:"style"       binding:"required"`
		Description string  `json:"description"`
		Fabric      string  `json:"fabric"`
		CareNotes   string  `json:"care_notes"`
		BasePrice   float64 `json:"base_price"  binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product := models.Product{
		Slug:        slugify(req.Name),
		Name:        req.Name,
		Type:        req.Type,
		Style:       req.Style,
		Description: nullableStr(req.Description),
		Fabric:      nullableStr(req.Fabric),
		CareNotes:   nullableStr(req.CareNotes),
		BasePrice:   req.BasePrice,
	}
	if err := h.db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create product"})
		return
	}
	c.JSON(http.StatusCreated, toAdminProduct(product))
}

// PUT /api/admin/products/:id
func (h *AdminProductHandler) Update(c *gin.Context) {
	var product models.Product
	if h.db.First(&product, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var req struct {
		Name      *string  `json:"name"`
		BasePrice *float64 `json:"base_price"`
		IsActive  *bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]any{}
	if req.Name != nil      { updates["name"] = *req.Name }
	if req.BasePrice != nil { updates["base_price"] = *req.BasePrice }
	if req.IsActive != nil  { updates["is_active"] = *req.IsActive }

	if len(updates) > 0 {
		h.db.Model(&product).Updates(updates)
	}
	h.db.Preload("Variants").First(&product, "id = ?", product.ID)
	c.JSON(http.StatusOK, toAdminProduct(product))
}

// POST /api/admin/products/:id/variants
func (h *AdminProductHandler) CreateVariant(c *gin.Context) {
	var product models.Product
	if h.db.First(&product, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var req struct {
		ColorName     string   `json:"color_name"     binding:"required"`
		ColorHex      string   `json:"color_hex"      binding:"required"`
		Size          string   `json:"size"           binding:"required"`
		SKU           string   `json:"sku"            binding:"required"`
		PriceOverride *float64 `json:"price_override"`
		StockQuantity int      `json:"stock_quantity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	variant := models.ProductVariant{
		ProductID:     product.ID,
		ColorName:     req.ColorName,
		ColorHex:      req.ColorHex,
		Size:          req.Size,
		SKU:           req.SKU,
		PriceOverride: req.PriceOverride,
		StockQuantity: req.StockQuantity,
	}
	if err := h.db.Create(&variant).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "SKU already exists or create failed"})
		return
	}
	c.JSON(http.StatusCreated, adminVariantResp{
		ID:            variant.ID.String(),
		ColorName:     variant.ColorName,
		ColorHex:      variant.ColorHex,
		Size:          variant.Size,
		SKU:           variant.SKU,
		PriceOverride: variant.PriceOverride,
		StockQuantity: variant.StockQuantity,
		ImageURL:      variant.ImageURL,
	})
}

// PUT /api/admin/variants/:id
func (h *AdminProductHandler) UpdateVariant(c *gin.Context) {
	var variant models.ProductVariant
	if h.db.First(&variant, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "variant not found"})
		return
	}

	var req struct {
		PriceOverride *float64 `json:"price_override"`
		StockQuantity *int     `json:"stock_quantity"`
		ImageURL      *string  `json:"image_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]any{}
	if req.PriceOverride != nil { updates["price_override"] = req.PriceOverride }
	if req.StockQuantity != nil  { updates["stock_quantity"] = *req.StockQuantity }
	if req.ImageURL != nil       { updates["image_url"] = req.ImageURL }

	if len(updates) > 0 {
		h.db.Model(&variant).Updates(updates)
	}
	h.db.First(&variant, "id = ?", variant.ID)
	c.JSON(http.StatusOK, adminVariantResp{
		ID:            variant.ID.String(),
		ColorName:     variant.ColorName,
		ColorHex:      variant.ColorHex,
		Size:          variant.Size,
		SKU:           variant.SKU,
		PriceOverride: variant.PriceOverride,
		StockQuantity: variant.StockQuantity,
		ImageURL:      variant.ImageURL,
	})
}

// slugify converts a product name into a URL-safe slug.
func slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	out := make([]rune, 0, len(s))
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			out = append(out, r)
		case r == ' ' || r == '-' || r == '_':
			out = append(out, '-')
		}
	}
	return strings.Trim(string(out), "-")
}

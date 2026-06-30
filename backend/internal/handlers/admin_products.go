package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminProductHandler struct {
	db *gorm.DB
}

func NewAdminProductHandler(db *gorm.DB) *AdminProductHandler {
	return &AdminProductHandler{db: db}
}

// ── response types ─────────────────────────────────────────────────────────────

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
	ID          string             `json:"id"`
	Slug        string             `json:"slug"`
	Name        string             `json:"name"`
	Type        string             `json:"type"`
	Style       string             `json:"style"`
	Description string             `json:"description"`
	Fabric      string             `json:"fabric"`
	CareNotes   string             `json:"care_notes"`
	BasePrice   float64            `json:"base_price"`
	IsActive    bool               `json:"is_active"`
	Variants    []adminVariantResp `json:"variants"`
}

type adminProductsListResp struct {
	Products []adminProductResp `json:"products"`
	Total    int64              `json:"total"`
	Page     int                `json:"page"`
	PerPage  int                `json:"per_page"`
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
		ID:          p.ID.String(),
		Slug:        p.Slug,
		Name:        p.Name,
		Type:        p.Type,
		Style:       p.Style,
		Description: derefStr(p.Description),
		Fabric:      derefStr(p.Fabric),
		CareNotes:   derefStr(p.CareNotes),
		BasePrice:   p.BasePrice,
		IsActive:    p.IsActive,
		Variants:    variants,
	}
}

// ── GET /api/admin/products ────────────────────────────────────────────────────

func (h *AdminProductHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	search := strings.TrimSpace(c.Query("search"))
	style  := c.Query("style")

	q := h.db.Model(&models.Product{})
	if search != "" {
		q = q.Where("LOWER(name) LIKE LOWER(?)", "%"+search+"%")
	}
	if style != "" {
		q = q.Where("style = ?", style)
	}

	var total int64
	q.Count(&total)

	var products []models.Product
	q.Preload("Variants").Order("name ASC").
		Offset((page - 1) * perPage).Limit(perPage).
		Find(&products)

	resp := make([]adminProductResp, len(products))
	for i, p := range products {
		resp[i] = toAdminProduct(p)
	}
	c.JSON(http.StatusOK, adminProductsListResp{
		Products: resp,
		Total:    total,
		Page:     page,
		PerPage:  perPage,
	})
}

// ── GET /api/admin/products/:id ────────────────────────────────────────────────

func (h *AdminProductHandler) GetOne(c *gin.Context) {
	var product models.Product
	if h.db.Preload("Variants", func(db *gorm.DB) *gorm.DB {
		return db.Order("color_name ASC, size ASC")
	}).First(&product, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	c.JSON(http.StatusOK, toAdminProduct(product))
}

// ── variant input used in Create and Update ────────────────────────────────────

type adminVariantInput struct {
	ID            *string  `json:"id"`
	ColorName     string   `json:"color_name"`
	ColorHex      string   `json:"color_hex"`
	Size          string   `json:"size"`
	SKU           string   `json:"sku"`
	PriceOverride *float64 `json:"price_override"`
	StockQuantity int      `json:"stock_quantity"`
	ImageURL      *string  `json:"image_url"`
}

// ── POST /api/admin/products ───────────────────────────────────────────────────

func (h *AdminProductHandler) Create(c *gin.Context) {
	var req struct {
		Name        string              `json:"name"        binding:"required"`
		Slug        string              `json:"slug"`
		Type        string              `json:"type"        binding:"required"`
		Style       string              `json:"style"       binding:"required"`
		Description string              `json:"description"`
		Fabric      string              `json:"fabric"`
		CareNotes   string              `json:"care_notes"`
		BasePrice   float64             `json:"base_price"  binding:"required"`
		Variants    []adminVariantInput `json:"variants"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	productSlug := req.Slug
	if productSlug == "" {
		productSlug = slugify(req.Name)
	}

	var product models.Product
	err := h.db.Transaction(func(tx *gorm.DB) error {
		product = models.Product{
			Slug:        productSlug,
			Name:        req.Name,
			Type:        req.Type,
			Style:       req.Style,
			Description: nullableStr(req.Description),
			Fabric:      nullableStr(req.Fabric),
			CareNotes:   nullableStr(req.CareNotes),
			BasePrice:   req.BasePrice,
		}
		if err := tx.Create(&product).Error; err != nil {
			return err
		}
		for _, vi := range req.Variants {
			sku := vi.SKU
			if sku == "" {
				sku = adminSKU(productSlug, vi.ColorName, vi.Size)
			}
			v := models.ProductVariant{
				ProductID:     product.ID,
				ColorName:     vi.ColorName,
				ColorHex:      vi.ColorHex,
				Size:          vi.Size,
				SKU:           sku,
				PriceOverride: vi.PriceOverride,
				StockQuantity: vi.StockQuantity,
				ImageURL:      vi.ImageURL,
			}
			if err := tx.Create(&v).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create failed: " + err.Error()})
		return
	}
	h.db.Preload("Variants").First(&product, "id = ?", product.ID)
	c.JSON(http.StatusCreated, toAdminProduct(product))
}

// ── PUT /api/admin/products/:id ────────────────────────────────────────────────

func (h *AdminProductHandler) Update(c *gin.Context) {
	var product models.Product
	if h.db.Preload("Variants").First(&product, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var req struct {
		Name        *string             `json:"name"`
		Slug        *string             `json:"slug"`
		Type        *string             `json:"type"`
		Style       *string             `json:"style"`
		Description *string             `json:"description"`
		Fabric      *string             `json:"fabric"`
		CareNotes   *string             `json:"care_notes"`
		BasePrice   *float64            `json:"base_price"`
		IsActive    *bool               `json:"is_active"`
		Variants    []adminVariantInput `json:"variants"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		updates := map[string]any{}
		if req.Name        != nil { updates["name"]        = *req.Name }
		if req.Slug        != nil { updates["slug"]        = *req.Slug }
		if req.Type        != nil { updates["type"]        = *req.Type }
		if req.Style       != nil { updates["style"]       = *req.Style }
		if req.Description != nil { updates["description"] = req.Description }
		if req.Fabric      != nil { updates["fabric"]      = req.Fabric }
		if req.CareNotes   != nil { updates["care_notes"]  = req.CareNotes }
		if req.BasePrice   != nil { updates["base_price"]  = *req.BasePrice }
		if req.IsActive    != nil { updates["is_active"]   = *req.IsActive }
		if len(updates) > 0 {
			if err := tx.Model(&product).Updates(updates).Error; err != nil {
				return err
			}
		}

		// Only sync variants when the key was present in the payload
		if req.Variants == nil {
			return nil
		}

		// Collect incoming variant IDs to detect removals
		incoming := make(map[uuid.UUID]bool)
		for _, vi := range req.Variants {
			if vi.ID != nil {
				if id, err := uuid.Parse(*vi.ID); err == nil {
					incoming[id] = true
				}
			}
		}

		// Delete variants that were dropped from the form
		for _, existing := range product.Variants {
			if !incoming[existing.ID] {
				if err := tx.Delete(&existing).Error; err != nil {
					return err
				}
			}
		}

		// Upsert incoming variants
		for _, vi := range req.Variants {
			if vi.ID != nil {
				varUpdates := map[string]any{
					"color_name":     vi.ColorName,
					"color_hex":      vi.ColorHex,
					"size":           vi.Size,
					"sku":            vi.SKU,
					"stock_quantity": vi.StockQuantity,
					"price_override": vi.PriceOverride,
					"image_url":      vi.ImageURL,
				}
				if err := tx.Model(&models.ProductVariant{}).
					Where("id = ?", *vi.ID).Updates(varUpdates).Error; err != nil {
					return err
				}
			} else {
				sku := vi.SKU
				if sku == "" {
					sku = adminSKU(product.Slug, vi.ColorName, vi.Size)
				}
				v := models.ProductVariant{
					ProductID:     product.ID,
					ColorName:     vi.ColorName,
					ColorHex:      vi.ColorHex,
					Size:          vi.Size,
					SKU:           sku,
					PriceOverride: vi.PriceOverride,
					StockQuantity: vi.StockQuantity,
					ImageURL:      vi.ImageURL,
				}
				if err := tx.Create(&v).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed: " + err.Error()})
		return
	}
	h.db.Preload("Variants", func(db *gorm.DB) *gorm.DB {
		return db.Order("color_name ASC, size ASC")
	}).First(&product, "id = ?", product.ID)
	c.JSON(http.StatusOK, toAdminProduct(product))
}

// ── DELETE /api/admin/products/:id ────────────────────────────────────────────

func (h *AdminProductHandler) Delete(c *gin.Context) {
	var product models.Product
	if h.db.First(&product, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	// Cascade deletes variants + images via DB FK constraints.
	// Fails with 409 if variants are referenced by orders/cart items.
	if err := h.db.Delete(&product).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "cannot delete — product has linked orders"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

// ── POST /api/admin/products/:id/variants ─────────────────────────────────────

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
		SKU           string   `json:"sku"`
		PriceOverride *float64 `json:"price_override"`
		StockQuantity int      `json:"stock_quantity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sku := req.SKU
	if sku == "" {
		sku = adminSKU(product.Slug, req.ColorName, req.Size)
	}

	variant := models.ProductVariant{
		ProductID:     product.ID,
		ColorName:     req.ColorName,
		ColorHex:      req.ColorHex,
		Size:          req.Size,
		SKU:           sku,
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

// ── PUT /api/admin/variants/:id ───────────────────────────────────────────────

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
	if req.StockQuantity != nil { updates["stock_quantity"] = *req.StockQuantity }
	if req.ImageURL      != nil { updates["image_url"]      = req.ImageURL }

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

// ── DELETE /api/admin/variants/:id ────────────────────────────────────────────

func (h *AdminProductHandler) DeleteVariant(c *gin.Context) {
	var variant models.ProductVariant
	if h.db.First(&variant, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "variant not found"})
		return
	}
	if err := h.db.Delete(&variant).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "cannot delete — variant has linked orders"})
		return
	}
	c.Status(http.StatusNoContent)
}

// ── helpers ───────────────────────────────────────────────────────────────────

// slugify converts a product name to a URL-safe slug.
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

// adminSKU generates a default SKU from slug, color name, and size.
func adminSKU(productSlug, colorName, size string) string {
	parts := []string{
		productSlug,
		strings.ToLower(strings.ReplaceAll(strings.TrimSpace(colorName), " ", "-")),
		strings.ToLower(strings.TrimSpace(size)),
	}
	return strings.Join(parts, "-")
}

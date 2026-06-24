package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type ProductHandler struct {
	db *gorm.DB
}

func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{db: db}
}

// ── response types ────────────────────────────────────────────────────────────

type variantResp struct {
	ID            string  `json:"id"`
	ColorName     string  `json:"color_name"`
	ColorHex      string  `json:"color_hex"`
	Size          string  `json:"size"`
	SKU           string  `json:"sku"`
	StockQuantity int     `json:"stock_quantity"`
	Price         float64 `json:"price"`
}

type productResp struct {
	ID          string        `json:"id"`
	Slug        string        `json:"slug"`
	Name        string        `json:"name"`
	Type        string        `json:"type"`
	Style       string        `json:"style"`
	Description string        `json:"description"`
	Fabric      string        `json:"fabric"`
	BasePrice   float64       `json:"base_price"`
	Variants    []variantResp `json:"variants"`
}

type productsListResp struct {
	Products []productResp `json:"products"`
	Total    int64         `json:"total"`
	Page     int           `json:"page"`
	PerPage  int           `json:"per_page"`
}

type colorOption struct {
	ColorName string `json:"color_name" gorm:"column:color_name"`
	ColorHex  string `json:"color_hex"  gorm:"column:color_hex"`
}

// ── helpers ───────────────────────────────────────────────────────────────────

func toProductResp(p models.Product) productResp {
	pr := productResp{
		ID:          p.ID.String(),
		Slug:        p.Slug,
		Name:        p.Name,
		Type:        p.Type,
		Style:       p.Style,
		Description: derefStr(p.Description),
		Fabric:      derefStr(p.Fabric),
		BasePrice:   p.BasePrice,
		Variants:    make([]variantResp, 0, len(p.Variants)),
	}
	for _, v := range p.Variants {
		price := p.BasePrice
		if v.PriceOverride != nil {
			price = *v.PriceOverride
		}
		pr.Variants = append(pr.Variants, variantResp{
			ID:            v.ID.String(),
			ColorName:     v.ColorName,
			ColorHex:      v.ColorHex,
			Size:          v.Size,
			SKU:           v.SKU,
			StockQuantity: v.StockQuantity,
			Price:         price,
		})
	}
	return pr
}

// buildBaseQuery applies type/style/color/size filters to a base product query.
func (h *ProductHandler) buildBaseQuery(productType, style, color, size string) *gorm.DB {
	q := h.db.Model(&models.Product{}).Where("is_active = ?", true)
	if productType != "" {
		q = q.Where("type = ?", productType)
	}
	if style != "" {
		q = q.Where("style = ?", style)
	}
	if color != "" || size != "" {
		varQ := h.db.Model(&models.ProductVariant{})
		if color != "" {
			if strings.HasPrefix(color, "#") {
				varQ = varQ.Where("color_hex = ?", color)
			} else {
				varQ = varQ.Where("LOWER(color_name) LIKE LOWER(?)", "%"+color+"%")
			}
		}
		if size != "" {
			varQ = varQ.Where("size = ?", strings.ToUpper(size))
		}
		q = q.Where("id IN (?)", varQ.Select("product_id"))
	}
	return q
}

// variantPreload returns a preload function that filters variants to match
// the active color/size filters.
func variantPreload(color, size string) func(*gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		if color != "" {
			if strings.HasPrefix(color, "#") {
				db = db.Where("color_hex = ?", color)
			} else {
				db = db.Where("LOWER(color_name) LIKE LOWER(?)", "%"+color+"%")
			}
		}
		if size != "" {
			db = db.Where("size = ?", strings.ToUpper(size))
		}
		return db.Order("color_name ASC, size ASC")
	}
}

// ── GET /api/products ─────────────────────────────────────────────────────────

func (h *ProductHandler) List(c *gin.Context) {
	productType := c.Query("type")
	style       := c.Query("style")
	color       := c.Query("color")
	size        := c.Query("size")

	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	perPage, err := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if err != nil || perPage < 1 || perPage > 100 {
		perPage = 20
	}

	var total int64
	if err := h.buildBaseQuery(productType, style, color, size).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	var products []models.Product
	if err := h.buildBaseQuery(productType, style, color, size).
		Preload("Variants", variantPreload(color, size)).
		Order("created_at ASC").
		Offset((page - 1) * perPage).
		Limit(perPage).
		Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	resp := make([]productResp, 0, len(products))
	for _, p := range products {
		resp = append(resp, toProductResp(p))
	}

	c.JSON(http.StatusOK, productsListResp{
		Products: resp,
		Total:    total,
		Page:     page,
		PerPage:  perPage,
	})
}

// ── GET /api/products/:slug ───────────────────────────────────────────────────

func (h *ProductHandler) Get(c *gin.Context) {
	slug := c.Param("slug")

	var product models.Product
	if err := h.db.
		Where("slug = ? AND is_active = ?", slug, true).
		Preload("Variants", func(db *gorm.DB) *gorm.DB {
			return db.Order("color_name ASC, size ASC")
		}).
		First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	c.JSON(http.StatusOK, toProductResp(product))
}

// ── GET /api/sets ─────────────────────────────────────────────────────────────

func (h *ProductHandler) ListSets(c *gin.Context) {
	type variantBrief struct {
		ID          string `json:"id"`
		ProductName string `json:"product_name"`
		Style       string `json:"style"`
		ColorName   string `json:"color_name"`
		ColorHex    string `json:"color_hex"`
	}
	type setResp struct {
		ID             string       `json:"id"`
		Name           string       `json:"name"`
		Price          float64      `json:"price"`
		TopVariant     variantBrief `json:"top_variant"`
		BottomVariant  variantBrief `json:"bottom_variant"`
		AvailableSizes []string     `json:"available_sizes"`
	}

	var sets []models.ReadySet
	if err := h.db.
		Preload("TopVariant.Product").
		Preload("BottomVariant.Product").
		Where("is_active = true").
		Order("created_at DESC").
		Find(&sets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	sizeOrder := []string{"XS", "S", "M", "L", "XL", "XXL"}

	out := make([]setResp, 0, len(sets))
	for _, s := range sets {
		r := setResp{ID: s.ID.String(), Name: s.Name, Price: s.Price}

		if s.TopVariant != nil {
			r.TopVariant = variantBrief{
				ID:          s.TopVariant.ID.String(),
				ProductName: s.TopVariant.Product.Name,
				Style:       s.TopVariant.Product.Style,
				ColorName:   s.TopVariant.ColorName,
				ColorHex:    s.TopVariant.ColorHex,
			}
		}
		if s.BottomVariant != nil {
			r.BottomVariant = variantBrief{
				ID:          s.BottomVariant.ID.String(),
				ProductName: s.BottomVariant.Product.Name,
				Style:       s.BottomVariant.Product.Style,
				ColorName:   s.BottomVariant.ColorName,
				ColorHex:    s.BottomVariant.ColorHex,
			}
		}

		// Sizes where both top color and bottom color have stock
		if s.TopVariant != nil && s.BottomVariant != nil {
			var topSizes, botSizes []string
			h.db.Model(&models.ProductVariant{}).
				Where("product_id = ? AND color_hex = ? AND stock_quantity > 0",
					s.TopVariant.ProductID, s.TopVariant.ColorHex).
				Pluck("size", &topSizes)
			h.db.Model(&models.ProductVariant{}).
				Where("product_id = ? AND color_hex = ? AND stock_quantity > 0",
					s.BottomVariant.ProductID, s.BottomVariant.ColorHex).
				Pluck("size", &botSizes)

			botSet := make(map[string]bool, len(botSizes))
			for _, sz := range botSizes {
				botSet[sz] = true
			}
			topSet := make(map[string]bool, len(topSizes))
			for _, sz := range topSizes {
				topSet[sz] = true
			}
			for _, sz := range sizeOrder {
				if topSet[sz] && botSet[sz] {
					r.AvailableSizes = append(r.AvailableSizes, sz)
				}
			}
		}
		if r.AvailableSizes == nil {
			r.AvailableSizes = []string{}
		}

		// Only show sets that have at least one size in stock for both pieces
		if len(r.AvailableSizes) > 0 {
			out = append(out, r)
		}
	}
	c.JSON(http.StatusOK, out)
}

// ── GET /api/colors ───────────────────────────────────────────────────────────

func (h *ProductHandler) Colors(c *gin.Context) {
	var colors []colorOption
	if err := h.db.Raw(
		`SELECT DISTINCT color_name, color_hex
		 FROM product_variants
		 WHERE stock_quantity > 0
		 ORDER BY color_name`,
	).Scan(&colors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	if colors == nil {
		colors = []colorOption{}
	}
	c.JSON(http.StatusOK, colors)
}

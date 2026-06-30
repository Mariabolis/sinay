package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminInventoryHandler struct {
	db *gorm.DB
}

func NewAdminInventoryHandler(db *gorm.DB) *AdminInventoryHandler {
	return &AdminInventoryHandler{db: db}
}

type inventoryItemResp struct {
	VariantID     string `json:"variant_id"`
	ProductID     string `json:"product_id"`
	ProductName   string `json:"product_name"`
	Style         string `json:"style"`
	ColorName     string `json:"color_name"`
	ColorHex      string `json:"color_hex"`
	Size          string `json:"size"`
	SKU           string `json:"sku"`
	StockQuantity int    `json:"stock_quantity"`
	IsLowStock    bool   `json:"is_low_stock"`
	IsOutOfStock  bool   `json:"is_out_of_stock"`
}

type inventoryResp struct {
	Items     []inventoryItemResp `json:"items"`
	Threshold int                 `json:"threshold"`
}

func (h *AdminInventoryHandler) getThreshold() int {
	var setting models.Setting
	if h.db.First(&setting, "key = ?", "low_stock_threshold").Error == nil {
		if n, err := strconv.Atoi(setting.Value); err == nil && n >= 0 {
			return n
		}
	}
	return 5
}

// GET /api/admin/inventory
func (h *AdminInventoryHandler) List(c *gin.Context) {
	threshold := h.getThreshold()

	var variants []models.ProductVariant
	h.db.Preload("Product").
		Joins("JOIN products ON products.id = product_variants.product_id").
		Order("products.name ASC, product_variants.color_name ASC, product_variants.size ASC").
		Find(&variants)

	items := make([]inventoryItemResp, 0, len(variants))
	for _, v := range variants {
		name := ""
		style := ""
		pid := ""
		if v.Product != nil {
			name  = v.Product.Name
			style = v.Product.Style
			pid   = v.Product.ID.String()
		}
		oos      := v.StockQuantity == 0
		lowStock := !oos && v.StockQuantity <= threshold
		items = append(items, inventoryItemResp{
			VariantID:     v.ID.String(),
			ProductID:     pid,
			ProductName:   name,
			Style:         style,
			ColorName:     v.ColorName,
			ColorHex:      v.ColorHex,
			Size:          v.Size,
			SKU:           v.SKU,
			StockQuantity: v.StockQuantity,
			IsLowStock:    lowStock,
			IsOutOfStock:  oos,
		})
	}

	c.JSON(http.StatusOK, inventoryResp{Items: items, Threshold: threshold})
}

// PUT /api/admin/inventory/:variant_id
func (h *AdminInventoryHandler) UpdateStock(c *gin.Context) {
	var req struct {
		StockQuantity *int `json:"stock_quantity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.StockQuantity == nil || *req.StockQuantity < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "stock_quantity must be a non-negative integer"})
		return
	}

	result := h.db.Model(&models.ProductVariant{}).
		Where("id = ?", c.Param("variant_id")).
		Update("stock_quantity", *req.StockQuantity)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "variant not found"})
		return
	}

	// Return updated flags so frontend can re-derive status without a full reload
	threshold := h.getThreshold()
	oos      := *req.StockQuantity == 0
	lowStock := !oos && *req.StockQuantity <= threshold
	c.JSON(http.StatusOK, gin.H{
		"stock_quantity": *req.StockQuantity,
		"is_out_of_stock": oos,
		"is_low_stock":    lowStock,
	})
}

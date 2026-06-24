package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminSetHandler struct {
	db *gorm.DB
}

func NewAdminSetHandler(db *gorm.DB) *AdminSetHandler {
	return &AdminSetHandler{db: db}
}

type readySetResp struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Price           float64         `json:"price"`
	IsActive        bool            `json:"is_active"`
	TopVariantID    string          `json:"top_variant_id"`
	BottomVariantID string          `json:"bottom_variant_id"`
	TopVariant      variantBrief    `json:"top_variant"`
	BottomVariant   variantBrief    `json:"bottom_variant"`
}

type variantBrief struct {
	ID          string `json:"id"`
	ProductName string `json:"product_name"`
	ColorName   string `json:"color_name"`
	ColorHex    string `json:"color_hex"`
	Size        string `json:"size"`
}

func toReadySetResp(rs models.ReadySet) readySetResp {
	r := readySetResp{
		ID:              rs.ID.String(),
		Name:            rs.Name,
		Price:           rs.Price,
		IsActive:        rs.IsActive,
		TopVariantID:    rs.TopVariantID.String(),
		BottomVariantID: rs.BottomVariantID.String(),
	}
	if rs.TopVariant != nil {
		name := ""
		if rs.TopVariant.Product != nil {
			name = rs.TopVariant.Product.Name
		}
		r.TopVariant = variantBrief{
			ID:          rs.TopVariant.ID.String(),
			ProductName: name,
			ColorName:   rs.TopVariant.ColorName,
			ColorHex:    rs.TopVariant.ColorHex,
			Size:        rs.TopVariant.Size,
		}
	}
	if rs.BottomVariant != nil {
		name := ""
		if rs.BottomVariant.Product != nil {
			name = rs.BottomVariant.Product.Name
		}
		r.BottomVariant = variantBrief{
			ID:          rs.BottomVariant.ID.String(),
			ProductName: name,
			ColorName:   rs.BottomVariant.ColorName,
			ColorHex:    rs.BottomVariant.ColorHex,
			Size:        rs.BottomVariant.Size,
		}
	}
	return r
}

// GET /api/admin/sets
func (h *AdminSetHandler) List(c *gin.Context) {
	var sets []models.ReadySet
	h.db.Preload("TopVariant.Product").Preload("BottomVariant.Product").
		Order("created_at DESC").Find(&sets)
	resp := make([]readySetResp, len(sets))
	for i, rs := range sets {
		resp[i] = toReadySetResp(rs)
	}
	c.JSON(http.StatusOK, resp)
}

// POST /api/admin/sets
func (h *AdminSetHandler) Create(c *gin.Context) {
	var req struct {
		Name            string  `json:"name"              binding:"required"`
		TopVariantID    string  `json:"top_variant_id"    binding:"required"`
		BottomVariantID string  `json:"bottom_variant_id" binding:"required"`
		Price           float64 `json:"price"             binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	topID, err1 := uuid.Parse(req.TopVariantID)
	botID, err2 := uuid.Parse(req.BottomVariantID)
	if err1 != nil || err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid variant id"})
		return
	}

	rs := models.ReadySet{
		Name:            req.Name,
		TopVariantID:    topID,
		BottomVariantID: botID,
		Price:           req.Price,
		IsActive:        true,
	}
	if err := h.db.Create(&rs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create set"})
		return
	}
	h.db.Preload("TopVariant.Product").Preload("BottomVariant.Product").First(&rs, "id = ?", rs.ID)
	c.JSON(http.StatusCreated, toReadySetResp(rs))
}

// PUT /api/admin/sets/:id
func (h *AdminSetHandler) Update(c *gin.Context) {
	var rs models.ReadySet
	if h.db.First(&rs, "id = ?", c.Param("id")).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "set not found"})
		return
	}

	var req struct {
		Name     *string  `json:"name"`
		Price    *float64 `json:"price"`
		IsActive *bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]any{}
	if req.Name != nil     { updates["name"]      = *req.Name }
	if req.Price != nil    { updates["price"]      = *req.Price }
	if req.IsActive != nil { updates["is_active"]  = *req.IsActive }

	if len(updates) > 0 {
		h.db.Model(&rs).Updates(updates)
	}
	h.db.Preload("TopVariant.Product").Preload("BottomVariant.Product").First(&rs, "id = ?", rs.ID)
	c.JSON(http.StatusOK, toReadySetResp(rs))
}

// DELETE /api/admin/sets/:id
func (h *AdminSetHandler) Delete(c *gin.Context) {
	result := h.db.Delete(&models.ReadySet{}, "id = ?", c.Param("id"))
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "set not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

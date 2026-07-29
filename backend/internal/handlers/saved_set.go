package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type SavedSetHandler struct {
	db *gorm.DB
}

func NewSavedSetHandler(db *gorm.DB) *SavedSetHandler {
	return &SavedSetHandler{db: db}
}

// ── response types ────────────────────────────────────────────────────────────

type savedSetVariantResp struct {
	ID        string  `json:"id"`
	ColorName string  `json:"color_name"`
	ColorHex  string  `json:"color_hex"`
	Size      string  `json:"size"`
	Price     float64 `json:"price"`
	ImageURL  *string `json:"image_url"`
	Product   struct {
		Name  string `json:"name"`
		Slug  string `json:"slug"`
		Type  string `json:"type"`
		Style string `json:"style"`
	} `json:"product"`
}

type savedSetResp struct {
	ID     string               `json:"id"`
	Top    savedSetVariantResp  `json:"top"`
	Bottom savedSetVariantResp  `json:"bottom"`
}

func toSavedSetVariantResp(v *models.ProductVariant) savedSetVariantResp {
	var r savedSetVariantResp
	if v == nil {
		return r
	}
	r.ID = v.ID.String()
	r.ColorName = v.ColorName
	r.Size = v.Size
	r.ColorHex = v.ColorHex
	r.ImageURL = v.ImageURL
	if v.Product != nil {
		r.Price = v.Product.BasePrice
		r.Product.Name = v.Product.Name
		r.Product.Slug = v.Product.Slug
		r.Product.Type = v.Product.Type
		r.Product.Style = v.Product.Style
	}
	if v.PriceOverride != nil {
		r.Price = *v.PriceOverride
	}
	return r
}

func toSavedSetResp(s models.SavedSet) savedSetResp {
	return savedSetResp{
		ID:     s.ID.String(),
		Top:    toSavedSetVariantResp(s.TopVariant),
		Bottom: toSavedSetVariantResp(s.BottomVariant),
	}
}

// ── GET /api/saved-sets ────────────────────────────────────────────────────────

func (h *SavedSetHandler) List(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	var sets []models.SavedSet
	h.db.
		Preload("TopVariant.Product").
		Preload("BottomVariant.Product").
		Where("user_id = ?", user.ID).
		Order("created_at DESC").
		Find(&sets)

	resp := make([]savedSetResp, len(sets))
	for i, s := range sets {
		resp[i] = toSavedSetResp(s)
	}
	c.JSON(http.StatusOK, resp)
}

// ── POST /api/saved-sets ───────────────────────────────────────────────────────

func (h *SavedSetHandler) Create(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	var req struct {
		TopVariantID    string `json:"top_variant_id"    binding:"required"`
		BottomVariantID string `json:"bottom_variant_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	topID, err1 := uuid.Parse(req.TopVariantID)
	bottomID, err2 := uuid.Parse(req.BottomVariantID)
	if err1 != nil || err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid variant id"})
		return
	}

	set := models.SavedSet{UserID: user.ID, TopVariantID: topID, BottomVariantID: bottomID}
	if err := h.db.Where("user_id = ? AND top_variant_id = ? AND bottom_variant_id = ?", user.ID, topID, bottomID).
		FirstOrCreate(&set).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save set"})
		return
	}
	h.db.Preload("TopVariant.Product").Preload("BottomVariant.Product").First(&set, "id = ?", set.ID)
	c.JSON(http.StatusCreated, toSavedSetResp(set))
}

// ── DELETE /api/saved-sets/:id ─────────────────────────────────────────────────

func (h *SavedSetHandler) Delete(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	h.db.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Delete(&models.SavedSet{})
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

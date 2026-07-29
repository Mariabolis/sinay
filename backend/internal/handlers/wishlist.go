package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type WishlistHandler struct {
	db *gorm.DB
}

func NewWishlistHandler(db *gorm.DB) *WishlistHandler {
	return &WishlistHandler{db: db}
}

// ── GET /api/wishlist ──────────────────────────────────────────────────────────

func (h *WishlistHandler) List(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var items []models.WishlistItem
	h.db.
		Preload("Product.Variants").
		Preload("Product.Images").
		Where("user_id = ?", user.ID).
		Order("created_at DESC").
		Find(&items)

	products := make([]productResp, 0, len(items))
	for _, item := range items {
		if item.Product != nil {
			products = append(products, toProductResp(*item.Product))
		}
	}
	c.JSON(http.StatusOK, gin.H{"products": products})
}

// ── POST /api/wishlist ─────────────────────────────────────────────────────────

func (h *WishlistHandler) Add(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var req struct {
		ProductID string `json:"product_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	productID, err := uuid.Parse(req.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid product_id"})
		return
	}

	item := models.WishlistItem{UserID: user.ID, ProductID: productID}
	if err := h.db.Where("user_id = ? AND product_id = ?", user.ID, productID).
		FirstOrCreate(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not add to wishlist"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "added"})
}

// ── DELETE /api/wishlist/:product_id ──────────────────────────────────────────

func (h *WishlistHandler) Remove(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	h.db.Where("user_id = ? AND product_id = ?", user.ID, c.Param("product_id")).
		Delete(&models.WishlistItem{})
	c.JSON(http.StatusOK, gin.H{"status": "removed"})
}

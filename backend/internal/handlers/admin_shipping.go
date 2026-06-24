package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminShippingHandler struct {
	db *gorm.DB
}

func NewAdminShippingHandler(db *gorm.DB) *AdminShippingHandler {
	return &AdminShippingHandler{db: db}
}

// GET /api/admin/shipping
func (h *AdminShippingHandler) List(c *gin.Context) {
	var zones []models.ShippingZone
	h.db.Order("governorate ASC").Find(&zones)
	if zones == nil {
		zones = []models.ShippingZone{}
	}
	c.JSON(http.StatusOK, zones)
}

// PUT /api/admin/shipping/:governorate
func (h *AdminShippingHandler) Update(c *gin.Context) {
	gov := c.Param("governorate")

	var req struct {
		Fee *float64 `json:"fee" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fee is required"})
		return
	}

	result := h.db.Model(&models.ShippingZone{}).
		Where("governorate = ?", gov).
		Updates(map[string]interface{}{"fee": *req.Fee})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "governorate not found"})
		return
	}
	c.JSON(http.StatusOK, models.ShippingZone{Governorate: gov, Fee: *req.Fee})
}

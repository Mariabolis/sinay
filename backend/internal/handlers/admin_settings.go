package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"sinay/backend/internal/models"
)

type AdminSettingHandler struct {
	db *gorm.DB
}

func NewAdminSettingHandler(db *gorm.DB) *AdminSettingHandler {
	return &AdminSettingHandler{db: db}
}

// GET /api/admin/settings
func (h *AdminSettingHandler) List(c *gin.Context) {
	var settings []models.Setting
	h.db.Find(&settings)
	if settings == nil {
		settings = []models.Setting{}
	}
	c.JSON(http.StatusOK, settings)
}

// PUT /api/admin/settings/:key
func (h *AdminSettingHandler) Update(c *gin.Context) {
	key := c.Param("key")

	var req struct {
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	setting := models.Setting{Key: key, Value: req.Value}
	h.db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&setting)
	c.JSON(http.StatusOK, setting)
}

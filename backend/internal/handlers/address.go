package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AddressHandler struct {
	db *gorm.DB
}

func NewAddressHandler(db *gorm.DB) *AddressHandler {
	return &AddressHandler{db: db}
}

type addressResp struct {
	ID          string  `json:"id"`
	Label       *string `json:"label"`
	FullName    *string `json:"full_name"`
	Phone       *string `json:"phone"`
	Governorate *string `json:"governorate"`
	City        *string `json:"city"`
	Street      *string `json:"street"`
	Building    *string `json:"building"`
	Notes       *string `json:"notes"`
	IsDefault   bool    `json:"is_default"`
}

func addrToResp(a models.Address) addressResp {
	return addressResp{
		ID:          a.ID.String(),
		Label:       a.Label,
		FullName:    a.FullName,
		Phone:       a.Phone,
		Governorate: a.Governorate,
		City:        a.City,
		Street:      a.Street,
		Building:    a.Building,
		Notes:       a.Notes,
		IsDefault:   a.IsDefault,
	}
}

// GET /api/addresses
func (h *AddressHandler) List(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	var addrs []models.Address
	h.db.Where("user_id = ?", user.ID).Order("is_default DESC, id ASC").Find(&addrs)
	resp := make([]addressResp, len(addrs))
	for i, a := range addrs {
		resp[i] = addrToResp(a)
	}
	c.JSON(http.StatusOK, resp)
}

// POST /api/addresses
func (h *AddressHandler) Create(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	var req struct {
		Label       string `json:"label"`
		FullName    string `json:"full_name"  binding:"required"`
		Phone       string `json:"phone"       binding:"required"`
		Governorate string `json:"governorate" binding:"required"`
		City        string `json:"city"        binding:"required"`
		Street      string `json:"street"      binding:"required"`
		Building    string `json:"building"`
		Notes       string `json:"notes"`
		IsDefault   bool   `json:"is_default"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.IsDefault {
		h.db.Model(&models.Address{}).
			Where("user_id = ?", user.ID).
			Update("is_default", false)
	}
	addr := models.Address{
		UserID:      &user.ID,
		Label:       nullableStr(req.Label),
		FullName:    nullableStr(req.FullName),
		Phone:       nullableStr(req.Phone),
		Governorate: nullableStr(req.Governorate),
		City:        nullableStr(req.City),
		Street:      nullableStr(req.Street),
		Building:    nullableStr(req.Building),
		Notes:       nullableStr(req.Notes),
		IsDefault:   req.IsDefault,
	}
	if err := h.db.Create(&addr).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save address"})
		return
	}
	c.JSON(http.StatusCreated, addrToResp(addr))
}

// DELETE /api/addresses/:id
func (h *AddressHandler) Delete(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	var addr models.Address
	if h.db.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).First(&addr).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "address not found"})
		return
	}
	h.db.Delete(&addr)
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

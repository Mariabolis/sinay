package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type ReviewHandler struct {
	db *gorm.DB
}

func NewReviewHandler(db *gorm.DB) *ReviewHandler {
	return &ReviewHandler{db: db}
}

// ── response types ────────────────────────────────────────────────────────────

type reviewResp struct {
	ID        string `json:"id"`
	Rating    int    `json:"rating"`
	Comment   string `json:"comment"`
	UserName  string `json:"user_name"`
	CreatedAt string `json:"created_at"`
}

type reviewsListResp struct {
	Reviews []reviewResp `json:"reviews"`
	Average float64      `json:"average"`
	Count   int          `json:"count"`
}

func toReviewResp(r models.Review) reviewResp {
	name := "SINAY customer"
	if r.User != nil && r.User.FullName != nil && *r.User.FullName != "" {
		name = *r.User.FullName
	}
	return reviewResp{
		ID:        r.ID.String(),
		Rating:    r.Rating,
		Comment:   r.Comment,
		UserName:  name,
		CreatedAt: r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ── GET /api/products/:slug/reviews ───────────────────────────────────────────

func (h *ReviewHandler) List(c *gin.Context) {
	var product models.Product
	if h.db.Where("slug = ?", c.Param("slug")).First(&product).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var reviews []models.Review
	h.db.Preload("User").
		Where("product_id = ?", product.ID).
		Order("created_at DESC").
		Find(&reviews)

	resp := make([]reviewResp, len(reviews))
	var sum int
	for i, r := range reviews {
		resp[i] = toReviewResp(r)
		sum += r.Rating
	}
	average := 0.0
	if len(reviews) > 0 {
		average = float64(sum) / float64(len(reviews))
	}

	c.JSON(http.StatusOK, reviewsListResp{Reviews: resp, Average: average, Count: len(reviews)})
}

// ── POST /api/products/:slug/reviews ──────────────────────────────────────────
//
// One review per user per product — resubmitting updates the existing one.

func (h *ReviewHandler) Create(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var product models.Product
	if h.db.Where("slug = ?", c.Param("slug")).First(&product).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var req struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.Review
	err := h.db.Where("product_id = ? AND user_id = ?", product.ID, user.ID).First(&existing).Error
	if err == nil {
		h.db.Model(&existing).Updates(map[string]any{"rating": req.Rating, "comment": req.Comment})
		existing.Rating, existing.Comment = req.Rating, req.Comment
		existing.User = &user
		c.JSON(http.StatusOK, toReviewResp(existing))
		return
	}

	review := models.Review{
		ProductID: product.ID,
		UserID:    user.ID,
		Rating:    req.Rating,
		Comment:   req.Comment,
		User:      &user,
	}
	if err := h.db.Create(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save review"})
		return
	}
	c.JSON(http.StatusCreated, toReviewResp(review))
}

// ── DELETE /api/admin/reviews/:id ─────────────────────────────────────────────

func (h *ReviewHandler) Delete(c *gin.Context) {
	h.db.Delete(&models.Review{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

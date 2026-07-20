package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
)

type AdminAbandonedHandler struct {
	db *gorm.DB
}

func NewAdminAbandonedHandler(db *gorm.DB) *AdminAbandonedHandler {
	return &AdminAbandonedHandler{db: db}
}

// ── response types ─────────────────────────────────────────────────────────────

type abandonedItemResp struct {
	ProductName string  `json:"product_name"`
	ColorName   string  `json:"color_name"`
	Size        string  `json:"size"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	ImageURL    *string `json:"image_url"`
}

type abandonedCheckoutResp struct {
	ID            string               `json:"id"`
	CreatedAt     string               `json:"created_at"`
	CustomerEmail *string              `json:"customer_email"`
	CustomerName  *string              `json:"customer_name"`
	CustomerPhone *string              `json:"customer_phone"`
	ItemCount     int                  `json:"item_count"`
	Subtotal      float64              `json:"subtotal"`
	Items         []abandonedItemResp  `json:"items"`
}

type abandonedListResp struct {
	Checkouts []abandonedCheckoutResp `json:"checkouts"`
	Total     int64                   `json:"total"`
	Page      int                     `json:"page"`
	PerPage   int                     `json:"per_page"`
}

// ── GET /api/admin/abandoned-checkouts ────────────────────────────────────────
//
// A checkout is "abandoned" if its cart still holds items — checkout clears
// cart_items on completion (see CheckoutHandler.Checkout), so any non-empty
// cart is, by definition, one that was never finished.
func (h *AdminAbandonedHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	base := h.db.Model(&models.Cart{}).
		Where("EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = carts.id)")

	var total int64
	base.Count(&total)

	var carts []models.Cart
	base.
		Preload("User").
		Preload("Items.Variant.Product").
		Order("created_at DESC").
		Offset((page - 1) * perPage).
		Limit(perPage).
		Find(&carts)

	resp := make([]abandonedCheckoutResp, len(carts))
	for i, cart := range carts {
		var email, name, phone *string
		if cart.User != nil {
			email = &cart.User.Email
			name = cart.User.FullName
			phone = cart.User.Phone
		}

		items := make([]abandonedItemResp, 0, len(cart.Items))
		var subtotal float64
		itemCount := 0
		for _, ci := range cart.Items {
			var productName, colorName, size string
			var imageURL *string
			if ci.Variant != nil {
				colorName = ci.Variant.ColorName
				size = ci.Variant.Size
				imageURL = ci.Variant.ImageURL
				if ci.Variant.Product != nil {
					productName = ci.Variant.Product.Name
				}
			}
			items = append(items, abandonedItemResp{
				ProductName: productName,
				ColorName:   colorName,
				Size:        size,
				Quantity:    ci.Quantity,
				UnitPrice:   ci.UnitPrice,
				ImageURL:    imageURL,
			})
			subtotal += ci.UnitPrice * float64(ci.Quantity)
			itemCount += ci.Quantity
		}

		resp[i] = abandonedCheckoutResp{
			ID:            cart.ID.String(),
			CreatedAt:     cart.CreatedAt.Format(time.RFC3339),
			CustomerEmail: email,
			CustomerName:  name,
			CustomerPhone: phone,
			ItemCount:     itemCount,
			Subtotal:      subtotal,
			Items:         items,
		}
	}

	c.JSON(http.StatusOK, abandonedListResp{
		Checkouts: resp,
		Total:     total,
		Page:      page,
		PerPage:   perPage,
	})
}

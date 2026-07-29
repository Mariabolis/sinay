package handlers

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
	"sinay/backend/internal/services/email"
)

// sendOrderConfirmationEmail loads the order and emails the buyer a summary.
// Called from both the COD checkout path and the Paymob success callback —
// the two places an order actually becomes confirmed.
func sendOrderConfirmationEmail(db *gorm.DB, emailSvc *email.Service, orderID uuid.UUID) {
	var order models.Order
	if err := db.
		Preload("Items.Variant.Product").
		Preload("Items.Variant").
		Preload("User").
		First(&order, "id = ?", orderID).Error; err != nil {
		return
	}
	if order.User == nil || order.User.Email == "" {
		return
	}

	var rows strings.Builder
	for _, oi := range order.Items {
		name, color, size := "Item", "", ""
		if oi.Variant != nil {
			color = oi.Variant.ColorName
			size = oi.Variant.Size
			if oi.Variant.Product != nil {
				name = oi.Variant.Product.Name
			}
		}
		rows.WriteString(fmt.Sprintf(
			"<tr><td style=\"padding:6px 0\">%s (%s, %s) × %d</td><td style=\"padding:6px 0;text-align:right\">EGP %.0f</td></tr>",
			name, color, size, oi.Quantity, oi.UnitPrice*float64(oi.Quantity),
		))
	}

	html := fmt.Sprintf(`
		<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#4A3F38">
			<h2 style="font-weight:600">Thanks for your order!</h2>
			<p>Order #%s is confirmed. Here's what's on the way:</p>
			<table style="width:100%%;border-collapse:collapse">%s</table>
			<hr style="border:none;border-top:1px solid #ECE3D9;margin:16px 0">
			<p style="text-align:right;font-weight:600">Total: EGP %.0f</p>
			<p style="color:#8B7568;font-size:13px">We'll let you know when it ships.</p>
		</div>`,
		order.ID.String()[:8], rows.String(), order.Total,
	)

	emailSvc.Send(order.User.Email, "Your SINAY order is confirmed", html)
}

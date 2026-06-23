package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
	"sinay/backend/internal/services/payment"
)

type PaymentCallbackHandler struct {
	db     *gorm.DB
	paymob *payment.Service
}

func NewPaymentCallbackHandler(db *gorm.DB, paymob *payment.Service) *PaymentCallbackHandler {
	return &PaymentCallbackHandler{db: db, paymob: paymob}
}

// POST /api/payments/paymob/callback
// Paymob sends this after every transaction (success or failure).
// We verify the HMAC before trusting any field.
func (h *PaymentCallbackHandler) PaymobCallback(c *gin.Context) {
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// Only act on TRANSACTION events; acknowledge others silently
	if eventType, _ := body["type"].(string); eventType != "TRANSACTION" {
		c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		return
	}

	hmacVal, _ := body["hmac"].(string)
	obj, _ := body["obj"].(map[string]any)
	if obj == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing obj in body"})
		return
	}

	// Reject payloads that fail HMAC verification
	if !h.paymob.VerifyWebhookHMAC(hmacVal, obj) {
		c.JSON(http.StatusForbidden, gin.H{"error": "HMAC verification failed"})
		return
	}

	success, _ := obj["success"].(bool)

	// Extract Paymob's integer transaction ID
	transactionID := ""
	if idF, ok := obj["id"].(float64); ok {
		transactionID = strconv.FormatInt(int64(idF), 10)
	}

	// Extract Paymob's integer order ID (what we stored in payments.paymob_order_id)
	paymobOrderID := ""
	if order, ok := obj["order"].(map[string]any); ok {
		if idF, ok := order["id"].(float64); ok {
			paymobOrderID = strconv.FormatInt(int64(idF), 10)
		} else {
			paymobOrderID = fmt.Sprintf("%v", order["id"])
		}
	}
	if paymobOrderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing order.id in callback"})
		return
	}

	// Find our payment record via the Paymob order ID we stored at checkout
	var pmt models.Payment
	if h.db.Where("paymob_order_id = ?", paymobOrderID).First(&pmt).Error != nil {
		// Unknown order — return 200 so Paymob doesn't keep retrying
		c.JSON(http.StatusOK, gin.H{"status": "unknown_order"})
		return
	}

	// Avoid double-processing a terminal state
	if pmt.Status == "success" || pmt.Status == "refunded" {
		c.JSON(http.StatusOK, gin.H{"status": "already_processed"})
		return
	}

	raw, _ := json.Marshal(obj)

	if success {
		// Payment succeeded
		h.db.Model(&pmt).Updates(map[string]any{
			"status":         "success",
			"transaction_id": transactionID,
			"raw_callback":   datatypes.JSON(raw),
		})
		h.db.Model(&models.Order{}).
			Where("id = ?", pmt.OrderID).
			Update("status", "paid")

		// Decrement stock for every ordered item
		var orderItems []models.OrderItem
		h.db.Where("order_id = ?", pmt.OrderID).Find(&orderItems)
		for _, oi := range orderItems {
			h.db.Model(&models.ProductVariant{}).
				Where("id = ? AND stock_quantity >= ?", oi.VariantID, oi.Quantity).
				UpdateColumn("stock_quantity", gorm.Expr("stock_quantity - ?", oi.Quantity))
		}

		// Clear the buyer's cart (items only; keep the cart row for future use)
		var ord models.Order
		if h.db.First(&ord, "id = ?", pmt.OrderID).Error == nil && ord.UserID != nil {
			var buyerCart models.Cart
			if h.db.Where("user_id = ?", *ord.UserID).First(&buyerCart).Error == nil {
				h.db.Where("cart_id = ?", buyerCart.ID).Delete(&models.CartItem{})
			}
		}
	} else {
		// Payment failed or was declined
		h.db.Model(&pmt).Updates(map[string]any{
			"status":         "failed",
			"transaction_id": transactionID,
			"raw_callback":   datatypes.JSON(raw),
		})
		h.db.Model(&models.Order{}).
			Where("id = ?", pmt.OrderID).
			Update("status", "cancelled")
	}

	c.JSON(http.StatusOK, gin.H{"status": "processed"})
}

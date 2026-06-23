package handlers

import (
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sinay/backend/internal/models"
	"sinay/backend/internal/services/payment"
)

type CheckoutHandler struct {
	db     *gorm.DB
	paymob *payment.Service
}

func NewCheckoutHandler(db *gorm.DB, paymob *payment.Service) *CheckoutHandler {
	return &CheckoutHandler{db: db, paymob: paymob}
}

// ── POST /api/checkout ────────────────────────────────────────────────────────

type inlineAddr struct {
	Label       string `json:"label"`
	FullName    string `json:"full_name"`
	Phone       string `json:"phone"`
	Governorate string `json:"governorate"`
	City        string `json:"city"`
	Street      string `json:"street"`
	Building    string `json:"building"`
	Notes       string `json:"notes"`
	SaveAddress bool   `json:"save_address"`
}

func (h *CheckoutHandler) Checkout(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var req struct {
		AddressID     *string     `json:"address_id"`
		Address       *inlineAddr `json:"address"`
		PaymentMethod string      `json:"payment_method"` // "card" (default) | "cod"
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.AddressID == nil && req.Address == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "address_id or address is required"})
		return
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "card"
	}
	if req.PaymentMethod != "card" && req.PaymentMethod != "cod" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_method must be 'card' or 'cod'"})
		return
	}

	// Load cart
	var cart models.Cart
	if err := h.db.
		Preload("Items.Variant.Product").
		Preload("Items.Variant").
		Preload("Items").
		Where("user_id = ?", user.ID).
		First(&cart).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no active cart found"})
		return
	}
	if len(cart.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart is empty"})
		return
	}

	// Resolve address
	var addressID *uuid.UUID
	var resolvedAddr models.Address

	if req.AddressID != nil {
		uid, err := uuid.Parse(*req.AddressID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid address_id"})
			return
		}
		if h.db.Where("id = ? AND user_id = ?", uid, user.ID).First(&resolvedAddr).Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "address not found"})
			return
		}
		addressID = &uid
	} else {
		a := req.Address
		addr := models.Address{
			UserID:      &user.ID,
			Label:       nullableStr(a.Label),
			FullName:    nullableStr(a.FullName),
			Phone:       nullableStr(a.Phone),
			Governorate: nullableStr(a.Governorate),
			City:        nullableStr(a.City),
			Street:      nullableStr(a.Street),
			Building:    nullableStr(a.Building),
			Notes:       nullableStr(a.Notes),
		}
		if err := h.db.Create(&addr).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save address"})
			return
		}
		addressID = &addr.ID
		resolvedAddr = addr
	}

	// Compute totals
	subtotal := 0.0
	for _, item := range cart.Items {
		subtotal += item.UnitPrice * float64(item.Quantity)
	}

	discount := 0.0
	if cart.CouponCode != nil && *cart.CouponCode != "" {
		var coupon models.Coupon
		if h.db.Where("code = ? AND active = true", *cart.CouponCode).First(&coupon).Error == nil {
			if coupon.ExpiresAt == nil || coupon.ExpiresAt.After(time.Now()) {
				switch coupon.Type {
				case "percent":
					discount = math.Round(subtotal*coupon.Value/100*100) / 100
				case "fixed":
					if coupon.Value > subtotal {
						discount = subtotal
					} else {
						discount = coupon.Value
					}
				}
			}
		}
	}

	total := subtotal - discount
	amountCents := int(math.Round(total * 100))

	// Initial status depends on payment method
	initialStatus := "pending"
	if req.PaymentMethod == "cod" {
		initialStatus = "processing"
	}

	// Create Order
	order := models.Order{
		UserID:        &user.ID,
		AddressID:     addressID,
		Status:        initialStatus,
		PaymentMethod: req.PaymentMethod,
		Subtotal:      subtotal,
		Discount:      discount,
		Total:         total,
		CouponCode:    cart.CouponCode,
	}
	if err := h.db.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create order"})
		return
	}

	// Create OrderItems
	orderItems := make([]models.OrderItem, 0, len(cart.Items))
	for _, ci := range cart.Items {
		orderItems = append(orderItems, models.OrderItem{
			OrderID:   order.ID,
			VariantID: ci.VariantID,
			SetID:     ci.SetID,
			Quantity:  ci.Quantity,
			UnitPrice: ci.UnitPrice,
		})
	}
	h.db.Create(&orderItems)

	// ── Cash on Delivery: no payment gateway needed ───────────────────────────
	if req.PaymentMethod == "cod" {
		// Decrement stock immediately (no payment confirmation step)
		for _, ci := range cart.Items {
			h.db.Model(&models.ProductVariant{}).
				Where("id = ? AND stock_quantity >= ?", ci.VariantID, ci.Quantity).
				UpdateColumn("stock_quantity", gorm.Expr("stock_quantity - ?", ci.Quantity))
		}
		// Clear the cart
		h.db.Where("cart_id = ?", cart.ID).Delete(&models.CartItem{})
		c.JSON(http.StatusCreated, gin.H{"order_id": order.ID.String()})
		return
	}

	// Create Payment record (card only)
	pmt := models.Payment{
		OrderID:  order.ID,
		Provider: "paymob",
		Status:   "initiated",
		Amount:   total,
	}
	h.db.Create(&pmt)

	// ── Paymob chain ──────────────────────────────────────────────────────────

	authToken, err := h.paymob.GetAuthToken()
	if err != nil {
		h.markCancelled(order.ID, pmt.ID)
		c.JSON(http.StatusBadGateway, gin.H{"error": "payment gateway unavailable"})
		return
	}
	log.Printf("[paymob] auth token obtained (len=%d)", len(authToken))

	paymobItems := make([]payment.OrderItem, 0, len(cart.Items))
	for _, ci := range cart.Items {
		name := "SINAY Sleepwear"
		if ci.Variant != nil && ci.Variant.Product != nil {
			name = ci.Variant.Product.Name
		}
		paymobItems = append(paymobItems, payment.OrderItem{
			Name:        name,
			AmountCents: int(math.Round(ci.UnitPrice * 100)),
			Description: "SINAY sleepwear",
			Quantity:    ci.Quantity,
		})
	}

	log.Printf("[paymob] registering order: amount_cents=%d merchant_order_id=%s", amountCents, order.ID)
	paymobOrderID, err := h.paymob.RegisterOrder(authToken, amountCents, order.ID.String(), paymobItems)
	if err != nil {
		log.Printf("[paymob] RegisterOrder error: %v", err)
		h.markCancelled(order.ID, pmt.ID)
		c.JSON(http.StatusBadGateway, gin.H{"error": "could not register order with payment gateway"})
		return
	}
	log.Printf("[paymob] order registered: paymob_order_id=%d", paymobOrderID)
	paymobOrderStr := strconv.FormatInt(paymobOrderID, 10)
	h.db.Model(&pmt).Update("paymob_order_id", paymobOrderStr)

	// Build billing data
	firstName, lastName := splitName(derefStr(resolvedAddr.FullName))
	if firstName == "" {
		firstName, lastName = splitName(derefStr(user.FullName))
	}

	phone := derefStr(resolvedAddr.Phone)
	if phone == "" {
		phone = derefStr(user.Phone)
	}

	na := func(s string) string {
		if s == "" {
			return "NA"
		}
		return s
	}

	billing := payment.BillingData{
		Apartment:      "NA",
		Email:          user.Email,
		Floor:          "NA",
		FirstName:      na(firstName),
		LastName:       na(lastName),
		PhoneNumber:    na(phone),
		Street:         na(derefStr(resolvedAddr.Street)),
		Building:       na(derefStr(resolvedAddr.Building)),
		City:           na(derefStr(resolvedAddr.City)),
		State:          na(derefStr(resolvedAddr.Governorate)),
		Country:        "EG",
		ShippingMethod: "NA",
		PostalCode:     "NA",
	}
	log.Printf("[paymob] billing: %+v", billing)

	paymentKey, err := h.paymob.GetPaymentKey(authToken, amountCents, paymobOrderID, billing)
	if err != nil {
		log.Printf("[paymob] GetPaymentKey error: %v", err)
		h.markCancelled(order.ID, pmt.ID)
		c.JSON(http.StatusBadGateway, gin.H{"error": "could not generate payment key"})
		return
	}
	iframeURL := h.paymob.IframeURL(paymentKey)
	log.Printf("[paymob] payment key obtained (len=%d), iframe_id=%s", len(paymentKey), h.paymob.IframeID())
	log.Printf("[paymob] iframe URL: %s", iframeURL)

	c.JSON(http.StatusCreated, gin.H{
		"order_id":          order.ID.String(),
		"paymob_iframe_url": iframeURL,
	})
}

// markCancelled marks an order and its payment as cancelled without deleting
// them, preserving the audit trail for failed checkout attempts.
func (h *CheckoutHandler) markCancelled(orderID, pmtID uuid.UUID) {
	h.db.Model(&models.Payment{}).Where("id = ?", pmtID).Update("status", "failed")
	h.db.Model(&models.Order{}).Where("id = ?", orderID).Update("status", "cancelled")
}

// splitName splits "First Last Name" into ("First", "Last Name").
func splitName(name string) (string, string) {
	parts := strings.Fields(name)
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

// ── GET /api/orders/:id ───────────────────────────────────────────────────────

func (h *CheckoutHandler) GetOrder(c *gin.Context) {
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}
	user := c.MustGet("user").(models.User)

	var order models.Order
	if err := h.db.
		Preload("Items.Variant.Product").
		Preload("Items.Variant").
		Preload("Items").
		Preload("Payment").
		Where("id = ? AND user_id = ?", orderID, user.ID).
		First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	c.JSON(http.StatusOK, toOrderResp(order))
}

// ── response types ────────────────────────────────────────────────────────────

type orderVariantResp struct {
	ID        string `json:"id"`
	ColorName string `json:"color_name"`
	ColorHex  string `json:"color_hex"`
	Size      string `json:"size"`
	Product   struct {
		Name  string `json:"name"`
		Type  string `json:"type"`
		Style string `json:"style"`
	} `json:"product"`
}

type orderItemResp struct {
	ID        string           `json:"id"`
	Quantity  int              `json:"quantity"`
	UnitPrice float64          `json:"unit_price"`
	SetID     *string          `json:"set_id"`
	Variant   orderVariantResp `json:"variant"`
}

type orderResp struct {
	ID            string          `json:"id"`
	Status        string          `json:"status"`
	PaymentMethod string          `json:"payment_method"`
	Subtotal      float64         `json:"subtotal"`
	Discount      float64         `json:"discount"`
	Total         float64         `json:"total"`
	CouponCode    *string         `json:"coupon_code"`
	Items         []orderItemResp `json:"items"`
	PaymentStatus string          `json:"payment_status"`
	CreatedAt     string          `json:"created_at"`
}

func toOrderResp(o models.Order) orderResp {
	items := make([]orderItemResp, 0, len(o.Items))
	for _, oi := range o.Items {
		var setStr *string
		if oi.SetID != nil {
			s := oi.SetID.String()
			setStr = &s
		}
		var vr orderVariantResp
		if v := oi.Variant; v != nil {
			vr.ID = v.ID.String()
			vr.ColorName = v.ColorName
			vr.ColorHex = v.ColorHex
			vr.Size = v.Size
			if p := v.Product; p != nil {
				vr.Product.Name = p.Name
				vr.Product.Type = p.Type
				vr.Product.Style = p.Style
			}
		}
		items = append(items, orderItemResp{
			ID:        oi.ID.String(),
			Quantity:  oi.Quantity,
			UnitPrice: oi.UnitPrice,
			SetID:     setStr,
			Variant:   vr,
		})
	}

	pmtStatus := "initiated"
	if o.Payment != nil {
		pmtStatus = o.Payment.Status
	}

	return orderResp{
		ID:            o.ID.String(),
		Status:        o.Status,
		PaymentMethod: o.PaymentMethod,
		Subtotal:      o.Subtotal,
		Discount:      o.Discount,
		Total:         o.Total,
		CouponCode:    o.CouponCode,
		Items:         items,
		PaymentStatus: pmtStatus,
		CreatedAt:     o.CreatedAt.Format(time.RFC3339),
	}
}

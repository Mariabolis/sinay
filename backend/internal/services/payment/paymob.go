// Package payment provides the Paymob Accept API client.
// All credentials are injected at construction time — never hardcode them.
package payment

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// Service holds the per-environment Paymob credentials.
type Service struct {
	baseURL    string // e.g. https://accept-alpha.paymob.com/api or https://accept.paymob.com/api
	apiKey     string
	intID      string // integration_id (as string; parsed to int when needed)
	iframeID   string
	hmacSecret string
}

func NewService(baseURL, apiKey, intID, iframeID, hmacSecret string) *Service {
	return &Service{
		baseURL:    baseURL,
		apiKey:     apiKey,
		intID:      intID,
		iframeID:   iframeID,
		hmacSecret: hmacSecret,
	}
}

// GetAuthToken exchanges the API key for a short-lived bearer token.
func (s *Service) GetAuthToken() (string, error) {
	resp, err := s.post("/auth/tokens", map[string]string{"api_key": s.apiKey})
	if err != nil {
		return "", err
	}
	token, ok := resp["token"].(string)
	if !ok {
		return "", fmt.Errorf("paymob auth: no token in response")
	}
	return token, nil
}

// RegisterOrder registers an order with Paymob.
// merchantOrderID is our DB order UUID — stored on the Paymob order so the
// callback can cross-reference back to our records.
// Returns the numeric Paymob order ID.
func (s *Service) RegisterOrder(authToken string, amountCents int, merchantOrderID string, items []OrderItem) (int64, error) {
	body := map[string]any{
		"auth_token":        authToken,
		"delivery_needed":   false,
		"amount_cents":      amountCents,
		"currency":          "EGP",
		"merchant_order_id": merchantOrderID,
		"items":             items,
	}
	resp, err := s.post("/ecommerce/orders", body)
	if err != nil {
		return 0, err
	}
	idF, ok := resp["id"].(float64)
	if !ok {
		return 0, fmt.Errorf("paymob register_order: no id in response")
	}
	return int64(idF), nil
}

// GetPaymentKey obtains a one-time payment token from Paymob.
func (s *Service) GetPaymentKey(authToken string, amountCents int, paymobOrderID int64, billing BillingData) (string, error) {
	intID, err := strconv.Atoi(s.intID)
	if err != nil {
		return "", fmt.Errorf("paymob: invalid PAYMOB_INTEGRATION_ID %q: %w", s.intID, err)
	}
	body := map[string]any{
		"auth_token":     authToken,
		"amount_cents":   amountCents,
		"expiration":     3600,
		"order_id":       paymobOrderID,
		"billing_data":   billing,
		"currency":       "EGP",
		"integration_id": intID,
	}
	resp, err := s.post("/acceptance/payment_keys", body)
	if err != nil {
		return "", err
	}
	token, ok := resp["token"].(string)
	if !ok {
		return "", fmt.Errorf("paymob payment_keys: no token in response")
	}
	return token, nil
}

// IframeURL returns the hosted payment page URL the frontend should redirect to.
func (s *Service) IframeURL(paymentKey string) string {
	return fmt.Sprintf("%s/acceptance/iframes/%s?payment_token=%s", s.baseURL, s.iframeID, paymentKey)
}

// IframeID exposes the configured iframe ID for logging/debugging.
func (s *Service) IframeID() string { return s.iframeID }

// VerifyWebhookHMAC verifies the HMAC-SHA512 Paymob attaches to POST callbacks.
// hmacVal is the "hmac" top-level field; obj is the "obj" field from the body.
func (s *Service) VerifyWebhookHMAC(hmacVal string, obj map[string]any) bool {
	data := buildHMACString(obj)
	mac := hmac.New(sha512.New, []byte(s.hmacSecret))
	mac.Write([]byte(data))
	computed := fmt.Sprintf("%x", mac.Sum(nil))
	return strings.EqualFold(computed, hmacVal)
}

// buildHMACString concatenates the fields Paymob uses for its HMAC,
// in the exact order mandated by the Paymob Accept documentation.
func buildHMACString(obj map[string]any) string {
	var b strings.Builder

	// Scalar fields — alphabetical per Paymob spec
	for _, k := range []string{
		"amount_cents", "created_at", "currency",
		"error_occured", "has_parent_transaction",
		"id", "integration_id",
		"is_3d_secure", "is_auth", "is_capture",
		"is_refunded", "is_standalone_payment", "is_voided",
	} {
		b.WriteString(payStr(obj[k]))
	}

	// Nested: order.id
	if order, ok := obj["order"].(map[string]any); ok {
		b.WriteString(payStr(order["id"]))
	}

	b.WriteString(payStr(obj["owner"]))
	b.WriteString(payStr(obj["pending"]))

	// Nested: source_data.*
	if sd, ok := obj["source_data"].(map[string]any); ok {
		b.WriteString(payStr(sd["pan"]))
		b.WriteString(payStr(sd["sub_type"]))
		b.WriteString(payStr(sd["type"]))
	}

	b.WriteString(payStr(obj["success"]))
	return b.String()
}

// payStr converts a JSON-decoded value to the string Paymob expects in the
// HMAC pre-image (booleans → "true"/"false", numbers → integer strings).
func payStr(v any) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case bool:
		return strconv.FormatBool(val)
	case float64:
		return strconv.FormatInt(int64(val), 10)
	case string:
		return val
	default:
		return fmt.Sprintf("%v", val)
	}
}

// ── domain types ──────────────────────────────────────────────────────────────

// OrderItem is one line in the Paymob order registration request.
type OrderItem struct {
	Name        string `json:"name"`
	AmountCents int    `json:"amount_cents"`
	Description string `json:"description"`
	Quantity    int    `json:"quantity"`
}

// BillingData is the buyer info Paymob requires for payment key generation.
type BillingData struct {
	Apartment      string `json:"apartment"`
	Email          string `json:"email"`
	Floor          string `json:"floor"`
	FirstName      string `json:"first_name"`
	Street         string `json:"street"`
	Building       string `json:"building"`
	PhoneNumber    string `json:"phone_number"`
	ShippingMethod string `json:"shipping_method"`
	PostalCode     string `json:"postal_code"`
	City           string `json:"city"`
	Country        string `json:"country"`
	LastName       string `json:"last_name"`
	State          string `json:"state"`
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

func (s *Service) post(path string, body any) (map[string]any, error) {
	url := s.baseURL + path
	b, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	fmt.Printf("[paymob] POST %s\n", url)
	resp, err := http.Post(url, "application/json", bytes.NewReader(b))
	if err != nil {
		fmt.Printf("[paymob] POST %s → network error: %v\n", url, err)
		return nil, fmt.Errorf("paymob %s: %w", path, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("paymob %s: read body: %w", path, err)
	}
	fmt.Printf("[paymob] POST %s → HTTP %d: %s\n", url, resp.StatusCode, raw)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("paymob %s: HTTP %d: %s", path, resp.StatusCode, raw)
	}
	var result map[string]any
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("paymob %s: decode response: %w", path, err)
	}
	return result, nil
}

// Package email sends transactional email — via Gmail SMTP if configured
// (lets you send as a real @gmail.com address you own), else via the Resend
// API, else it just logs the email. Safe to run in dev with nothing
// configured; ready to go live the moment either is set.
package email

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/smtp"
	"strings"
)

type Service struct {
	// Resend
	apiKey string
	from   string
	// Gmail SMTP — takes priority over Resend when host is set
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
}

func NewService(apiKey, from, smtpHost, smtpPort, smtpUser, smtpPassword string) *Service {
	return &Service{
		apiKey:       apiKey,
		from:         from,
		smtpHost:     smtpHost,
		smtpPort:     smtpPort,
		smtpUser:     smtpUser,
		smtpPassword: smtpPassword,
	}
}

// Send delivers an HTML email. Errors are logged, not returned — a failed
// transactional email (e.g. order confirmation) should never break the
// request that triggered it.
func (s *Service) Send(to, subject, html string) {
	switch {
	case s.smtpHost != "":
		s.sendSMTP(to, subject, html)
	case s.apiKey != "":
		s.sendResend(to, subject, html)
	default:
		log.Printf("[email] no email provider configured — would send %q to %s\n---\n%s\n---", subject, to, html)
	}
}

// ── Gmail SMTP ─────────────────────────────────────────────────────────────

func (s *Service) sendSMTP(to, subject, html string) {
	addr := s.smtpHost + ":" + s.smtpPort

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		s.smtpUser, to, subject, html,
	)

	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: s.smtpHost})
	var client *smtp.Client
	if err != nil {
		// Fall back to STARTTLS on the plain-then-upgrade port (587)
		client, err = smtp.Dial(addr)
		if err != nil {
			log.Printf("[email] smtp dial %s failed: %v", addr, err)
			return
		}
		if err := client.StartTLS(&tls.Config{ServerName: s.smtpHost}); err != nil {
			log.Printf("[email] smtp starttls failed: %v", err)
			return
		}
	} else {
		client, err = smtp.NewClient(conn, s.smtpHost)
		if err != nil {
			log.Printf("[email] smtp client failed: %v", err)
			return
		}
	}
	defer client.Close()

	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)
	if err := client.Auth(auth); err != nil {
		log.Printf("[email] smtp auth failed: %v", err)
		return
	}
	if err := client.Mail(s.smtpUser); err != nil {
		log.Printf("[email] smtp MAIL FROM failed: %v", err)
		return
	}
	if err := client.Rcpt(to); err != nil {
		log.Printf("[email] smtp RCPT TO failed: %v", err)
		return
	}
	w, err := client.Data()
	if err != nil {
		log.Printf("[email] smtp DATA failed: %v", err)
		return
	}
	defer w.Close()
	if _, err := w.Write([]byte(msg)); err != nil {
		log.Printf("[email] smtp write failed: %v", err)
		return
	}
	log.Printf("[email] sent %q to %s via Gmail SMTP", subject, to)
}

// ── Resend ─────────────────────────────────────────────────────────────────

func (s *Service) sendResend(to, subject, html string) {
	body := map[string]any{
		"from":    s.from,
		"to":      []string{to},
		"subject": subject,
		"html":    html,
	}
	b, err := json.Marshal(body)
	if err != nil {
		log.Printf("[email] marshal failed: %v", err)
		return
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(b))
	if err != nil {
		log.Printf("[email] request build failed: %v", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("[email] send to %s failed: %v", to, err)
		return
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		log.Printf("[email] send to %s failed: HTTP %d: %s", to, resp.StatusCode, strings.TrimSpace(string(raw)))
		return
	}
	log.Printf("[email] sent %q to %s via Resend", subject, to)
}

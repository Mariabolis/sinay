package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PasswordReset is a one-time-use token for the forgot-password flow.
// TokenHash stores sha256(raw token) — the raw token only ever exists in
// the email link, never in the database.
type PasswordReset struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	TokenHash string    `gorm:"type:varchar(64);uniqueIndex;not null"`
	ExpiresAt time.Time `gorm:"type:timestamptz;not null"`
	Used      bool      `gorm:"not null;default:false"`
	CreatedAt time.Time `gorm:"type:timestamptz;not null;autoCreateTime"`
}

func (p *PasswordReset) BeforeCreate(_ *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

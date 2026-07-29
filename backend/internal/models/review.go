package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Review is one customer's rating + comment on a product. One per user per
// product — resubmitting updates the existing row instead of creating a new one.
type Review struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	ProductID uuid.UUID `gorm:"type:uuid;not null"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	Rating    int       `gorm:"not null"` // 1–5
	Comment   string    `gorm:"type:text"`
	CreatedAt time.Time `gorm:"type:timestamptz;not null;autoCreateTime"`

	Product *Product `gorm:"foreignKey:ProductID"`
	User    *User    `gorm:"foreignKey:UserID"`
}

func (r *Review) BeforeCreate(_ *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

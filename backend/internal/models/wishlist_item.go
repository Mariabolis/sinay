package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WishlistItem struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	ProductID uuid.UUID `gorm:"type:uuid;not null"`
	CreatedAt time.Time `gorm:"type:timestamptz;not null;autoCreateTime"`

	Product *Product `gorm:"foreignKey:ProductID"`
}

func (w *WishlistItem) BeforeCreate(_ *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

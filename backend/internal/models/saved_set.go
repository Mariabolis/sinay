package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SavedSet struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID          uuid.UUID `gorm:"type:uuid;not null"`
	TopVariantID    uuid.UUID `gorm:"type:uuid;not null"`
	BottomVariantID uuid.UUID `gorm:"type:uuid;not null"`
	CreatedAt       time.Time `gorm:"type:timestamptz;not null;autoCreateTime"`

	TopVariant    *ProductVariant `gorm:"foreignKey:TopVariantID"`
	BottomVariant *ProductVariant `gorm:"foreignKey:BottomVariantID"`
}

func (s *SavedSet) BeforeCreate(_ *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

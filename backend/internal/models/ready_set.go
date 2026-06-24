package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReadySet struct {
	ID              uuid.UUID       `gorm:"type:uuid;primaryKey"`
	Name            string          `gorm:"type:varchar(255);not null"`
	TopVariantID    uuid.UUID       `gorm:"type:uuid;not null"`
	BottomVariantID uuid.UUID       `gorm:"type:uuid;not null"`
	Price           float64         `gorm:"type:numeric(10,2);not null"`
	IsActive        bool            `gorm:"not null;default:true"`
	CreatedAt       time.Time
	TopVariant      *ProductVariant `gorm:"foreignKey:TopVariantID"`
	BottomVariant   *ProductVariant `gorm:"foreignKey:BottomVariantID"`
}

func (rs *ReadySet) BeforeCreate(tx *gorm.DB) error {
	if rs.ID == uuid.Nil {
		rs.ID = uuid.New()
	}
	return nil
}

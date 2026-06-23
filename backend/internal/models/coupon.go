package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Coupon struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey"`
	Code      string     `gorm:"type:varchar(50);uniqueIndex;not null"`
	Type      string     `gorm:"type:varchar(20);not null"` // percent | fixed
	Value     float64    `gorm:"type:numeric(10,2);not null"`
	Active    bool       `gorm:"default:true"`
	ExpiresAt *time.Time `gorm:"type:timestamptz"`
}

func (c *Coupon) BeforeCreate(_ *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Coupon struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey"`
	Code          string     `gorm:"type:varchar(50);uniqueIndex;not null"`
	Type          string     `gorm:"type:varchar(20);not null"` // percent | fixed
	Value         float64    `gorm:"type:numeric(10,2);not null"`
	Active        bool       `gorm:"default:true"`
	ExpiresAt     *time.Time `gorm:"type:timestamptz"`
	MinOrderValue *float64   `gorm:"type:numeric(10,2)"`
	UsageLimit    *int       `gorm:"type:int"`
	TimesUsed     int        `gorm:"not null;default:0"`
	CreatedAt     time.Time  `gorm:"type:timestamptz;not null;autoCreateTime"`
}

func (c *Coupon) BeforeCreate(_ *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

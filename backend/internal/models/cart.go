package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Cart struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID     *uuid.UUID `gorm:"type:uuid"` // nullable for guest carts
	SessionID  *string    `gorm:"type:varchar(255)"`
	CouponCode *string    `gorm:"type:varchar(50)"`
	Discount   float64    `gorm:"type:numeric(10,2);default:0"`
	CreatedAt  time.Time  `gorm:"type:timestamptz;not null;autoCreateTime"`

	User  *User      `gorm:"foreignKey:UserID"`
	Items []CartItem `gorm:"foreignKey:CartID"`
}

func (c *Cart) BeforeCreate(_ *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

type CartItem struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey"`
	CartID    uuid.UUID  `gorm:"type:uuid;not null"`
	VariantID uuid.UUID  `gorm:"type:uuid;not null"`
	Quantity  int        `gorm:"not null;default:1"`
	SetID     *uuid.UUID `gorm:"type:uuid"` // links top+bottom built together; null if bought alone
	UnitPrice float64    `gorm:"type:numeric(10,2);not null"`

	Cart    *Cart           `gorm:"foreignKey:CartID"`
	Variant *ProductVariant `gorm:"foreignKey:VariantID"`
}

func (ci *CartItem) BeforeCreate(_ *gorm.DB) error {
	if ci.ID == uuid.Nil {
		ci.ID = uuid.New()
	}
	return nil
}

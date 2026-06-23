package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Order struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID      *uuid.UUID `gorm:"type:uuid"`
	AddressID   *uuid.UUID `gorm:"type:uuid"`
	Status        string     `gorm:"type:varchar(30);not null;default:'pending'"` // pending|paid|processing|shipped|delivered|cancelled
	PaymentMethod string     `gorm:"type:varchar(10);not null;default:'card'"`    // card|cod
	Subtotal      float64    `gorm:"type:numeric(10,2);not null"`
	Discount    float64    `gorm:"type:numeric(10,2);default:0"`
	ShippingFee float64    `gorm:"type:numeric(10,2);default:0"`
	Total       float64    `gorm:"type:numeric(10,2);not null"`
	CouponCode  *string    `gorm:"type:varchar(50)"`
	CreatedAt   time.Time  `gorm:"type:timestamptz;not null;autoCreateTime"`

	User    *User       `gorm:"foreignKey:UserID"`
	Address *Address    `gorm:"foreignKey:AddressID"`
	Items   []OrderItem `gorm:"foreignKey:OrderID"`
	Payment *Payment    `gorm:"foreignKey:OrderID"`
}

func (o *Order) BeforeCreate(_ *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}

type OrderItem struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey"`
	OrderID   uuid.UUID  `gorm:"type:uuid;not null"`
	VariantID uuid.UUID  `gorm:"type:uuid;not null"`
	SetID     *uuid.UUID `gorm:"type:uuid"`
	Quantity  int        `gorm:"not null"`
	UnitPrice float64    `gorm:"type:numeric(10,2);not null"`

	Order   *Order          `gorm:"foreignKey:OrderID"`
	Variant *ProductVariant `gorm:"foreignKey:VariantID"`
}

func (oi *OrderItem) BeforeCreate(_ *gorm.DB) error {
	if oi.ID == uuid.Nil {
		oi.ID = uuid.New()
	}
	return nil
}

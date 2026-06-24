package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Product is a top, bottom, or pre-bundled set.
type Product struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	Slug        string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	Name        string    `gorm:"type:varchar(255);not null"`
	Type        string    `gorm:"type:varchar(20);not null"` // top | bottom | set
	Style       string    `gorm:"type:varchar(30);not null"` // classic_short_sleeve | sleeveless | relaxed_shirt | shorts | bermuda | wide_leg
	Description *string   `gorm:"type:text"`
	Fabric      *string   `gorm:"type:varchar(100)"`
	CareNotes   *string   `gorm:"type:text"`
	BasePrice   float64   `gorm:"type:numeric(10,2);not null"`
	IsActive    bool      `gorm:"default:true"`
	CreatedAt   time.Time `gorm:"type:timestamptz;not null;autoCreateTime"`

	Variants []ProductVariant `gorm:"foreignKey:ProductID"`
	Images   []ProductImage   `gorm:"foreignKey:ProductID"`
}

func (p *Product) BeforeCreate(_ *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// ProductVariant is a color × size sellable unit with its own stock and SKU.
type ProductVariant struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey"`
	ProductID     uuid.UUID  `gorm:"type:uuid;not null"`
	ColorName     string     `gorm:"type:varchar(50);not null"`
	ColorHex      string     `gorm:"type:varchar(7);not null"`
	Size          string     `gorm:"type:varchar(10);not null"`
	SKU           string     `gorm:"column:sku;type:varchar(100);uniqueIndex;not null"`
	PriceOverride *float64   `gorm:"type:numeric(10,2)"`
	StockQuantity int        `gorm:"not null;default:0"`
	ImageURL      *string    `gorm:"type:varchar(500)"`

	Product *Product `gorm:"foreignKey:ProductID"`
	Images  []ProductImage `gorm:"foreignKey:VariantID"`
}

func (v *ProductVariant) BeforeCreate(_ *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

type ProductImage struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey"`
	ProductID uuid.UUID  `gorm:"type:uuid;not null"`
	VariantID *uuid.UUID `gorm:"type:uuid"` // nullable: image may be color-specific
	URL       string     `gorm:"type:varchar(500);not null"`
	Position  int        `gorm:"default:0"`

	Product *Product        `gorm:"foreignKey:ProductID"`
	Variant *ProductVariant `gorm:"foreignKey:VariantID"`
}

func (i *ProductImage) BeforeCreate(_ *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Payment struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey"`
	OrderID       uuid.UUID      `gorm:"type:uuid;not null"`
	Provider      string         `gorm:"type:varchar(30);not null;default:'paymob'"`
	PaymobOrderID *string        `gorm:"type:varchar(100)"`
	TransactionID *string        `gorm:"type:varchar(100)"`
	Status        string         `gorm:"type:varchar(30);not null;default:'initiated'"` // initiated|success|failed|refunded
	Amount        float64        `gorm:"type:numeric(10,2);not null"`
	RawCallback   datatypes.JSON `gorm:"type:jsonb"` // full Paymob webhook payload for audit
	CreatedAt     time.Time      `gorm:"type:timestamptz;not null;autoCreateTime"`

	Order *Order `gorm:"foreignKey:OrderID"`
}

func (p *Payment) BeforeCreate(_ *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

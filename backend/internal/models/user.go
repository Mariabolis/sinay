package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	Email        string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	PasswordHash string    `gorm:"type:varchar(255);not null"`
	FullName     *string   `gorm:"type:varchar(255)"`
	Phone        *string   `gorm:"type:varchar(50)"`
	Role         string    `gorm:"type:varchar(20);not null;default:'customer'"`
	CreatedAt    time.Time `gorm:"type:timestamptz;not null;autoCreateTime"`

	Addresses []Address `gorm:"foreignKey:UserID"`
	Carts     []Cart    `gorm:"foreignKey:UserID"`
	Orders    []Order   `gorm:"foreignKey:UserID"`
}

func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

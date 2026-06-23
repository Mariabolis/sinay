package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Address struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID      *uuid.UUID `gorm:"type:uuid"`
	Label       *string    `gorm:"type:varchar(50)"`
	FullName    *string    `gorm:"type:varchar(255)"`
	Phone       *string    `gorm:"type:varchar(50)"`
	Governorate *string    `gorm:"type:varchar(100)"`
	City        *string    `gorm:"type:varchar(100)"`
	Street      *string    `gorm:"type:varchar(255)"`
	Building    *string    `gorm:"type:varchar(100)"`
	Notes       *string    `gorm:"type:varchar(255)"`
	IsDefault   bool       `gorm:"default:false"`

	User *User `gorm:"foreignKey:UserID"`
}

func (a *Address) BeforeCreate(_ *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

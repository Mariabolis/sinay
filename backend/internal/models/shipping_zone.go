package models

type ShippingZone struct {
	Governorate string  `gorm:"primaryKey;type:varchar(100)" json:"governorate"`
	Fee         float64 `gorm:"type:numeric(10,2);not null;default:75" json:"fee"`
}

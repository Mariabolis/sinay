package models

type Setting struct {
	Key   string `gorm:"primaryKey;type:varchar(100)" json:"key"`
	Value string `gorm:"type:text;not null"           json:"value"`
}

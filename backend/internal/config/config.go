package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	DBSSLMode     string
	// Server
	ServerPort    string
	MigrationsDir string
	// Auth
	JWTSecret     string
	// CORS — comma-separated list of allowed origins
	CORSOrigins   string
	// Paymob
	PaymobBaseURL    string
	PaymobAPIKey     string
	PaymobIntID      string
	PaymobIframeID   string
	PaymobHMACSecret string
	// Cloudinary
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
}

func Load() *Config {
	// Overload ensures .env values always win over any pre-existing shell env vars
	// (godotenv.Load skips keys that are already set, which can cause DB_NAME to
	// fall through to an empty value when the shell has PG* vars set by Homebrew).
	if err := godotenv.Overload(); err != nil {
		log.Println("no .env file found, reading from environment")
	}

	return &Config{
		DBHost:           getEnv("DB_HOST", "localhost"),
		DBPort:           getEnv("DB_PORT", "5432"),
		DBUser:           getEnv("DB_USER", "postgres"),
		DBPassword:       getEnv("DB_PASSWORD", ""),
		DBName:           getEnv("DB_NAME", "sinay"),
		DBSSLMode:        getEnv("DB_SSLMODE", "disable"),
		ServerPort:       getEnv("SERVER_PORT", "8081"),
		MigrationsDir:    getEnv("MIGRATIONS_DIR", "migrations"),
		JWTSecret:        getEnv("JWT_SECRET", ""),
		CORSOrigins:      getEnv("CORS_ORIGINS", "http://localhost:5173"),
		PaymobBaseURL:    getEnv("PAYMOB_BASE_URL", "https://accept.paymob.com/api"),
		PaymobAPIKey:     getEnv("PAYMOB_API_KEY", ""),
		PaymobIntID:      getEnv("PAYMOB_INTEGRATION_ID", ""),
		PaymobIframeID:   getEnv("PAYMOB_IFRAME_ID", ""),
		PaymobHMACSecret:    getEnv("PAYMOB_HMAC_SECRET", ""),
		CloudinaryCloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryAPIKey:    getEnv("CLOUDINARY_API_KEY", ""),
		CloudinaryAPISecret: getEnv("CLOUDINARY_API_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

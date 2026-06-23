package db

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"sinay/backend/internal/config"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	// URL-format DSN is unambiguous: the database name is the URL path segment
	// and cannot be shadowed by PGDATABASE or other PG* shell env vars.
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s&TimeZone=UTC",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}

	return db, nil
}

// RunMigrations applies any unapplied *.sql files from migrationsDir in
// lexicographic order. Applied filenames are tracked in schema_migrations.
func RunMigrations(db *gorm.DB, migrationsDir string) error {
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`).Error; err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("read migrations dir %q: %w", migrationsDir, err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && filepath.Ext(e.Name()) == ".sql" {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, filename := range files {
		var count int64
		db.Raw("SELECT COUNT(*) FROM schema_migrations WHERE filename = ?", filename).Scan(&count)
		if count > 0 {
			log.Printf("migration already applied: %s", filename)
			continue
		}

		content, err := os.ReadFile(filepath.Join(migrationsDir, filename))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", filename, err)
		}

		if err := db.Exec(string(content)).Error; err != nil {
			return fmt.Errorf("apply migration %s: %w", filename, err)
		}

		if err := db.Exec("INSERT INTO schema_migrations (filename) VALUES (?)", filename).Error; err != nil {
			return fmt.Errorf("record migration %s: %w", filename, err)
		}

		log.Printf("applied migration: %s", filename)
	}

	return nil
}

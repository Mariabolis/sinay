package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"sinay/backend/internal/config"
	"sinay/backend/internal/db"
	"sinay/backend/internal/handlers"
	"sinay/backend/internal/middleware"
	"sinay/backend/internal/services/payment"
)

func main() {
	cfg := config.Load()
	log.Printf("connecting to DB: host=%s port=%s user=%s dbname=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBName)

	if cfg.JWTSecret == "" {
		log.Println("WARNING: JWT_SECRET not set — using insecure dev default")
		cfg.JWTSecret = "dev-secret-change-in-production"
	}

	database, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	if err := db.RunMigrations(database, cfg.MigrationsDir); err != nil {
		log.Fatalf("migrations failed: %v", err)
	}

	r := gin.Default()
	r.Use(middleware.CORS(cfg.CORSOrigins))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	log.Printf("paymob base URL: %s  integration_id=%s  iframe_id=%s",
		cfg.PaymobBaseURL, cfg.PaymobIntID, cfg.PaymobIframeID)
	paymobSvc := payment.NewService(
		cfg.PaymobBaseURL,
		cfg.PaymobAPIKey,
		cfg.PaymobIntID,
		cfg.PaymobIframeID,
		cfg.PaymobHMACSecret,
	)

	authHandler          := handlers.NewAuthHandler(database, cfg)
	productHandler       := handlers.NewProductHandler(database)
	cartHandler          := handlers.NewCartHandler(database)
	checkoutHandler      := handlers.NewCheckoutHandler(database, paymobSvc)
	addressHandler       := handlers.NewAddressHandler(database)
	callbackHandler      := handlers.NewPaymentCallbackHandler(database, paymobSvc)
	adminDashHandler     := handlers.NewAdminDashboardHandler(database)
	adminProductHandler  := handlers.NewAdminProductHandler(database)
	adminOrderHandler    := handlers.NewAdminOrderHandler(database)
	adminCouponHandler   := handlers.NewAdminCouponHandler(database)

	requireAuth := middleware.AuthRequired(database, cfg.JWTSecret)

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		auth.POST("/register", authHandler.Register)
		auth.POST("/login",    authHandler.Login)
		auth.POST("/refresh",  authHandler.Refresh)
		auth.GET("/me", requireAuth, authHandler.Me)

		api.GET("/products",       productHandler.List)
		api.GET("/products/:slug", productHandler.Get)
		api.GET("/colors",         productHandler.Colors)

		cart := api.Group("/cart")
		cart.Use(middleware.OptionalAuth(cfg.JWTSecret))
		{
			cart.GET("",              cartHandler.Get)
			cart.POST("/sets",        cartHandler.AddSet)
			cart.POST("/items",       cartHandler.AddItem)
			cart.PUT("/items/:id",    cartHandler.UpdateItem)
			cart.DELETE("/items/:id", cartHandler.RemoveItem)
			cart.POST("/coupon",      cartHandler.ApplyCoupon)
			cart.DELETE("/coupon",    cartHandler.RemoveCoupon)
		}

		// Auth-required routes
		api.POST("/checkout",      requireAuth, checkoutHandler.Checkout)
		api.GET("/orders/:id",     requireAuth, checkoutHandler.GetOrder)
		api.GET("/addresses",      requireAuth, addressHandler.List)
		api.POST("/addresses",     requireAuth, addressHandler.Create)
		api.DELETE("/addresses/:id", requireAuth, addressHandler.Delete)

		// Paymob callback — public, but HMAC-verified inside the handler
		api.POST("/payments/paymob/callback", callbackHandler.PaymobCallback)

		// ── Admin routes (AdminRequired = auth + role=admin) ──────────────────
		adminMW := middleware.AdminRequired(database, cfg.JWTSecret)
		admin   := api.Group("/admin")
		admin.Use(adminMW)
		{
			admin.GET("/dashboard/summary", adminDashHandler.Summary)

			admin.GET("/products",                    adminProductHandler.List)
			admin.POST("/products",                   adminProductHandler.Create)
			admin.PUT("/products/:id",                adminProductHandler.Update)
			admin.POST("/products/:id/variants",      adminProductHandler.CreateVariant)
			admin.PUT("/variants/:id",                adminProductHandler.UpdateVariant)

			admin.GET("/orders",                      adminOrderHandler.List)
			admin.PUT("/orders/:id/status",           adminOrderHandler.UpdateStatus)

			admin.GET("/coupons",                     adminCouponHandler.List)
			admin.POST("/coupons",                    adminCouponHandler.Create)
			admin.PATCH("/coupons/:id/toggle",        adminCouponHandler.Toggle)
		}
	}

	log.Println("registered routes:")
	for _, info := range r.Routes() {
		log.Printf("  %-7s %s", info.Method, info.Path)
	}

	log.Printf("server listening on :%s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

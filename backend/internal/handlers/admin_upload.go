package handlers

import (
	"context"
	"net/http"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	cld *cloudinary.Cloudinary
}

func NewUploadHandler(cloudName, apiKey, apiSecret string) (*UploadHandler, error) {
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, err
	}
	return &UploadHandler{cld: cld}, nil
}

// POST /api/admin/upload
// Accepts multipart/form-data with field "file".
// Returns { "url": "<secure_url>" }
func (h *UploadHandler) Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file field required"})
		return
	}
	defer file.Close()

	// Reject files over 10 MB
	if header.Size > 10<<20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large (max 10 MB)"})
		return
	}

	resp, err := h.cld.Upload.Upload(context.Background(), file, uploader.UploadParams{
		Folder: "sinay/products",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "upload failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": resp.SecureURL})
}

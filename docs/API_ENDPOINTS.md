# API Endpoints Documentation

## Base URL
```
http://localhost:9099/api
```

> **Note**: This API is designed for internal factory use (2-3 users). All endpoints return JSON and support CORS for local development.

## 📦 Categories (颜色分类)

### GET /api/categories
Get all color categories
```json
Response: [
  { "id": 1, "name": "蓝色系", "code": "BU" },
  { "id": 2, "name": "绿色系", "code": "GR" }
]
```

### POST /api/categories
Create new category
```json
Request: { "name": "红色系", "code": "RD" }
Response: { "id": 3, "name": "红色系", "code": "RD" }
```

## 🎨 Custom Colors (自配色)

### GET /api/custom-colors
Get all custom colors with formulas
```json
Response: [
  {
    "id": 1,
    "color_code": "BU001",
    "name": "天空蓝",
    "formula": "钛白 50g 群青 20g",
    "category_id": 1,
    "image_path": "uploads/xxx.jpg"
  }
]
```

### POST /api/custom-colors
Create new color (multipart/form-data)
- Fields: color_code, name, formula, category_id, applicable_layers
- File: image (optional)

### PUT /api/custom-colors/:id
Update existing color (multipart/form-data)

### DELETE /api/custom-colors/:id
Delete color (checks for references first)

## 🖼️ Artworks (作品)

### GET /api/artworks
Get all artworks with their color schemes
```json
Response: [
  {
    "id": 1,
    "code": "A001",
    "name": "山水画",
    "schemes": [
      {
        "id": 1,
        "name": "方案1",
        "layers": [
          { "layer": 1, "color_code": "BU001" },
          { "layer": 2, "color_code": "GR002" }
        ]
      }
    ]
  }
]
```

### POST /api/artworks
Create new artwork
```json
Request: { "code": "A002", "name": "花鸟画" }
```

### POST /api/artworks/:artworkId/schemes
Add color scheme to artwork (multipart/form-data)
- Fields: name, layers (JSON string)
- File: thumbnail (optional)

### PUT /api/artworks/:artworkId/schemes/:schemeId
Update color scheme (multipart/form-data)

### DELETE /api/artworks/:id
Delete artwork (only if no schemes exist)

### DELETE /api/artworks/:artworkId/schemes/:schemeId
Delete specific color scheme

## 🎨 Mont-Marte Colors (原料)

### GET /api/mont-marte-colors
Get all raw material colors
```json
Response: [
  {
    "id": 1,
    "name": "钛白",
    "color_value": "#FFFFFF",
    "notes": "基础白色颜料"
  }
]
```

### POST /api/mont-marte-colors
Create new raw material (multipart/form-data)
- Fields: name, color_value, notes
- File: image (optional)

### PUT /api/mont-marte-colors/:id
Update raw material (multipart/form-data)

### DELETE /api/mont-marte-colors/:id
Delete raw material

## 🔄 Special Operations

### POST /api/custom-colors/force-merge
Force merge duplicate colors
```json
Request: {
  "keepId": 1,
  "removeIds": [2, 3],
  "signature": "hash-signature"
}
Response: {
  "updated": 5,  // References updated
  "deleted": 2   // Colors deleted
}
```

## 📝 Notes

1. **Image Upload**: All image endpoints accept multipart/form-data
2. **Error Handling**: All endpoints return appropriate HTTP status codes
3. **Caching**: GET requests are cached for 5 minutes on frontend
4. **Validation**: Server validates all required fields
5. **References**: Delete operations check for references before deletion

## 🔍 Common Response Codes

- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST
- `400 Bad Request` - Invalid data provided
- `404 Not Found` - Resource not found
- `409 Conflict` - Operation conflicts (e.g., duplicate code)
- `500 Internal Server Error` - Server error (check logs)
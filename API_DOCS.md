# Smart Trolley — API Documentation: Adding Items

This document covers all APIs related to adding items to the Smart Trolley system — from creating products in the inventory, starting a trolley session, to scanning items into a bill.

---

## 🔐 Authentication

Admin-protected endpoints require the following HTTP header:

```
x-admin-token: smarttrolley-admin-secret-token-2024
```

---

## 1. Add a Product to Inventory

**`POST /api/admin/products`**

Adds a new product to the database. Used by the admin to register products with barcodes.

### Request

| Field              | Type    | Required | Description                    |
|--------------------|---------|----------|--------------------------------|
| `barcode`          | string  | ✅       | Unique product barcode         |
| `name`             | string  | ✅       | Product name                   |
| `price`            | number  | ✅       | Price per unit (₹)             |
| `gst_percent`      | number  | ✅       | GST percentage (e.g. `18`)     |
| `discount_percent` | number  | ✅       | Discount percentage (e.g. `5`) |
| `weight_grams`     | number  | ✅       | Expected weight in grams       |
| `stock_qty`        | number  | ✅       | Available stock quantity       |

### Response — `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "barcode": "8901234567890",
    "name": "Amul Butter 100g",
    "price": 55,
    "gst_percent": 5,
    "discount_percent": 0,
    "weight_grams": 100,
    "stock_qty": 200,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Error Responses

| Status | Reason                          |
|--------|---------------------------------|
| `400`  | Missing or empty required field |
| `401`  | Invalid or missing admin token  |
| `500`  | Database error                  |

---

## 2. Start a Trolley Session

**`POST /api/session/start`**

Starts a new shopping session for a trolley. Must be called before any items can be scanned.

### Request

| Field             | Type   | Required | Description                  |
|-------------------|--------|----------|------------------------------|
| `trolley_id`      | string | ✅       | Unique ID of the trolley     |
| `customer_name`   | string | ✅       | Customer's name              |
| `customer_mobile` | string | ✅       | Customer's mobile number     |

### Response — `201 Created`

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-uuid",
      "trolley_id": "TROLLEY-01",
      "customer_name": "Ravi Kumar",
      "customer_mobile": "9876543210",
      "status": "active",
      "created_at": "2024-01-01T10:00:00Z"
    }
  }
}
```

### Error Responses

| Status | Reason                                     |
|--------|--------------------------------------------|
| `400`  | Missing required fields                    |
| `409`  | Trolley already has an active session      |
| `500`  | Server error                               |

---

## 3. Scan a Product (Add Item to Bill)

**`POST /api/scan`**

Called by the ESP32 when a barcode is scanned. Adds the product to the active session's bill. If the product is already in the bill, its quantity is incremented.

> ⚠️ Requires an active session for the given `trolley_id`.

### Request

| Field        | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| `trolley_id` | string | ✅       | The trolley's ID                     |
| `barcode`    | string | ✅       | Barcode of the product being scanned |

### Response — `201 Created` (new item) / `200 OK` (quantity updated)

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "product-uuid",
      "name": "Amul Butter 100g",
      "price": 55,
      "gst_percent": 5,
      "discount_percent": 0,
      "weight_grams": 100
    },
    "scanned_item": {
      "id": "item-uuid",
      "session_id": "session-uuid",
      "product_id": "product-uuid",
      "quantity": 1,
      "unit_price": 55,
      "gst_percent": 5,
      "discount_percent": 0,
      "gst_amount": 2.61,
      "discount_amount": 0,
      "subtotal": 57.61,
      "weight_expected": 100,
      "verified": false
    }
  }
}
```

### Error Responses

| Status | Reason                                  |
|--------|-----------------------------------------|
| `400`  | Missing fields or product out of stock  |
| `404`  | No active session / product not found   |
| `500`  | Server error                            |

---

## 🖥️ CMD Test Commands

> Replace `YOUR_SESSION_ID` with the actual session UUID returned from `/api/session/start`.

---

### 1. Add Product to Inventory

#### Localhost
```cmd
curl -X POST http://localhost:3000/api/admin/products ^
  -H "Content-Type: application/json" ^
  -H "x-admin-token: smarttrolley-admin-secret-token-2024" ^
  -d "{\"barcode\":\"8901234567890\",\"name\":\"Amul Butter 100g\",\"price\":55,\"gst_percent\":5,\"discount_percent\":0,\"weight_grams\":100,\"stock_qty\":200}"
```

#### Vercel (Production)
```cmd
curl -X POST https://smart-trolley-nine.vercel.app/api/admin/products ^
  -H "Content-Type: application/json" ^
  -H "x-admin-token: smarttrolley-admin-secret-token-2024" ^
  -d "{\"barcode\":\"8901234567890\",\"name\":\"Amul Butter 100g\",\"price\":55,\"gst_percent\":5,\"discount_percent\":0,\"weight_grams\":100,\"stock_qty\":200}"
```

---

### 2. Start a Session

#### Localhost
```cmd
curl -X POST http://localhost:3000/api/session/start ^
  -H "Content-Type: application/json" ^
  -d "{\"trolley_id\":\"TROLLEY-01\",\"customer_name\":\"Ravi Kumar\",\"customer_mobile\":\"9876543210\"}"
```

#### Vercel (Production)
```cmd
curl -X POST https://smart-trolley-nine.vercel.app/api/session/start ^
  -H "Content-Type: application/json" ^
  -d "{\"trolley_id\":\"TROLLEY-01\",\"customer_name\":\"Ravi Kumar\",\"customer_mobile\":\"9876543210\"}"
```

---

### 3. Scan a Product (Add Item to Bill)

#### Localhost
```cmd
curl -X POST http://localhost:3000/api/scan ^
  -H "Content-Type: application/json" ^
  -d "{\"trolley_id\":\"T001\",\"barcode\":\"8901491506045\"}"
```

#### Vercel (Production)
```cmd
curl -X POST https://smart-trolley-nine.vercel.app/api/scan ^
  -H "Content-Type: application/json" ^
  -d "{\"trolley_id\":\"T001\",\"barcode\":\"8901491506045\"}"
```

---

### 4. View Bill for a Session

#### Localhost
```cmd
curl http://localhost:3000/api/bill/YOUR_SESSION_ID
```

#### Vercel (Production)
```cmd
curl https://smart-trolley-nine.vercel.app/api/bill/YOUR_SESSION_ID
```

---

## 🔄 Typical Flow for Adding an Item

```
1. [Admin] POST /api/admin/products   → Register product in DB
2. [ESP32/App] POST /api/session/start → Get session_id
3. [ESP32] POST /api/scan             → Scan barcode → Item added to bill
4. [App] GET /api/bill/{session_id}   → View current bill
```

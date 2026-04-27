# Smart Trolley — Complete API Reference

> **Base URL (production):** `https://smart-trolley-nine.vercel.app`
> **Base URL (local dev):** `http://localhost:3000`
>
> All responses follow the shape:
> ```json
> { "success": true,  "data": { ... } }   // on success
> { "success": false, "error": "..." }     // on failure
> ```

---

## Special Barcode Values (Hardware)

These barcodes are intercepted by `/api/scan` **before** any product lookup.
They control the trolley — they do NOT add/remove items.

| Barcode String | Action |
|---|---|
| `Add` | Switches trolley to **ADD mode** (green) |
| `MODE_REMOVE` | Switches trolley to **REMOVE mode** (red) |
| `Checkout` | Initiates **checkout** — freezes cart, generates UPI QR |

---

## Session Status Lifecycle

```
active  →  checkout  →  paid
  ↑____________|
  (cancel checkout resets to active)
```

| Status | Meaning |
|---|---|
| `active` | Customer is shopping — items can be scanned |
| `checkout` | Checkout initiated — cart frozen, UPI QR displayed |
| `paid` | Payment confirmed — receipt generated |

---

## 1. Customer Flow APIs

### `POST /api/session/start`
**Called by:** Customer login page (website)

Starts a new shopping session for a trolley. Fails with `409` if the trolley already has an active session.

**Request body:**
```json
{
  "trolley_id": "T001",
  "customer_name": "Naman Jain",
  "customer_mobile": "9876543210"
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "trolley_id": "T001",
    "customer_name": "Naman Jain",
    "status": "active",
    "created_at": "2026-04-22T..."
  }
}
```

---

### `POST /api/scan`
**Called by:** ESP32-CAM (Arduino) on every barcode scan

The **central hub** of the trolley. Every barcode from the scanner goes here.
The server decides what to do based on the barcode value and current mode.

**Request body:**
```json
{ "trolley_id": "T001", "barcode": "<scanned-value>" }
```

**Logic flow:**
```
barcode === "Add"         → switch to ADD mode
barcode === "MODE_REMOVE" → switch to REMOVE mode
barcode === "Checkout"    → initiate checkout (generate UPI, freeze cart)
otherwise:
  mode === ADD    → add product to cart (or increment qty)
  mode === REMOVE → remove product from cart (or decrement qty)
```

**Response — mode switch:**
```json
{ "mode_switched": true, "mode": "ADD", "message": "Switched to ADD mode" }
```

**Response — checkout initiated:**
```json
{
  "checkout_initiated": true,
  "session_id": "uuid",
  "upiLink": "upi://pay?pa=8815987007@ybl&...",
  "totals": { "subtotal": 120.00, "totalDiscount": 0, "totalGst": 6.00, "grandTotal": 126.00 },
  "message": "Checkout initiated — scan QR code to pay"
}
```

**Response — product scanned (ADD mode):**
```json
{
  "product": { "id": "uuid", "name": "Amul Milk 1L", "price": 60.00, "gst_percent": 5, "discount_percent": 0, "weight_grams": 1000 },
  "scanned_item": { "id": "uuid", "quantity": 2, "subtotal": 126.00 },
  "action": "added",
  "mode": "ADD"
}
```

**Response — product scanned (REMOVE mode):**
```json
{
  "product": { "id": "uuid", "name": "Amul Milk 1L", "price": 60.00 },
  "scanned_item": { ... },
  "action": "decremented",
  "mode": "REMOVE"
}
```

---

### `GET /api/mode?trolley_id=T001`
**Called by:** Billing page (website) — polled every **2 seconds**

Returns the current scan mode so the UI can show the green (ADD) or red (REMOVE) mode banner in real time.

**Response:**
```json
{ "mode": "ADD", "trolley_id": "T001" }
```

---

### `GET /api/bill/[sessionId]`
**Called by:** Billing page (website) — polled every **3 seconds**

Returns the full live cart for a session — all items, quantities, prices, GST, discounts, grand total, and the UPI payment link.

**Response:**
```json
{
  "session": { "id": "uuid", "status": "active", "customer_name": "Naman Jain", "trolley_id": "T001" },
  "items": [
    {
      "id": "uuid",
      "quantity": 2,
      "unit_price": 60.00,
      "gst_percent": 5,
      "discount_percent": 0,
      "gst_amount": 6.00,
      "discount_amount": 0.00,
      "subtotal": 126.00,
      "verified": true,
      "products": { "name": "Amul Milk 1L", "barcode": "8901234567890" }
    }
  ],
  "totals": { "subtotal": 120.00, "totalDiscount": 0, "totalGst": 6.00, "grandTotal": 126.00 },
  "upiLink": "upi://pay?pa=8815987007@ybl&..."
}
```

---

### `DELETE /api/bill/[sessionId]`
**Called by:** Billing page "✕ Remove" button (website)

Manually removes a scanned item from the cart via the UI button (not barcode-based).

**Request body:**
```json
{ "item_id": "uuid" }
```

**Response:**
```json
{ "message": "Item removed from bill" }
```

---

### `POST /api/remove`
**Called by:** Internally by `/api/scan` when in REMOVE mode (also callable directly)

Removes one unit of a product from the cart.
- qty > 1 → decrements by 1, recalculates subtotal/GST/discount
- qty == 1 → deletes the cart row entirely

**Request body:**
```json
{ "trolley_id": "T001", "barcode": "8901234567890" }
```

**Response:**
```json
{
  "product": { "id": "uuid", "name": "Amul Milk 1L", "price": 60.00 },
  "action": "decremented",
  "mode": "REMOVE"
}
```

---

### `POST /api/weight`
**Called by:** ESP32 load cell sensor (Arduino hardware)

Verifies a scanned item was physically placed in the trolley by comparing the measured weight to the product's expected weight (±15% tolerance). Updates the `verified` flag on the cart row.

**Request body:**
```json
{ "trolley_id": "T001", "weight_grams": 980 }
```

**Response:**
```json
{
  "verified": true,
  "weight_received": 980,
  "weight_expected": 1000,
  "message": "Item weight verified successfully"
}
```
> If weight is outside ±15%, `verified` is `false` and the item stays flagged as unverified.

---

## 2. Checkout & Payment APIs

### `POST /api/payment/generate`
**Called by:** Payment page (website) when customer clicks "Proceed to Pay" — also called internally by `/api/scan` when `Checkout` barcode is scanned

Calculates the final bill, generates a UPI deep link, marks session status as `checkout`, and creates a pending payment record.

**Request body:**
```json
{ "session_id": "uuid" }
```

**Response:**
```json
{
  "upiLink": "upi://pay?pa=8815987007@ybl&pn=SmartStore&am=126.00&cu=INR&tn=Bill-abc12345",
  "totals": { "subtotal": 120.00, "totalDiscount": 0, "totalGst": 6.00, "grandTotal": 126.00 },
  "payment": { "id": "uuid", "session_id": "uuid", "amount": 126.00, "status": "pending" }
}
```

---

### `POST /api/payment/confirm`
**Called by:** Payment page "✅ Payment Done — Confirm" button (website)

Finalises the payment — marks payment as `paid`, marks session as `paid`, sends receipt email, and decrements stock for all purchased items.

**Request body:**
```json
{ "session_id": "uuid", "upi_txn_id": "123456789012" }
```

**Response:**
```json
{
  "payment": { "status": "paid", "paid_at": "2026-04-22T..." },
  "message": "Payment confirmed successfully!"
}
```

---

### `GET /api/checkout-status?trolley_id=T001`
**Called by:** Arduino LCD sketch (`codes.ino`) — polled every **3 seconds**

Lightweight endpoint for the ILI9341 TFT LCD. Returns session status + UPI link so the LCD knows which screen to display.

| Session status | LCD displays |
|---|---|
| `active` | Idle "Scan items to shop" screen |
| `checkout` | Checkout screen with UPI QR code + amount |
| `paid` | "PAID! Thank You!" confirmation |

**Response:**
```json
{
  "status": "checkout",
  "session_id": "uuid",
  "grandTotal": 126.00,
  "upiLink": "upi://pay?pa=8815987007@ybl&..."
}
```

---

### `GET /api/receipt/[sessionId]`
**Called by:** Receipt page (website) after payment confirmation

Fetches the complete receipt — session info, all purchased items with full pricing breakdown, and payment record.

**Response:**
```json
{
  "session": { "id": "uuid", "customer_name": "Naman Jain", "status": "paid" },
  "items": [
    { "quantity": 2, "subtotal": 126.00, "gst_amount": 6.00, "discount_amount": 0, "products": { "name": "Amul Milk 1L" } }
  ],
  "payment": { "amount": 126.00, "status": "paid", "upi_txn_id": "123456789012", "paid_at": "..." }
}
```

---

## 3. Admin Panel APIs

> All admin routes require the HTTP header:
> `x-admin-token: <token>`
> Token is obtained from `POST /api/admin/login`.

### `POST /api/admin/login`
Verifies admin credentials and returns a session token.

**Request body:** `{ "username": "admin", "password": "..." }`
**Response:** `{ "token": "...", "message": "Login successful" }`

---

### `GET /api/admin/dashboard`
Returns live system metrics for the admin overview.

**Response:**
```json
{
  "activeSessions": 3,
  "checkoutSessions": 1,
  "todayRevenue": 2450.00,
  "todayTransactions": 12,
  "totalProducts": 85,
  "lowStock": 4,
  "recentSessions": [ { "id": "uuid", "trolley_id": "T001", "status": "active" } ]
}
```

---

### `GET /api/admin/products`
Returns all products in the catalogue.

### `POST /api/admin/products`
Adds a new product.

**Request body:**
```json
{
  "name": "Amul Milk 1L",
  "barcode": "8901234567890",
  "price": 60.00,
  "stock_qty": 100,
  "gst_percent": 5,
  "discount_percent": 0,
  "weight_grams": 1000
}
```

### `GET /api/admin/products/[id]`
Fetch a single product's details.

### `PUT /api/admin/products/[id]`
Update product fields (name, price, stock, GST, discount, weight).

### `DELETE /api/admin/products/[id]`
Remove a product from the inventory.

---

### `GET /api/admin/sessions`
Returns all trolley sessions (filterable by status: active / checkout / paid).

### `GET /api/admin/bills`
Returns all paid bills with customer and payment details.

### `GET /api/admin/inventory`
Returns stock levels for all products, highlighting low-stock items (< 10 units).

### `GET /api/admin/analytics`
Returns sales analytics — revenue over time, top-selling products, transaction counts.

---

## 4. Arduino → API Summary

| What triggers it | API endpoint | Method |
|---|---|---|
| Every barcode scanned by camera | `/api/scan` | POST |
| Load cell sends weight reading | `/api/weight` | POST |
| LCD polls for display state | `/api/checkout-status?trolley_id=T001` | GET |

---

## 5. UPI Payment Link Format

```
upi://pay?pa=8815987007@ybl&pn=SmartStore&am=126.00&cu=INR&tn=Bill-abc12345
```

| Parameter | Value | Meaning |
|---|---|---|
| `pa` | `8815987007@ybl` | Payee UPI ID (store's account) |
| `pn` | `SmartStore` | Payee display name |
| `am` | e.g. `126.00` | Grand total amount (INR) |
| `cu` | `INR` | Currency code |
| `tn` | `Bill-<first 8 chars of session_id>` | Transaction reference / order note |

This link is encoded as a QR code and displayed on:
- **Website payment page** — for the customer's phone
- **Trolley LCD screen** — via `drawQRCode()` in `codes.ino`

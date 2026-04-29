#include <WebServer.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// =====================================================
// LCD
// =====================================================
LiquidCrystal_I2C lcd(0x27, 16, 2);
WebServer server(80);

// =====================================================
// WIFI
// =====================================================
const char* ssid     = "Sk";
const char* password = "12345678";

// =====================================================
// SERVER
// =====================================================
const char* BASE_URL   = "https://smart-trolley-nine.vercel.app";
const char* TROLLEY_ID = "T002";

// =====================================================
// TOTALS  (synced from server every POLL_INTERVAL_MS)
// =====================================================
int  itemCount = 0;
int  total     = 0;

// =====================================================
// REMOVE MODE
// =====================================================
bool removeMode = false;

// =====================================================
// CHECKOUT / PAYMENT WAIT MODE
// =====================================================
bool checkoutMode = false;   // true while waiting for UPI payment

// =====================================================
// POLL TIMERS
// =====================================================
unsigned long lastPollMs        = 0;
const unsigned long POLL_INTERVAL_MS    = 8000UL; // LCD sync every 8 s (idle)

unsigned long lastPaymentPollMs = 0;
const unsigned long PAYMENT_POLL_MS     = 4000UL; // payment check every 4 s

// =====================================================
// LCD HELPERS
// =====================================================

void showMessage(String line1, String line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

void showSummary() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Items:");
  lcd.print(itemCount);
  lcd.setCursor(0, 1);
  lcd.print("Total:Rs");
  lcd.print(total);
}

void showAdded(String name) {
  showMessage("Added:", name);
  delay(1500);
  showSummary();
}

void showRemoved(String name) {
  showMessage("Removed:", name);
  delay(1500);
  showSummary();
}

// =====================================================
// WIFI CONNECT
// =====================================================

void connectWiFi() {
  showMessage("Connecting...");
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(1000);
  WiFi.begin(ssid, password);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    lcd.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    showMessage("WiFi OK");
    delay(1200);
    showMessage("Smart Trolley", "Ready...");
  } else {
    showMessage("WiFi Failed");
  }
}

// =====================================================
// HTTPS HELPER  (one static client per call — no leak)
// =====================================================

bool beginSecureRequest(HTTPClient &http, String url) {
  if (WiFi.status() != WL_CONNECTED) {
    showMessage("WiFi Error");
    return false;
  }
  WiFiClientSecure *client = new WiFiClientSecure;
  client->setInsecure();
  http.begin(*client, url);
  return true;
}

// =====================================================
// POLL SERVER — keep LCD in sync with database
// Called from loop() every POLL_INTERVAL_MS when idle
// =====================================================

void pollLCD() {
  HTTPClient http;
  String url = String(BASE_URL) + "/api/checkout-status?trolley_id=" + String(TROLLEY_ID);

  if (!beginSecureRequest(http, url)) { http.end(); return; }

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();

    StaticJsonDocument<512> doc;
    deserializeJson(doc, payload);

    String status = doc["data"]["status"] | String("idle");

    Serial.print("POLL: status=");
    Serial.println(status);

    // ── Only sync LCD from an ACTIVE session ─────────────────────────────
    // Paid / checkout / idle sessions are ignored — counters stay at 0
    // so we never show last session's items after payment completes.
    if (status != "active") {
      http.end();
      return;
    }

    int serverTotal = (int)(doc["data"]["grandTotal"] | (float)total);
    int serverCount = doc["data"]["itemCount"]        | itemCount;

    // Only redraw if something changed (avoids flicker)
    if (serverTotal != total || serverCount != itemCount) {
      total     = serverTotal;
      itemCount = serverCount;
      showSummary();

      Serial.print("POLL sync: items=");
      Serial.print(serverCount);
      Serial.print(" total=");
      Serial.println(serverTotal);
    }
  }

  http.end();
}

// =====================================================
// POLL PAYMENT STATUS — called from loop() during checkout
// Keeps LCD on "Scan QR" until session becomes 'paid',
// then shows Thank You and resets back to ready state.
// =====================================================

void pollPaymentStatus() {
  HTTPClient http;
  String url = String(BASE_URL) + "/api/checkout-status?trolley_id=" + String(TROLLEY_ID);

  if (!beginSecureRequest(http, url)) { http.end(); return; }

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();

    StaticJsonDocument<512> doc;
    deserializeJson(doc, payload);

    String status = doc["data"]["status"] | String("checkout");

    Serial.print("PAYMENT POLL: status=");
    Serial.println(status);

    if (status == "paid") {
      // Payment confirmed by website — reset everything
      checkoutMode = false;
      total        = 0;
      itemCount    = 0;

      showMessage("Thank You!", "Come Again :)");
      delay(3000);
      showMessage("Smart Trolley", "Ready...");
    }
    // If still 'checkout' — keep showing "Scan QR on / Phone to Pay" (no redraw needed)
  }

  http.end();
}

// =====================================================
// ADD PRODUCT
// =====================================================

void addProduct(String barcode) {
  HTTPClient http;
  String url = String(BASE_URL) + "/api/scan";

  if (!beginSecureRequest(http, url)) return;

  http.addHeader("Content-Type", "application/json");

  String body =
    "{\"trolley_id\":\"" + String(TROLLEY_ID) +
    "\",\"barcode\":\""  + barcode + "\"}";

  int httpCode = http.POST(body);
  String payload = http.getString();

  Serial.print("ADD HTTP: ");
  Serial.println(httpCode);
  Serial.println(payload);

  if (httpCode == 200 || httpCode == 201) {

    StaticJsonDocument<2048> doc;
    deserializeJson(doc, payload);

    String name  = doc["data"]["product"]["name"]  | "Item";
    int    price = doc["data"]["product"]["price"]  | 0;

    itemCount++;
    total += price;

    showAdded(name);

  } else {

    lcd.clear();
    lcd.print("Err:");
    lcd.print(httpCode);
    delay(1500);
    showSummary();
  }

  http.end();
}

// =====================================================
// REMOVE PRODUCT
// =====================================================

void removeProduct(String barcode) {
  HTTPClient http;
  String url = String(BASE_URL) + "/api/remove";

  if (!beginSecureRequest(http, url)) return;

  http.addHeader("Content-Type", "application/json");

  // NOTE: barcode is sent AS-IS (not uppercased) so it matches the DB exactly
  String body =
    "{\"trolley_id\":\"" + String(TROLLEY_ID) +
    "\",\"barcode\":\""  + barcode + "\"}";

  int httpCode = http.POST(body);
  String payload = http.getString();

  Serial.print("REMOVE HTTP: ");
  Serial.println(httpCode);
  Serial.println(payload);

  if (httpCode == 200) {

    StaticJsonDocument<2048> doc;
    deserializeJson(doc, payload);

    String name  = doc["data"]["product"]["name"]  | "Item";
    int    price = doc["data"]["product"]["price"]  | 0;

    if (itemCount > 0) itemCount--;
    total -= price;
    if (total < 0) total = 0;

    showRemoved(name);

  } else {

    // Show the HTTP code so we can debug (e.g. 404 = not in cart, 409 = checked out)
    showMessage("Remove Err", String(httpCode));
    delay(1500);
    showSummary();
  }

  http.end();
}

// =====================================================
// CHECKOUT
// =====================================================

void checkout() {
  HTTPClient http;
  String url = String(BASE_URL) + "/api/scan";

  if (!beginSecureRequest(http, url)) return;

  http.addHeader("Content-Type", "application/json");

  String body =
    "{\"trolley_id\":\"" + String(TROLLEY_ID) +
    "\",\"barcode\":\"CHECKOUT\"}";

  int httpCode = http.POST(body);
  String payload = http.getString();

  Serial.print("CHECKOUT HTTP: ");
  Serial.println(httpCode);
  Serial.println(payload);

  http.end();

  if (httpCode == 200) {

    StaticJsonDocument<1024> doc;
    deserializeJson(doc, payload);
    float grandTotal = doc["data"]["totals"]["grandTotal"] | (float)total;

    showMessage("Checkout Done!");
    delay(1200);

    lcd.clear();
    lcd.print("Pay Rs:");
    lcd.setCursor(0, 1);
    lcd.print((int)grandTotal);

    delay(3000);

    // Enter payment-wait mode — loop() will poll every 4 s
    // LCD stays on this message until payment is confirmed
    total        = 0;
    itemCount    = 0;
    checkoutMode = true;

    showMessage("Scan QR on", "Phone to Pay");
    // No blocking delay — return immediately so loop() keeps running

  } else {

    lcd.clear();
    lcd.print("Chk Err:");
    lcd.print(httpCode);
    delay(1500);
  }
}

// =====================================================
// HTTP /barcode  handler  (called by scanner.py)
// =====================================================
void handleBarcode() {
  if (!server.hasArg("barcode")) {
    server.send(400, "text/plain", "Missing barcode");
    return;
  }

  // Preserve original barcode for product lookup (case-sensitive DB match)
  String raw = server.arg("barcode");
  raw.trim();
  raw.replace("\r", "");
  raw.replace("\n", "");

  // Upper-case copy only for control keyword comparison
  String input = raw;
  input.toUpperCase();

  Serial.println("WiFi INPUT: " + input);

  if (removeMode) {

    if (input == "REMOVE") {
      showMessage("Scan item to", "REMOVE");
      server.send(200, "text/plain", "OK");
      return;
    }

    removeProduct(raw);   // ← send raw (original case) barcode
    removeMode = false;
    server.send(200, "text/plain", "Removed");
    return;
  }

  if (input == "REMOVE") {
    removeMode = true;
    showMessage("Scan item to", "REMOVE");
    server.send(200, "text/plain", "Remove mode");
    return;
  }

  if (input == "CHECKOUT") {
    checkout();
    server.send(200, "text/plain", "Checkout");
    return;
  }

  addProduct(raw);        // ← send raw (original case) barcode
  server.send(200, "text/plain", "Added");
}

// =====================================================
// SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  Wire.begin(15, 14);

  lcd.init();
  lcd.backlight();

  connectWiFi();

  server.on("/", []() {
    server.send(200, "text/plain", "ESP32 Server Running");
  });

  server.on("/barcode", HTTP_POST, handleBarcode);
  server.begin();

  Serial.print("Server started at: http://");
  Serial.println(WiFi.localIP());
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  server.handleClient();

  unsigned long now = millis();

  // ── Payment-wait poll: check if session became 'paid' every 4 s ─────────
  if (checkoutMode && (now - lastPaymentPollMs >= PAYMENT_POLL_MS)) {
    lastPaymentPollMs = now;
    pollPaymentStatus();
  }

  // ── Background LCD sync: keep totals fresh every 8 s (idle only) ────────
  if (!removeMode && !checkoutMode && (now - lastPollMs >= POLL_INTERVAL_MS)) {
    lastPollMs = now;
    pollLCD();
  }

  if (Serial.available()) {

    String raw = Serial.readStringUntil('\n');
    raw.trim();
    raw.replace("\r", "");
    raw.replace("\n", "");

    if (raw.length() == 0) return;

    // Upper-case copy only for control keyword comparison
    String input = raw;
    input.toUpperCase();

    Serial.print("INPUT:[");
    Serial.print(input);
    Serial.println("]");

    // REMOVE MODE ACTIVE
    if (removeMode) {

      if (input == "REMOVE") {
        showMessage("Scan item to", "REMOVE");
        delay(1200);
        return;
      }

      removeProduct(raw);   // ← raw barcode preserves original case
      removeMode = false;
      return;
    }

    // ENTER REMOVE MODE
    if (input == "REMOVE") {
      removeMode = true;
      showMessage("Scan item to", "REMOVE");
      delay(1200);
      return;
    }

    // CHECKOUT CARD
    if (input == "CHECKOUT") {
      removeMode = false;
      checkout();
      return;
    }

    // NORMAL ADD
    addProduct(raw);        // ← raw barcode preserves original case
  }
}
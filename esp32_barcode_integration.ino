#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ─── Configuration ─────────────────────────────────────────────────────────
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// All barcodes (product + mode) go to the same endpoint.
// The server handles mode logic transparently.
const char* api_url  = "https://smart-trolley-nine.vercel.app/api/scan";

const String trolley_id = "T001";

// ─── Special Barcodes (for Serial Monitor display only) ────────────────────
// These values must match the constants in app/api/scan/route.ts
const String MODE_ADD_BARCODE    = "Checkout"; // → ADD mode  (green)
const String MODE_REMOVE_BARCODE = "Remove";   // → REMOVE mode (red)

// ─── Hardware Pins ──────────────────────────────────────────────────────────
// Scanner TX → ESP32 GPIO16 (RX2)
// Scanner RX → ESP32 GPIO17 (TX2)
#define RXD2 16
#define TXD2 17

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);

  Serial.println();
  Serial.println("=========================================");
  Serial.println("  Smart Trolley — Barcode Scanner Ready");
  Serial.println("=========================================");
  Serial.println("  Mode barcodes:");
  Serial.println("    'Checkout' → ADD mode  [GREEN]");
  Serial.println("    'Remove'   → REMOVE mode [RED]");
  Serial.println("  Default mode: ADD");
  Serial.println("=========================================");

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (Serial2.available() > 0) {
    String barcode = Serial2.readStringUntil('\n');
    barcode.trim();

    if (barcode.length() > 0) {
      Serial.println();
      Serial.print("Scanned: ");
      Serial.println(barcode);

      // Identify barcode type for the operator log
      if (barcode == MODE_ADD_BARCODE) {
        Serial.println("[MODE] → Switching to ADD mode...");
      } else if (barcode == MODE_REMOVE_BARCODE) {
        Serial.println("[MODE] → Switching to REMOVE mode...");
      } else {
        Serial.println("[PRODUCT] → Sending to API...");
      }

      sendToAPI(barcode);
    }
  }
}

void sendToAPI(String barcode) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected — reconnecting...");
    WiFi.reconnect();
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Skip cert verification (fine for embedded use)

  HTTPClient http;
  http.begin(client, api_url);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"trolley_id\":\"" + trolley_id + "\",\"barcode\":\"" + barcode + "\"}";
  Serial.print("POST → ");
  Serial.println(payload);

  int code = http.POST(payload);
  Serial.print("HTTP ");
  Serial.println(code);

  if (code > 0) {
    String body = http.getString();
    Serial.println(body);

    // ── Parse and log the outcome ───────────────────────────────────────
    if (body.indexOf("\"mode_switched\":true") >= 0) {
      Serial.println(">>> MODE SWITCHED ✓");
    }
    if (body.indexOf("\"mode\":\"ADD\"") >= 0) {
      Serial.println(">>> Current mode: ADD  [GREEN] — scanning ADDS items");
    } else if (body.indexOf("\"mode\":\"REMOVE\"") >= 0) {
      Serial.println(">>> Current mode: REMOVE [RED] — scanning REMOVES items");
    }
    if (body.indexOf("\"action\":\"added\"") >= 0 || body.indexOf("\"action\":\"incremented\"") >= 0) {
      Serial.println(">>> Item ADDED to cart ✓");
    } else if (body.indexOf("\"action\":\"removed\"") >= 0) {
      Serial.println(">>> Item REMOVED from cart ✓");
    } else if (body.indexOf("\"action\":\"decremented\"") >= 0) {
      Serial.println(">>> Item qty DECREMENTED ✓");
    } else if (body.indexOf("\"success\":false") >= 0) {
      Serial.println(">>> ERROR — check server response above");
    }
  } else {
    Serial.print("Request failed: ");
    Serial.println(http.errorToString(code).c_str());
  }

  http.end();
}

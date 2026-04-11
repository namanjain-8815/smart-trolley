// =============================================================================
//  Smart Trolley — ESP32-CAM + SSD1306 OLED
//  Board  : AI Thinker ESP32-CAM
//  OLED   : 0.96" SSD1306 128×64  (I2C address 0x3C)
//  Wiring : SDA → GPIO14  |  SCK → GPIO15
// =============================================================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>   // v6 — install via Library Manager if not present

// -----------------------------------------------------------------------------
// WiFi credentials  (change these!)
// -----------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// -----------------------------------------------------------------------------
// API configuration
// -----------------------------------------------------------------------------
const char* API_BASE_URL  = "https://smart-trolley-nine.vercel.app";
const char* SCAN_ENDPOINT = "/api/scan";
const String TROLLEY_ID   = "T001";

// Polling interval: how often to fetch updated cart data from the server (ms)
const unsigned long POLL_INTERVAL_MS = 5000;

// -----------------------------------------------------------------------------
// OLED setup
// -----------------------------------------------------------------------------
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1          // no reset pin
#define OLED_ADDRESS  0x3C

// ESP32-CAM I2C pins (non-standard — do NOT use the default 21/22)
#define I2C_SDA 14
#define I2C_SCL 15

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// -----------------------------------------------------------------------------
// Cart state  (update these variables to refresh the display)
// -----------------------------------------------------------------------------
struct CartState {
  int    itemCount   = 0;
  float  totalPrice  = 0.0f;
  String lastProduct = "---";
  float  lastPrice   = 0.0f;
  bool   wifiOk      = false;
} cart;

// -----------------------------------------------------------------------------
// Simulated scan demo  (set to false to disable demo mode)
// -----------------------------------------------------------------------------
#define DEMO_MODE true
const unsigned long DEMO_INTERVAL_MS = 8000;   // simulate a scan every 8 s

// Demo product catalogue
struct DemoProduct { const char* name; float price; };
const DemoProduct DEMO_PRODUCTS[] = {
  { "Amul Milk 1L",   60.00f },
  { "Britannia Bread", 45.00f },
  { "Maggi 2-Min",    14.00f },
  { "Lays Classic",   20.00f },
  { "Tata Salt 1kg",  28.00f },
};
const int DEMO_COUNT = sizeof(DEMO_PRODUCTS) / sizeof(DEMO_PRODUCTS[0]);

// =============================================================================
//  OLED helpers
// =============================================================================

/**
 * Clears the display and redraws the full cart summary.
 * Called whenever cart state changes.
 */
void updateDisplay() {
  display.clearDisplay();

  // ── Title bar ──────────────────────────────────────────────
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(18, 0);
  display.print(F("Smart Trolley"));

  // Divider line
  display.drawLine(0, 10, SCREEN_WIDTH - 1, 10, SSD1306_WHITE);

  // ── WiFi status dot (top-right corner) ─────────────────────
  if (cart.wifiOk) {
    display.fillCircle(123, 5, 3, SSD1306_WHITE);
  } else {
    display.drawCircle(123, 5, 3, SSD1306_WHITE);
  }

  // ── Items & Total ──────────────────────────────────────────
  display.setCursor(0, 14);
  display.print(F("Items : "));
  display.print(cart.itemCount);

  display.setCursor(0, 25);
  display.print(F("Total : Rs "));
  display.print(cart.totalPrice, 2);

  // Divider
  display.drawLine(0, 36, SCREEN_WIDTH - 1, 36, SSD1306_WHITE);

  // ── Last scanned product ───────────────────────────────────
  display.setCursor(0, 39);
  display.print(F("Last item:"));

  display.setCursor(0, 49);
  // Truncate long product names to fit 128px width (21 chars @ size 1)
  String name = cart.lastProduct;
  if (name.length() > 21) name = name.substring(0, 18) + "...";
  display.print(name);

  display.setCursor(0, 57);
  display.print(F("Rs "));
  display.print(cart.lastPrice, 2);

  display.display();
}

/**
 * Shows a temporary status message in the centre of the screen.
 */
void showStatus(const String& msg) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 28);
  display.print(msg);
  display.display();
}

// =============================================================================
//  WiFi helpers
// =============================================================================

void connectWiFi() {
  showStatus("Connecting WiFi...");
  Serial.print(F("Connecting to "));
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print('.');
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    cart.wifiOk = true;
    Serial.println(F("\nWiFi connected"));
    Serial.print(F("IP: "));
    Serial.println(WiFi.localIP());
    showStatus("WiFi connected!");
  } else {
    cart.wifiOk = false;
    Serial.println(F("\nWiFi FAILED — running offline"));
    showStatus("WiFi failed.");
  }
  delay(1000);
}

// =============================================================================
//  API communication
// =============================================================================

/**
 * POST a barcode to the /api/scan endpoint.
 * Returns true on HTTP 200/201, false otherwise.
 */
bool postScan(const String& barcode) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("postScan: WiFi not connected"));
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();   // skip certificate verification

  HTTPClient http;
  String url = String(API_BASE_URL) + SCAN_ENDPOINT;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"trolley_id\":\"" + TROLLEY_ID +
                   "\",\"barcode\":\""  + barcode + "\"}";

  Serial.print(F("POST → "));
  Serial.println(payload);

  int code = http.POST(payload);
  Serial.print(F("HTTP "));
  Serial.println(code);

  bool ok = (code == 200 || code == 201);

  if (ok) {
    // Try to parse cart fields returned by the server
    // Expected JSON: { "itemCount": N, "totalPrice": F,
    //                  "lastProduct": "...", "lastPrice": F }
    String body = http.getString();
    Serial.println(body);

    DynamicJsonDocument doc(512);
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      if (doc.containsKey("itemCount"))   cart.itemCount   = doc["itemCount"].as<int>();
      if (doc.containsKey("totalPrice"))  cart.totalPrice  = doc["totalPrice"].as<float>();
      if (doc.containsKey("lastProduct")) cart.lastProduct = doc["lastProduct"].as<String>();
      if (doc.containsKey("lastPrice"))   cart.lastPrice   = doc["lastPrice"].as<float>();
    }
  }

  http.end();
  return ok;
}

/**
 * GET the current cart state from the server (periodic polling).
 * Endpoint assumed: GET /api/cart?trolley_id=T001
 * Adjust the URL/JSON keys to match your actual API response.
 */
void fetchCart() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(API_BASE_URL) + "/api/cart?trolley_id=" + TROLLEY_ID;
  http.begin(client, url);

  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    DynamicJsonDocument doc(512);
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      bool changed = false;

      if (doc.containsKey("itemCount") &&
          doc["itemCount"].as<int>() != cart.itemCount) {
        cart.itemCount = doc["itemCount"].as<int>();
        changed = true;
      }
      if (doc.containsKey("totalPrice") &&
          doc["totalPrice"].as<float>() != cart.totalPrice) {
        cart.totalPrice = doc["totalPrice"].as<float>();
        changed = true;
      }
      if (doc.containsKey("lastProduct")) {
        String p = doc["lastProduct"].as<String>();
        if (p != cart.lastProduct) { cart.lastProduct = p; changed = true; }
      }
      if (doc.containsKey("lastPrice")) {
        cart.lastPrice = doc["lastPrice"].as<float>();
      }

      if (changed) updateDisplay();
    }
  }
  http.end();
}

// =============================================================================
//  Demo / simulation (DEMO_MODE = true)
// =============================================================================

void runDemoScan() {
  static int idx = 0;
  const DemoProduct& p = DEMO_PRODUCTS[idx % DEMO_COUNT];
  idx++;

  cart.itemCount++;
  cart.totalPrice  += p.price;
  cart.lastProduct  = p.name;
  cart.lastPrice    = p.price;

  Serial.print(F("[DEMO] scanned: "));
  Serial.print(p.name);
  Serial.print(F("  Rs "));
  Serial.println(p.price, 2);

  updateDisplay();

  // Optionally still POST to the real API in demo mode
  // postScan("DEMO_BARCODE_" + String(idx));
}

// =============================================================================
//  setup()
// =============================================================================

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println(F("\n=== Smart Trolley ESP32-CAM ==="));

  // ── I2C with ESP32-CAM pins ─────────────────────────────────────────────
  Wire.begin(I2C_SDA, I2C_SCL);

  // ── OLED init ───────────────────────────────────────────────────────────
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println(F("SSD1306 not found — check wiring/address"));
    // Halt here so you notice immediately during development
    for (;;) { delay(1000); }
  }
  display.cp437(true);   // use correct Code Page 437 fonts
  display.clearDisplay();
  display.display();

  showStatus("Smart Trolley\n  Starting...");
  delay(1500);

  // ── WiFi ────────────────────────────────────────────────────────────────
  connectWiFi();

  // ── Initial display ─────────────────────────────────────────────────────
  updateDisplay();

  Serial.println(F("Setup complete."));
}

// =============================================================================
//  loop()
// =============================================================================

void loop() {
  // ── WiFi watchdog ───────────────────────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    cart.wifiOk = false;
    updateDisplay();
    connectWiFi();
  } else {
    cart.wifiOk = true;
  }

  // ── Demo mode: simulate a new scan every DEMO_INTERVAL_MS ───────────────
#if DEMO_MODE
  static unsigned long lastDemo = 0;
  if (millis() - lastDemo >= DEMO_INTERVAL_MS) {
    lastDemo = millis();
    runDemoScan();
  }
#endif

  // ── Periodic cart polling from server ───────────────────────────────────
#if !DEMO_MODE
  static unsigned long lastPoll = 0;
  if (millis() - lastPoll >= POLL_INTERVAL_MS) {
    lastPoll = millis();
    fetchCart();
  }
#endif

  // ── Real barcode scanner on Serial2 (GPIO16/17) ─────────────────────────
  // Uncomment this block if you have a wired serial barcode scanner attached
  /*
  if (Serial2.available() > 0) {
    String barcode = Serial2.readStringUntil('\n');
    barcode.trim();
    if (barcode.length() > 0) {
      Serial.print(F("Scanned: "));
      Serial.println(barcode);
      if (postScan(barcode)) {
        updateDisplay();
      }
    }
  }
  */

  delay(100);   // small yield — keeps WiFi stack happy
}

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
const char* ssid = "Sk";
const char* password = "12345678";

// =====================================================
// SERVER
// =====================================================
const char* BASE_URL   = "https://smart-trolley-nine.vercel.app";
const char* TROLLEY_ID = "T002";

// =====================================================
// TOTALS
// =====================================================
int itemCount = 0;
int total = 0;

// =====================================================
// REMOVE MODE
// =====================================================
bool removeMode = false;

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
  lcd.print("Total:");
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
// HTTPS HELPER
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
// ADD PRODUCT
// =====================================================

void addProduct(String barcode) {

  HTTPClient http;

  String url = String(BASE_URL) + "/api/scan";

  if (!beginSecureRequest(http, url)) return;

  http.addHeader("Content-Type", "application/json");

  String body =
    "{\"trolley_id\":\"" + String(TROLLEY_ID) +
    "\",\"barcode\":\"" + barcode + "\"}";

  int httpCode = http.POST(body);

  String payload = http.getString();

  Serial.print("ADD HTTP: ");
  Serial.println(httpCode);
  Serial.println(payload);

  if (httpCode == 200 || httpCode == 201) {

    StaticJsonDocument<2048> doc;
    deserializeJson(doc, payload);

    String name =
      doc["data"]["product"]["name"] | "Item";

    int price =
      doc["data"]["product"]["price"] | 0;

    itemCount++;
    total += price;

    showAdded(name);

  } else {

    lcd.clear();
    lcd.print("Err:");
    lcd.print(httpCode);
  }

  http.end();
}

// =====================================================
// REMOVE PRODUCT
// =====================================================

void removeProduct(String barcode) {

  HTTPClient http;

  String url = String(BASE_URL) + "/api/scan/remove";

  if (!beginSecureRequest(http, url)) return;

  http.addHeader("Content-Type", "application/json");

  String body =
    "{\"trolley_id\":\"" + String(TROLLEY_ID) +
    "\",\"barcode\":\"" + barcode + "\"}";

  int httpCode = http.POST(body);

  String payload = http.getString();

  Serial.print("REMOVE HTTP: ");
  Serial.println(httpCode);
  Serial.println(payload);

  if (httpCode == 200) {

    StaticJsonDocument<2048> doc;
    deserializeJson(doc, payload);

    String name =
      doc["product"]["name"] |
      doc["data"]["product"]["name"] |
      "Item";

    int price =
      doc["product"]["price"] |
      doc["data"]["product"]["price"] |
      0;

    if (itemCount > 0) itemCount--;

    total -= price;

    if (total < 0) total = 0;

    showRemoved(name);

  } else {

    showMessage("Not Found");
  }

  http.end();
}

// =====================================================
// CHECKOUT (POST TO WEBSITE)
// =====================================================

void checkout() {

  HTTPClient http;

  // Send to /api/scan with barcode="CHECKOUT" — the unified scan endpoint
  // handles checkout logic: marks session as 'checkout', creates payment record.
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

    // Parse grand total from response to display on LCD
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

    // Reset local counters — DB data is preserved for payment
    total = 0;
    itemCount = 0;

    showMessage("Scan QR on", "Phone to Pay");
    delay(2000);

  } else {

    lcd.clear();
    lcd.print("Chk Err:");
    lcd.print(httpCode);
  }
}

// =====================================================
// SETUP
// =====================================================
void handleBarcode() {
  if (!server.hasArg("barcode")) {
    server.send(400, "text/plain", "Missing barcode");
    return;
  }

  String input = server.arg("barcode");

  input.trim();
  input.replace("\r", "");
  input.replace("\n", "");
  input.toUpperCase();

  Serial.println("WiFi INPUT: " + input);

  // SAME LOGIC AS LOOP

  if (removeMode == true) {

    if (input == "REMOVE") {
      showMessage("Scan item to", "REMOVE");
      server.send(200, "text/plain", "OK");
      return;
    }

    removeProduct(input);
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

  addProduct(input);
  server.send(200, "text/plain", "Added");
}


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
  if (Serial.available()) {

    String input = Serial.readStringUntil('\n');

    input.trim();
    input.replace("\r", "");
    input.replace("\n", "");
    input.toUpperCase();

    if (input.length() == 0) return;

    Serial.print("INPUT:[");
    Serial.print(input);
    Serial.println("]");

    // REMOVE MODE ACTIVE
    if (removeMode == true) {

      if (input == "REMOVE") {
        showMessage("Scan item to", "REMOVE");
        delay(1200);
        return;
      }

      removeProduct(input);
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
    addProduct(input);
  }
}
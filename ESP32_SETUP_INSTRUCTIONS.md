# ESP32 Barcode Scanner - Next Steps

You've connected the ESP32 and Barcode Scanner to your laptop! Here are the step-by-step instructions to get the code running and test the API integration.

## Step 1: Update Wi-Fi Credentials
1. Open `esp32_barcode_integration.ino` in your editor or Arduino IDE.
2. Find lines 7 & 8:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Replace `"YOUR_WIFI_SSID"` and `"YOUR_WIFI_PASSWORD"` with your actual Wi-Fi network name and password.

## Step 2: Setup Arduino IDE (If you haven't already)
1. Download and install the [Arduino IDE](https://www.arduino.cc/en/software).
2. Open Arduino IDE and go to **File > Preferences**.
3. In "Additional Boards Manager URLs", paste this link:
   `https://dl.espressif.com/dl/package_esp32_index.json`
4. Click **OK**.
5. Go to **Tools > Board > Boards Manager...**
6. Search for **esp32** and click **Install** (by Espressif Systems).

## Step 3: Select Your Board and Port
1. Go to **Tools > Board > ESP32 Arduino** and select your ESP32 board model (usually **"DOIT ESP32 DEVKIT V1"** or **"ESP32 Dev Module"**).
2. Go to **Tools > Port** and select the COM port your ESP32 is connected to (e.g., `COM3`, `COM4`). *If you don't see one, you may need a CP210x or CH340 USB driver.*

## Step 4: Upload the Code
1. Open the `esp32_barcode_integration.ino` file inside Arduino IDE.
2. Click the **Upload** button (the right-pointing arrow icon `->` at the top left).
3. Wait for it to compile and upload.
   > **Note:** If you see `Connecting...` in the console at the bottom, press and hold the **BOOT** button on your ESP32 board for a few seconds until the upload starts.

## Step 5: Test the Integration
1. Once uploaded, click the **Serial Monitor** icon (top right corner of Arduino IDE) or go to **Tools > Serial Monitor**.
2. Important: In the Serial Monitor window, change the baud rate dropdown (bottom right) to **115200**.
3. You should see the ESP32 connecting to your Wi-Fi:
   ```
   =========================================
   Smart Trolley Barcode Scanner Initialized
   =========================================
   Connecting to WiFi: YourNetworkName
   ...
   WiFi Connected!
   IP Address: 192.168.x.x
   ```
4. Now, **scan a barcode** with your scanner!
5. Check the Serial Monitor. You should see:
   ```
   Scanned Barcode: 8901491506045
   Sending Payload: {"trolley_id":"T001","barcode":"8901491506045"}
   HTTP Response Code: 200
   Response Body: {"message":"Item added successfully",...}
   ```
6. Open your Smart Trolley website, and the product should be in the cart!

## Troubleshooting
- **Nothing prints when I scan a barcode?**
  Your scanner might use a different baud rate. Go back to the code, locate `Serial2.begin(9600, ...)` and change `9600` to `115200`. Re-upload and test again.
- **HTTP Response Code is negative (e.g., -1)?**
  This means the ESP32 couldn't reach the server. Make sure your Wi-Fi has working internet and the API URL is correct.
- **Is the payload getting a 400 or 500 error?**
  Check the `Response Body` printed in the Serial Monitor, it will contain the error message from your Vercel backend.

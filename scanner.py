import serial

esp32 = serial.Serial('COM5',115200)   # change COM port if needed

print("Scanner ready...")

while True:

    barcode = input("Scan barcode: ")

    esp32.write((barcode + "\n").encode())

    print("Sent to ESP32:", barcode)

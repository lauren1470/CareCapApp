#include <math.h>
#include <ArduinoBLE.h>

// ── BLE UUIDs (must match the webapp exactly) ─────────────────────────────────
#define SERVICE_UUID "19b10000-e8f2-537e-4f6c-d104768a1214"
#define CHAR_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"

BLEService sensorService(SERVICE_UUID);
// 40 bytes: 8 temp floats (32 bytes) + 2 pressure floats (8 bytes)
BLECharacteristic sensorChar(CHAR_UUID, BLERead | BLENotify, 40);

// ── Thermistor settings ───────────────────────────────────────────────────────
#define RT0 10000.0  // NTC nominal resistance at 25°C
#define B 3977.0     // B-coefficient
#define VCC 3.3      // Nano 33 BLE runs at 3.3V
#define R 10000.0    // Fixed pull-down resistor
#define T0 298.15    // 25°C in Kelvin

// ── Sensor pins ───────────────────────────────────────────────────────────────
const int numSensors = 8;
//   Index 0 → Fz  (Front Centre)kkk
//   Index 1 → FCz (Mid Centre)
//   Index 2 → Cz  (Crown)
//   Index 3 → Oz  (Back Centre)
//   Index 4 → F3  (Front Left)
//   Index 5 → C3  (Back Left)
//   Index 6 → F4  (Front Right)
//   Index 7 → C4  (Back Right)
const char* zoneNames[numSensors] = {
  "Fz  (Front Centre)",
  "FCz (Mid Centre)",
  "Cz  (Crown)",
  "Oz  (Back Centre)",
  "F3  (Front Left)",
  "C3  (Back Left)",
  "F4  (Front Right)",
  "C4  (Back Right)",
};

float temperatures[numSensors];

// ── Pressure sensor pins (digital — LOW = good contact) ───────────────────────
const int pressureSensor1 = 2;
const int pressureSensor2 = 3;

// 1.0 = good contact, 0.0 = no contact
// The webapp converts these to realistic Pa display values
const float PRESSURE_GOOD = 1.0;
const float PRESSURE_NONE = 0.0;

// ── 40-byte payload buffer ────────────────────────────────────────────────────
uint8_t payload[40];

void writeFloat(uint8_t* buf, int offset, float val) {
  memcpy(buf + offset, &val, 4);
}

// ═════════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(1500);

  analogReadResolution(10);  // 0–1023
  // INPUT_PULLUP enables the internal pull-up resistor so the pin reads HIGH
  // when the sensor is not pressed, and LOW when it is — no floating pin noise
  pinMode(pressureSensor1, INPUT_PULLUP);
  pinMode(pressureSensor2, INPUT_PULLUP);

  // ── Initialise BLE ──────────────────────────────────────────────────────────
  if (!BLE.begin()) {
    Serial.println("ERROR: BLE failed to start. Check board/library.");
    while (1)
      ;
  }

  BLE.setLocalName("CareCap");  // name the webapp scans for
  BLE.setAdvertisedService(sensorService);
  sensorService.addCharacteristic(sensorChar);
  BLE.addService(sensorService);

  // Initialise payload to zero
  memset(payload, 0, sizeof(payload));
  sensorChar.writeValue(payload, 40);

  BLE.advertise();
  Serial.println("CareCap BLE ready — waiting for connection...");
}

// ═════════════════════════════════════════════════════════════════════════════
void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to: ");
    Serial.println(central.address());

    while (central.connected()) {
      readAndSend();
      delay(500);  // send update every 500 ms
    }

    Serial.println("Central disconnected — advertising again.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
void readAndSend() {

  // ── Temperature sensors ───────────────────────────────────────────────────
  for (int i = 0; i < numSensors; i++) {
    long adcSum = 0;
    const int numSamples = 10;

    for (int j = 0; j < numSamples; j++) {
      adcSum += analogRead(sensorPins[i]);
      delay(2);
    }

    float adcAvg = adcSum / (float)numSamples;
    float VRT = (adcAvg / 1023.0) * VCC;

    if (VRT <= 0.01 || VRT >= (VCC - 0.01)) {
      temperatures[i] = -999.0;  // error sentinel
      Serial.print(zoneNames[i]);
      Serial.println(" -> Sensor error");
      writeFloat(payload, i * 4, -999.0);
      continue;
    }

    // Pull-down config: 3.3V → NTC → analog pin → 10kΩ → GND
    float RT = R * ((VCC / VRT) - 1.0);
    float lnRT = log(RT / RT0);
    float tempK = 1.0 / ((lnRT / B) + (1.0 / T0));
    float tempC = tempK - 273.15;

    temperatures[i] = tempC;
    writeFloat(payload, i * 4, tempC);

    Serial.print(zoneNames[i]);
    Serial.print(": ");
    Serial.print(tempC, 2);
    Serial.println(" °C");
  }

  // ── Pressure sensors (digital) ────────────────────────────────────────────
  // LOW signal = sensor pressed = good cap contact
  float p1 = (digitalRead(pressureSensor1) == LOW) ? PRESSURE_GOOD : PRESSURE_NONE;
  float p2 = (digitalRead(pressureSensor2) == LOW) ? PRESSURE_GOOD : PRESSURE_NONE;

  writeFloat(payload, 32, p1);
  writeFloat(payload, 36, p2);

  Serial.print("Pressure 1: ");
  Serial.print(p1 == PRESSURE_GOOD ? "Good contact" : "No contact");
  Serial.print("  |  Pressure 2: ");
  Serial.println(p2 == PRESSURE_GOOD ? "Good contact" : "No contact");
  Serial.println("-----------------------------");

  // ── Transmit over BLE ─────────────────────────────────────────────────────
  sensorChar.writeValue(payload, 40);
}

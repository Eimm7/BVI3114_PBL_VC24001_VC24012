
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "ZfamilyA_2.4G@unifi";
const char* password = "25122020";

// Google Apps Script Web App URL
const char* scriptURL = "https://script.google.com/macros/s/AKfycbzNjnso0VOuUry3j2ykV-smbTpwOdZZMGGaxaomYkd4yWP8ZonWsA71FlnjX7m2vUAc/exec";

// DHT sensor configuration
#define DHTPIN 16
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Data sending interval (10 minutes)
const unsigned long sendInterval = 600000;
unsigned long previousMillis = 0;


// Data validation function
bool validateSensorReading(float temperature, float humidity) {

  // Check for failed sensor readings
  if (isnan(temperature) || isnan(humidity)) {
    return false;
  }

  // Check temperature range
  if (temperature < 0.0 || temperature > 50.0) {
    return false;
  }

  // Check humidity range
  if (humidity < 0.0 || humidity > 100.0) {
    return false;
  }

  return true;
}


void setup() {

  // Initialize serial communication
  Serial.begin(115200);
  delay(1000);

  Serial.println("ESP32 DHT11 Sensor Data Logger");

  // Initialize DHT sensor
  dht.begin();

  // Connect to WiFi
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Connected to WiFi with IP: ");
  Serial.println(WiFi.localIP());
}


void loop() {

  unsigned long currentMillis = millis();

  // Check if it is time to collect and send data
  if (currentMillis - previousMillis >= sendInterval) {

    previousMillis = currentMillis;

    // Read temperature and humidity
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Validate sensor readings
    if (!validateSensorReading(temperature, humidity)) {
      Serial.println("Invalid sensor reading detected. Skipping.");
      return;
    }

    // Display sensor readings
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print("°C, Humidity: ");
    Serial.print(humidity);
    Serial.println("%");

    // Send validated data to Google Sheets
    sendDataToGoogleSheets(temperature, humidity);
  }
}


void sendDataToGoogleSheets(float temperature, float humidity) {

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi disconnected. Reconnecting...");

    WiFi.reconnect();

    // Wait for WiFi connection (maximum 10 seconds)
    int attempts = 0;

    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      attempts++;
    }

    // Check reconnection status
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi reconnection failed. Skipping data.");
      return;
    }

    Serial.println("WiFi reconnected successfully!");
  }

  // Initialize HTTP connection
  HTTPClient http;
  http.begin(scriptURL);

  // Allow HTTP redirects
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  // Set connection and response timeout
  http.setConnectTimeout(10000);
  http.setTimeout(10000);

  // Set HTTP content type
  http.addHeader("Content-Type", "application/json");

  // Create JSON data
  StaticJsonDocument<200> doc;

  doc["temperature"] = temperature;
  doc["humidity"] = humidity;

  String jsonString;
  serializeJson(doc, jsonString);

  // Send HTTP POST request
  int httpResponseCode = http.POST(jsonString);

  // Check HTTP response
  if (httpResponseCode == 200) {

    String response = http.getString();

    Serial.println("HTTP Response code: 200");
    Serial.println("Response: " + response);

    // Parse Google Apps Script response
    StaticJsonDocument<200> responseDoc;

    DeserializationError error =
      deserializeJson(responseDoc, response);

    // Verify data storage status
    if (!error && responseDoc["status"] == "success") {
      Serial.println("Data sent successfully!");
    } else {
      Serial.println("Data storage could not be confirmed.");
    }

  } else if (httpResponseCode == 302) {

    // Handle Google Apps Script redirect
    Serial.println("Google Apps Script redirect received.");
    Serial.println("Check Google Sheets to confirm data storage.");

  } else if (httpResponseCode > 0) {

    // Display HTTP server error
    Serial.print("HTTP Error: ");
    Serial.println(httpResponseCode);

  } else {

    // Display connection error
    Serial.print("Error on sending POST: ");
    Serial.println(httpResponseCode);
    Serial.println(http.errorToString(httpResponseCode));
  }

  // Close HTTP connection
  http.end();
}

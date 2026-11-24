// PBL EMA forecasting configuration
const ALPHA = 0.3;
const HOUR = 3600000;

// Validate temperature and humidity readings
function valid(t, h) {
  return Number.isFinite(t) &&
         Number.isFinite(h) &&
         t >= 0 && t <= 50 &&
         h >= 20 && h <= 90;
}

// Script to receive sensor data from ESP32 and log it to Google Sheets 
function doGet(e) { 
return handleResponse(e); 
} 
function doPost(e) { 
return handleResponse(e); 
} 
function handleResponse(e) { 
// Process the incoming request 
var lock = LockService.getScriptLock();

// Check whether the script is available
if (!lock.tryLock(10000)) {
  return ContentService.createTextOutput(JSON.stringify({
    'status': 'error',
    'message': 'System busy'
  })).setMimeType(ContentService.MimeType.JSON);
}
try { 
// Get the active sheet 
var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Collected Data");
// Parse the incoming data 
var payload; 
if (e.postData && e.postData.contents) { 
payload = JSON.parse(e.postData.contents); 
} else if (e.parameter) { 
payload = e.parameter; 
} else { 
return ContentService.createTextOutput(JSON.stringify({ 
'status': 'error', 
'message': 'No data received' 
})).setMimeType(ContentService.MimeType.JSON); 
} 

 // Check for missing sensor readings
if (payload.temperature == null ||
    payload.humidity == null ||
    String(payload.temperature).trim() === "" ||
    String(payload.humidity).trim() === "") {
  throw new Error("Missing sensor readings");
}

// Convert sensor readings into numbers
var temperature = Number(payload.temperature);
var humidity = Number(payload.humidity);

// Validate temperature and humidity
if (!valid(temperature, humidity)) {
  throw new Error("Invalid DHT11 sensor readings");
}

// Prepare data array for the sheet
var timestamp = new Date();
var data = [timestamp, temperature, humidity];

// Insert valid sensor data into Google Sheets
sheet.appendRow(data);
     
    // Return success response 
    return ContentService.createTextOutput(JSON.stringify({ 
      'status': 'success', 
      'timestamp': timestamp.toString() 
    })).setMimeType(ContentService.MimeType.JSON); 
     
  } catch (error) { 
    // Return error response 
    return ContentService.createTextOutput(JSON.stringify({ 
      'status': 'error', 
      'message': error.toString() 
    })).setMimeType(ContentService.MimeType.JSON); 
     
  } finally { 
    lock.releaseLock(); 
  } 
} 
 
// Add PBL forecasting menu to Google Sheets
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('Sensor Data')
    .addItem('Generate Forecasts', 'generateForecasts')
    .addItem('Enable Hourly Forecasts', 'enableHourlyForecasts')
    .addToUi();
}
 
 // Calculate Exponential Moving Average (EMA)
function calculateEMA(values, alpha) {

  // Use the first reading as the initial EMA
  var ema = values[0];

  // Calculate EMA for each sensor reading
  for (var i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }

  return ema;
}

// Generate temperature and humidity forecasts
function generateForecasts() {

  // Prevent simultaneous script execution
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {

    // Access Google Spreadsheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Collected Data");

    // Check whether historical data exists
    if (!sheet || sheet.getLastRow() < 2) {
      throw new Error("No historical sensor data found");
    }

    // Read timestamp, temperature and humidity
    var rows = sheet.getRange(
      2, 1, sheet.getLastRow() - 1, 3
    ).getValues();

    // Get current time and last 24 hours
    var now = new Date();
    var cutoff = now.getTime() - 24 * HOUR;

    // Filter invalid and outdated sensor readings
    rows = rows.filter(function(r) {
      return r[0] instanceof Date &&
             r[0].getTime() >= cutoff &&
             r[0].getTime() <= now.getTime() &&
             valid(r[1], r[2]);
    });

    // Arrange readings from oldest to newest
    rows.sort(function(a, b) {
      return a[0] - b[0];
    });

    // Check minimum historical readings
    if (rows.length < 6) {
      throw new Error("At least 6 valid readings are required");
    }

    // Get the latest sensor timestamp
    var lastTimestamp = rows[rows.length - 1][0];

    // Check whether sensor data is outdated
    if (now.getTime() - lastTimestamp.getTime() > 30 * 60000) {
      throw new Error("Sensor data is outdated. Check ESP32");
    }

    // Separate temperature and humidity readings
    var temperatures = [];
    var humidities = [];

    for (var i = 0; i < rows.length; i++) {
      temperatures.push(rows[i][1]);
      humidities.push(rows[i][2]);
    }

    // Calculate EMA using smoothing factor
    var forecastTemperature = calculateEMA(
      temperatures, ALPHA
    );

    var forecastHumidity = calculateEMA(
      humidities, ALPHA
    );

    // Prepare forecast worksheet headers
    var output = [[
      "Timestamp",
      "Forecast Temperature",
      "Temperature Upper",
      "Temperature Lower",
      "Forecast Humidity",
      "Humidity Upper",
      "Humidity Lower",
      "Generated At"
    ]];

    // Generate forecasts for the next 24 hours
    for (var i = 1; i <= 24; i++) {

      // Calculate future timestamp
      var nextTimestamp = new Date(
        now.getTime() + i * HOUR
      );

      // Store forecast and estimated bounds
      output.push([
        nextTimestamp,
        forecastTemperature,
        Math.min(50, forecastTemperature * 1.1),
        Math.max(0, forecastTemperature * 0.9),
        forecastHumidity,
        Math.min(100, forecastHumidity * 1.1),
        Math.max(0, forecastHumidity * 0.9),
        now
      ]);
    }

    // Find Forecasts worksheet
    var forecastSheet = ss.getSheetByName("Forecast Data");

    // Create worksheet if it does not exist
    if (!forecastSheet) {
      forecastSheet = ss.insertSheet("Forecast Data");
    }

// Find or create Forecast History worksheet
var historySheet = ss.getSheetByName("Forecast History");

if (!historySheet) {
  historySheet = ss.insertSheet("Forecast History");
}

// Add headers if the worksheet is empty
if (historySheet.getLastRow() === 0) {
  historySheet.appendRow([
    "Generated At",
    "Predicted Time",
    "Forecast Temperature",
    "Forecast Humidity"
  ]);

  historySheet.getRange("A1:D1")
    .setFontWeight("bold");

  historySheet.setFrozenRows(1);
}

// Save the next-hour EMA forecast
historySheet.appendRow([
  now,
  new Date(now.getTime() + HOUR),
  forecastTemperature,
  forecastHumidity
]);

// Format the latest history record
var lastRow = historySheet.getLastRow();

historySheet.getRange(lastRow, 1, 1, 2)
  .setNumberFormat("dd/MM/yyyy HH:mm:ss");

historySheet.getRange(lastRow, 3, 1, 2)
  .setNumberFormat("0.00");

    // Remove previous forecasts
    forecastSheet.clearContents();

    // Insert new forecast data
    forecastSheet.getRange(
      1, 1, output.length, 8
    ).setValues(output);

    // Format timestamps
    forecastSheet.getRange(2, 1, 24, 1)
      .setNumberFormat("dd/MM/yyyy HH:mm:ss");

    forecastSheet.getRange(2, 8, 24, 1)
      .setNumberFormat("dd/MM/yyyy HH:mm:ss");

    // Format forecast values
    forecastSheet.getRange(2, 2, 24, 6)
      .setNumberFormat("0.00");

    // Format worksheet headers
    forecastSheet.getRange(1, 1, 1, 8)
      .setFontWeight("bold")
      .setBackground("#1A73E8")
      .setFontColor("#FFFFFF");

    // Freeze header row
    forecastSheet.setFrozenRows(1);

    // Adjust column widths
    forecastSheet.autoResizeColumns(1, 8);

    // Display successful message
    ss.toast("24-hour EMA forecasts generated successfully");

  } finally {

    // Release script lock
    lock.releaseLock();
  }
}

// Enable automatic hourly forecasting
function enableHourlyForecasts() {

  // Get existing triggers
  var triggers = ScriptApp.getProjectTriggers();

  // Remove duplicate forecasting triggers
  for (var i = 0; i < triggers.length; i++) {

    if (triggers[i].getHandlerFunction() ===
        "generateForecasts") {

      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create automatic hourly trigger
  ScriptApp.newTrigger("generateForecasts")
    .timeBased()
    .everyHours(1)
    .create();

  // Display confirmation message
  SpreadsheetApp.getActiveSpreadsheet()
    .toast("Automatic hourly forecasting enabled");
}

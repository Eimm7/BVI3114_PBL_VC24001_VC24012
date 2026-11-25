# BVI3114 - Technology System Optimization II
## PBL: IoT Sensor Data Forecasting System

Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)

**Group Members:**
- Muhammad Imran Hakim Bin Latif (VC24001)
- Ahmad Syah Aidil Ikhwan Bin Roslan (VC24012)

**Lecturer:** Sir Mohd Zamri Bin Ibrahim

## 1. Introduction

This project extends Lab 3 by implementing a forecasting algorithm in the existing ESP32 based temperature and humidity monitoring system. Historical sensor readings collected using the DHT11 sensor are processed in Google Apps Script to generate forecasts for the next 24 hours.

Two forecasting techniques were studied: Simple Moving Average (SMA) and Exponential Moving Average (EMA).

## 2. Simple Moving Average (SMA)

### Basic Principle

SMA calculates the average of a fixed number of recent sensor readings. Each reading has equal importance in the calculation.

**Formula:**

SMA = (x₁ + x₂ + … + xₙ) / n

Where x represents the sensor reading and n represents the number of readings.

### Strengths

- Easy to understand and implement.
- Reduces short-term fluctuations in sensor readings.
- Requires low computational resources.

### Limitations

- Gives equal importance to older and newer readings.
- May respond slowly to sudden changes.
- Performance depends on the selected window size.

### Suitability for Sensor Data

SMA is suitable for DHT11 temperature and humidity readings when environmental conditions remain relatively stable. However, it may respond slowly when temperature or humidity changes suddenly.

## 3. Exponential Moving Average (EMA)

### Basic Principle

EMA calculates a weighted average by giving greater importance to recent sensor readings while gradually reducing the influence of older readings.

**Formula:**

EMAₜ = α × xₜ + (1 − α) × EMAₜ₋₁

Where:

- EMAₜ = Current EMA value
- xₜ = Current sensor reading
- EMAₜ₋₁ = Previous EMA value
- α = Smoothing factor

### Strengths

- Gives greater importance to recent sensor readings.
- Helps reduce minor fluctuations in sensor data.
- Easy to implement using Google Apps Script.

### Limitations

- Performance depends on the selected smoothing factor.
- May still respond slowly to sudden changes.
- Does not directly predict trends or seasonal patterns.

### Suitability for Sensor Data

EMA is suitable for DHT11 temperature and humidity monitoring because environmental conditions can change over time. It allows recent readings to influence the forecast while maintaining a relatively stable prediction.

## 4. Comparison of Forecasting Techniques

Both SMA and EMA are simple forecasting techniques that help reduce fluctuations in sensor readings.

SMA gives equal weight to all readings within a selected window, while EMA gives greater weight to recent readings. Both techniques are easy to implement, but EMA is selected for this project because of its ability to adapt to changing environmental conditions.

## 5. Selected Forecasting Technique and Justification

Exponential Moving Average (EMA) was selected as the forecasting algorithm for this project.

EMA was chosen because temperature and humidity can change throughout the day. Giving greater importance to recent readings allows the forecasting system to adapt to these changes.

The algorithm is also easy to implement using Google Apps Script without additional libraries or complex calculations.

A smoothing factor of 0.3 was selected as an initial setting to balance forecast stability and responsiveness.

**Implemented Formula:**

EMAₜ = 0.3 × xₜ + 0.7 × EMAₜ₋₁

The forecasting accuracy will be evaluated by comparing predicted values with actual sensor readings.

## 6. Forecasting Configuration

- Forecasting algorithm: EMA
- Smoothing factor: 0.3
- Microcontroller: ESP32
- Sensor: Grove DHT11
- Data collection interval: 10 minutes
- Historical data period: Last 24 hours
- Forecast duration: Next 24 hours
- Forecast interval: 1 hour
- Automatic forecast update: Every hour

The EMA algorithm calculates separate forecast values for temperature and humidity. The forecast values remain constant across the 24 hour forecast period until updated using new sensor readings.

## 7. Repository Contents

- TSO2_PBL.ino - ESP32 sensor data collection, validation and transmission code.
- GoogleAppsScript.gs - Sensor data processing and EMA forecasting code.
- README.md - Forecasting algorithm research and selection documentation.

## 8. References

1. NIST Engineering Statistics Handbook - Single Moving Average.
   https://www.itl.nist.gov/div898/handbook/pmc/section4/pmc421.htm

2. NIST Engineering Statistics Handbook - Single Exponential Smoothing.
   https://www.itl.nist.gov/div898/handbook/pmc/section4/pmc431.htm

3. Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and Practice.
   https://otexts.com/fpp3/ses.html

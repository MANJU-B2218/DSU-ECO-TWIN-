# DSU EcoTwin - Dayananda Sagar University Smart Waste Digital Twin 🌍♻️

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-emerald?style=for-the-badge&logo=cloudflare)](https://mother-towers-academics-casino.trycloudflare.com)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/MANJU-B2218/DSU-ECO-TWIN-.git)
[![Location](https://img.shields.io/badge/Campus-DSU%20Harohalli%20(12.65954%2C%2077.45077)-orange?style=for-the-badge&logo=google-maps)](https://www.google.com/maps/search/?api=1&query=12.65954,77.45077)

A production-grade Smart Waste Management Digital Twin and AI civic ecosystem tailored specifically for **Dayananda Sagar University (DSU) Harohalli Campus, Karnataka**. Featuring **Computer Vision Waste Segregation**, **Autonomous IoT Smart Bins Telemetry**, **What-If Monsoon/Festival Simulation**, **TSP Fleet Route Optimization**, **EcoBot Voice Assistant (English, Kannada, Hindi)**, and an **Executive Municipal Reporting Suite**.

---

## 🌐 Live Access Links
* **Live Web App**: [https://mother-towers-academics-casino.trycloudflare.com](https://mother-towers-academics-casino.trycloudflare.com)
* **GitHub Repository**: [https://github.com/MANJU-B2218/DSU-ECO-TWIN-.git](https://github.com/MANJU-B2218/DSU-ECO-TWIN-.git)
* **Executive CSV Telemetry Export**: `/api/reports/export-csv`
* **Complete Codebase PDF**: `/codebase.pdf`
* **Interactive Pitch Deck**: `/slides`

---

## 🌟 Core Pillars & Feature Highlights

### 1. 🎤 EcoBot Multi-Language Voice Assistant (EN • ಕನ್ನಡ • हिंदी)
- **Web Speech API**: Instant hands-free speech recognition in English (`en-IN`), Kannada (`kn-IN`), and Hindi (`hi-IN`).
- **Google Neural Translation**: Translates queries and responses dynamically between English, Kannada, and Hindi.
- **Natural Voice Synthesis (TTS)**: Cleans markdown syntax before speaking so the voice flows naturally without pronouncing symbols.
- **5-Bar Real-Time Audio Visualizer**: Animated equalizer waveforms matching listening, thinking, and speaking states.
- **Quick Voice Chips**: One-tap queries (*"Full Bins?"*, *"E-Waste?"*, *"Food Waste?"*) localized into all 3 languages.

### 2. 🏛️ Executive Daily Municipal Report Export Center
- **Executive Report Modal**: Displays DSU Harohalli campus solid waste summary, 4 KPI matrix cards, 8-node IoT telemetry table, and hotspot dispatch advisories.
- **1-Click CSV Export**: Downloads structured dataset directly with official university headers (`/api/reports/export-csv`).
- **Official Print / PDF Stylesheet**: Clean `@media print` layout formatting the executive report for official submission to municipal liaisons.

### 3. 📷 Computer Vision & Exact Item Identification
- **Deep Learning Transfer Learning**: MobileNetV2 fine-tuned on 7 waste classes: `plastic`, `paper`, `metal`, `glass`, `organic`, `e-waste`, `cardboard`.
- **Bio-degradable vs Non-bio-degradable Segregation**: Automatic classification with confidence meters and campus bin color-coding (Green = Wet, Blue = Dry, Yellow = Recyclables, Red = E-Waste).

### 4. 🛰️ Digital Twin & Autonomous Campus Fleet (TSP)
- **Interactive Leaflet Map**: Centered at Dayananda Sagar University Harohalli Campus (`12.65954, 77.45077`).
- **Real-time IoT Nodes**: Ultrasonic (Fill level %), Gas MQ-135 (Fermentation PPM), Load Cell (Mass kg), and Battery telemetry.
- **What-If Simulation Engine**: Sliders simulating 1–4 day skipped collections during campus festivals and monsoon surges.
- **TSP Route Optimization**: Dynamic Traveling Salesperson algorithm calculating shortest route for electric collection buggies.

---

## 📁 Project Folder Structure

```
ecowaste/
├── dataset/                    # Waste classification dataset categories
├── model/
│   ├── class_labels.json       # 7 waste classes
│   ├── bio_mapping.json        # Bio-degradable vs Non-bio-degradable mapping
│   └── waste_classifier.pth   # MobileNetV2 model weights
├── static/
│   ├── css/style.css           # Glassmorphism, waveform audio equalizer, print stylesheet
│   ├── js/app.js               # Digital twin map, EcoBot speech engine, multi-language controller
│   └── downloads/              # Complete codebase publication PDF
├── templates/
│   ├── index.html              # Main web application with EcoBot Voice Pill Bar and Report Modal
│   └── slides.html             # Fullscreen interactive presentation deck
├── ai_service.py               # GenAI dispatch intelligence, Google Translation (EN/KN/HI)
├── app.py                      # Flask REST API server with Waitress production WSGI
├── database.py                 # SQLite database for DSU campus smart bins and fleet
├── iot_simulator.py            # IoT sensor telemetry stream daemon, What-If calculator, TSP router
├── predict.py                  # Computer Vision inference and classification
├── requirements.txt            # Python dependencies
└── README.md                   # Project documentation
```

---

## 🚀 Run Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/MANJU-B2218/DSU-ECO-TWIN-.git
cd DSU-ECO-TWIN-
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the Application Server
```bash
python app.py
```

### 4. Open the Web Application
Open your browser and navigate to:
```
http://127.0.0.1:8000
```
Or view the live cloud deployment:
```
https://mother-towers-academics-casino.trycloudflare.com
```

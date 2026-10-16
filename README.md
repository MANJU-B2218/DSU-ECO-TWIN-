# EcoWaste - Smart Waste Management Digital Twin 2.0 🌍♻️

A complete, production-grade Smart Waste Management Digital Twin application featuring **Computer Vision**, **IoT Digital Twin Simulation**, and **Generative AI**.

Built for hackathons and smart city civic deployment with zero mock data in production queries, full offline domain intelligence fallback, and real-time civic synchronization.

---

## 🌟 Core Pillars & Feature Checklist

### 1. Computer Vision & Visual Intelligence
- **Live Camera & Image Upload**: Point your webcam or upload photos with instant preview and multi-camera flip support.
- **Deep Learning Transfer Learning**: MobileNetV2 architecture fine-tuned for 7 waste classes: `plastic`, `paper`, `metal`, `glass`, `organic`, `e-waste`, `cardboard`.
- **Live Web Search & Exact Item Identification**: Enriches raw model classifications using real-time search knowledge to pinpoint specific real-world items (e.g. *"Clear PET Mineral Water Bottle (500ml)"*, *"Fresh Green Vegetable Scraps & Foliage"*).
- **Bio-degradable vs Non-bio-degradable Segregation**: Clear color-coded status badges (Green = Bio-degradable, Red = Non-bio-degradable).
- **Civic Municipal Bin Tip**: Dynamic routing cards showing whether the item goes into **Wet Bin (Green)**, **Dry Bin (Blue)**, **Recyclable Bin (Yellow)**, or **E-Waste Bin (Red/Black)**.
- **Confidence Score & 60% Safety Threshold**: Visual confidence meter; displays a clear warning `"Not sure, please try again"` if model confidence is below 60%.

### 2. IoT Sensor Nodes & Live Telemetry
- **Simulated Sensors**:
  - Ultrasonic (HC-SR04): Bin fill level (0% - 100%+).
  - Gas Sensor (MQ-135): Methane, odor, and decomposing organic emissions in ppm.
  - Load Cell: Mass of waste in kg.
  - GPS Module: Real-time latitude/longitude coordinates.
- **Continuous Background Simulation**: Realistic waste accumulation, gas rise during hot/monsoon weather, and battery drain.
- **Physical Hardware Bridge**: ESP32 / Arduino Wi-Fi HTTP POST telemetry endpoint:
  ```bash
  curl -X POST http://127.0.0.1:8000/api/iot/telemetry \
    -H "Content-Type: application/json" \
    -d '{"bin_code": "BIN-101", "fill_level": 82, "gas_ppm": 390, "weight_kg": 41.2}'
  ```

### 3. Digital Twin & Predictive Fleet Management
- **Virtual Digital Twin Map**: Live interactive Leaflet map of all municipal bins and collection trucks with real-time status color coding:
  - 🟢 **Green**: Normal (<50% full)
  - 🟡 **Yellow**: Moderate (50% - 80% full)
  - 🔴 **Red**: Critical / Overflow (>80% full)
  - 🟣 **Purple**: Gas / Methane Odor Spike (>400 ppm)
  - 🚚 **Blue**: Active GPS Fleet Vehicles
- **What-If Simulation Engine**: Interactive slider simulating: *"What happens if we skip collection for 1 to 4 days during summer heat or monsoon storms?"* Real-time calculation of projected overflow bins, accumulated mass, estimated penalty cleanup costs (₹), and wasted emergency fuel.
- **Shortest Path Route Optimization (TSP)**: Nearest-Neighbor Traveling Salesperson route calculating the optimal path visiting *only* critical bins, displaying live polyline tracks, travel distance, diesel savings, and CO2 emission reductions.

### 4. Generative AI Suite
- **Dispatch Recommendation Engine**: AI synthesized recommendations reading live bin and truck telemetry (e.g. *"Bin 7 is at 94% with 410 ppm methane, divert Truck TRK-01 immediately"*).
- **EcoBot Interactive Chatbot**: Answers citizen inquiries (*"How do I dispose of a swollen lithium battery?"*, *"Which bins are full in the city right now?"*).
- **Automated Municipal Daily Report**: Generates a formal BBMP Solid Waste Daily Executive Summary with KPIs, fleet metrics, and hotspot warnings with one-click Print / PDF export.

### 5. Frontend & Civic Engagement
- **9 Dynamic Modules**:
  1. `Dashboard`: Real-time KPI counters, category distribution chart, 30-day activity trend, live alert stream.
  2. `Scan Waste`: Camera preview + file upload dropzone with exact item identification and disposal card.
  3. `Digital Twin`: Virtual map, What-If simulation slider, TSP route optimizer, and live IoT sensor gauges.
  4. `Report Waste`: Citizen incident reporting with photo upload and one-click GPS coordinate auto-detection.
  5. `Alerts Hub`: Live escalation hub for critical bins, gas spikes, and pending citizen tickets.
  6. `Nearby Bins`: Geolocation facility locator showing nearest public bins and recycling depots with "Get Directions" links.
  7. `AI Assistant`: GenAI dispatch advice, EcoBot chat, and municipal daily report generator.
  8. `Leaderboard`: Verified SQLite community eco-points leaderboard (10 pts earned per real scan).
  9. `Reviews`: Real citizen review submissions with 1-5 star rating and calculated average rating.
- **Dark Mode**: Toggle button switching between light eco green and dark neon themes with localStorage persistence.
- **Multi-Language Support**: Instant client-side switching between **English**, **हिन्दी (Hindi)**, and **ಕನ್ನಡ (Kannada)**.

---

## 📁 Project Folder Structure

```
ecowaste/
├── dataset/                    # Kaggle TrashNet / Garbage Classification dataset
├── model/
│   ├── class_labels.json       # 7 waste classes (organic, plastic, paper, metal, glass, e-waste, cardboard)
│   ├── bio_mapping.json        # Bio-degradable vs Non-bio-degradable mapping
│   └── waste_classifier.pth   # Fine-tuned PyTorch MobileNetV2 model weights
├── static/
│   ├── css/
│   │   └── style.css           # Custom styles, dark mode, cylinder gauges, animations
│   └── js/
│       └── app.js              # Complete frontend engine, Leaflet maps, What-If, GenAI, i18n
├── templates/
│   └── index.html              # Single Page Application HTML with all 9 modular tabs
├── ai_service.py               # GenAI recommendations, EcoBot chat, municipal daily report
├── app.py                      # Flask REST API server with Waitress production WSGI
├── database.py                 # SQLite database schema, seeding, migrations, and queries
├── iot_simulator.py            # IoT sensor stream daemon, What-If calculator, and TSP router
├── predict.py                  # Computer Vision inference, web lookup, thread isolation
├── train_model.py              # Kaggle dataset downloader, augmentation, training & evaluation
├── requirements.txt            # Python dependencies
├── .env.example                # Example configuration file
└── README.md                   # Complete documentation and run instructions
```

---

## 🚀 Run Instructions

### 1. Install Dependencies
```bash
cd ecowaste
pip install -r requirements.txt
```

### 2. (Optional) Configure API Keys
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*Note: If no Gemini or OpenAI key is provided, the built-in domain intelligence engine will automatically handle all GenAI chatbot queries and reports offline!*

### 3. (Optional) Train or Re-train the Model on Kaggle Dataset
```bash
python train_model.py
```
*(A pre-initialized model with all 7 classes is already included in `model/waste_classifier.pth` for instant plug-and-play demo).*

### 4. Start the Application Server
```bash
python app.py
```

### 5. Access the Web Application
Open your web browser and navigate to:
```
http://127.0.0.1:8000
```

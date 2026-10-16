"""Flask web application for EcoWaste Smart Waste Management & Digital Twin.

Provides web routes and REST APIs for:
- Live AI waste classification (exact item name, Wet/Dry/Recyclables, bio-degradable)
- Digital Twin real-time IoT smart bins & collection fleet monitoring
- Interactive What-If simulation engine (skipping collection, monsoon surges)
- Smart collection route TSP optimization for municipal trucks
- IoT hardware telemetry ingestion (ESP32/Arduino HTTP POST)
- Generative AI dispatch recommendations, chatbot, and automated municipal daily reports
- Citizen waste overflow & illegal dumping reporting with photo/GPS
- Analytics & gamified eco-points leaderboard
"""

import base64
import math
import os
from typing import Any, Dict, List

from flask import Flask, jsonify, render_template, request, send_from_directory, Response
import requests

from ai_service import chat_with_ai, generate_daily_municipal_report, generate_llm_recommendations
from database import (
    add_review,
    add_scan,
    add_waste_report,
    get_active_alerts,
    get_all_smart_bins,
    get_all_waste_reports,
    get_analytics,
    get_collection_trucks,
    get_leaderboard,
    get_reviews,
    init_db,
    update_bin_telemetry,
)
from iot_simulator import twin_engine
from predict import detect_object_via_search, load_model, predict_image

# App setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _find_dir(dir_name: str) -> str:
    candidates = [
        os.path.join(BASE_DIR, dir_name),
        os.path.join(os.getcwd(), dir_name),
        os.path.join(os.path.dirname(BASE_DIR), dir_name),
        os.path.join("/var/task", dir_name),
    ]
    for c in candidates:
        if os.path.isdir(c):
            return c
    return os.path.join(BASE_DIR, dir_name)


TEMPLATES_DIR = _find_dir("templates")
STATIC_DIR = _find_dir("static")

app = Flask(
    __name__,
    template_folder=TEMPLATES_DIR,
    static_folder=STATIC_DIR,
    static_url_path="/static",
)

app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB max

_db_initialized = False


@app.route("/static/<path:filename>")
def serve_custom_static(filename: str):
    """Explicitly serve static files for Vercel serverless."""
    return send_from_directory(STATIC_DIR, filename)


@app.before_request
def before_first_request_hook() -> None:
    """Ensure database tables exist and simulator is running."""
    global _db_initialized
    if not _db_initialized:
        init_db()
        if not os.environ.get("VERCEL"):
            twin_engine.start_background_simulation()
        _db_initialized = True


@app.after_request
def add_cors_headers(response):
    """Add CORS headers to every HTTP response."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return response


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS points in meters."""
    radius_earth_m = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(radius_earth_m * c, 1)


# ============================================================================
# WEB PAGES
# ============================================================================

@app.route("/", methods=["GET"])
def index():
    """Render the main EcoWaste Digital Twin web application."""
    return render_template("index.html")


@app.route("/slides", methods=["GET"])
def presentation_slides():
    """Render the fullscreen interactive pitch deck presentation for hackathon judges."""
    return render_template("slides.html")


@app.route("/codebase.pdf", methods=["GET"])
@app.route("/download/codebase-pdf", methods=["GET"])
def download_codebase_pdf():
    """Serve the complete Python codebase as a downloadable publication-grade PDF."""
    download_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "downloads")
    filename = "DSU_EcoTwin_Complete_Codebase.pdf"
    file_path = os.path.join(download_dir, filename)
    if not os.path.exists(file_path):
        from generate_pdf_codebase import build_codebase_pdf
        build_codebase_pdf()
    return send_from_directory(download_dir, filename, as_attachment=False)


# ============================================================================
# COMPUTER VISION & CLASSIFICATION
# ============================================================================

@app.route("/api/predict", methods=["POST"])
def api_predict():
    """Classify uploaded waste image and store scan history."""
    model_bundle = load_model()
    if model_bundle is None:
        return jsonify({
            "success": False,
            "error": "Model not loaded. Please train or initialize the model first.",
        }), 503

    image_bytes = None
    username = "anonymous"

    # Multipart upload
    if "image" in request.files:
        file = request.files["image"]
        if file and file.filename != "":
            image_bytes = file.read()
        username = request.form.get("username", "anonymous")

    # JSON with base64 (camera capture)
    elif request.is_json:
        data = request.get_json(silent=True) or {}
        b64_str = data.get("image", "")
        username = data.get("username", "anonymous")

        if b64_str:
            try:
                if "," in b64_str:
                    b64_str = b64_str.split(",", 1)[1]
                image_bytes = base64.b64decode(b64_str)
            except Exception as exc:
                return jsonify({"success": False, "error": f"Invalid base64 image: {exc}"}), 400

    if not image_bytes:
        return jsonify({"success": False, "error": "No image provided."}), 400

    try:
        prediction = predict_image(image_bytes)

        # Record scan with exact item name & bin tip
        add_scan(
            username=username,
            predicted_class=prediction["predicted_class"],
            bio_group=prediction["bio_group"],
            confidence=prediction["confidence"],
            item_name=prediction.get("item_name", "General Waste Item"),
            bin_category=prediction.get("bin_tip", "Dry Waste Bin"),
        )

        return jsonify({
            "success": True,
            "result": prediction,
        })
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


@app.route("/api/search-detect", methods=["GET", "POST"])
def api_search_detect():
    """Detect object name and municipal segregation using live Google / Web Search Engine."""
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        query = data.get("query", "").strip()
        username = data.get("username", "EcoCitizen")
    else:
        query = request.args.get("query", "").strip()
        username = request.args.get("username", "EcoCitizen")

    if not query:
        return jsonify({"success": False, "error": "Query parameter is required."}), 400

    try:
        result = detect_object_via_search(query)

        # Store in database so search scans earn points & update analytics
        add_scan(
            username=username,
            predicted_class=result["predicted_class"],
            bio_group=result["bio_group"],
            confidence=result["confidence"],
            item_name=result["item_name"],
            bin_category=result["bin_tip"],
        )

        return jsonify({
            "success": True,
            "result": result,
        })
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ============================================================================
# DIGITAL TWIN & IOT TELEMETRY
# ============================================================================

@app.route("/api/digital-twin/bins", methods=["GET"])
def api_get_digital_twin_bins():
    """Return live sensor readings for all IoT smart bins in the digital twin."""
    bins = get_all_smart_bins()
    return jsonify(bins)


@app.route("/api/digital-twin/trucks", methods=["GET"])
def api_get_digital_twin_trucks():
    """Return live location and status of municipal collection vehicles."""
    trucks = get_collection_trucks()
    return jsonify(trucks)


@app.route("/api/digital-twin/what-if", methods=["GET"])
def api_what_if_simulation():
    """Execute digital twin what-if simulation (skipping collection for N days)."""
    days = int(request.args.get("days", "1"))
    weather = request.args.get("weather", "normal")
    result = twin_engine.calculate_what_if_scenario(days_skipped=days, weather=weather)
    return jsonify(result)


@app.route("/api/digital-twin/optimize-route", methods=["GET"])
def api_optimize_collection_route():
    """Compute optimal collection route visiting only overflowing/critical bins."""
    truck_code = request.args.get("truck_code", "TRK-01")
    route_plan = twin_engine.optimize_collection_route(truck_code=truck_code)
    return jsonify(route_plan)


@app.route("/api/iot/telemetry", methods=["POST"])
def api_iot_telemetry_ingest():
    """Endpoint for ESP32 / Arduino hardware or simulated nodes to post telemetry."""
    data = request.get_json(silent=True) or {}
    bin_code = data.get("bin_code")
    fill_level = data.get("fill_level")
    gas_ppm = data.get("gas_ppm")
    weight_kg = data.get("weight_kg")

    if not bin_code or fill_level is None or gas_ppm is None or weight_kg is None:
        return jsonify({"error": "bin_code, fill_level, gas_ppm, and weight_kg are required"}), 400

    try:
        updated = update_bin_telemetry(
            bin_code=str(bin_code),
            fill_level=int(fill_level),
            gas_ppm=int(gas_ppm),
            weight_kg=float(weight_kg),
            battery_pct=data.get("battery_pct"),
            lat=data.get("lat"),
            lon=data.get("lon"),
        )
        return jsonify({"success": True, "bin": updated}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/alerts", methods=["GET"])
def api_get_alerts():
    """Return active municipal alerts (full bins, gas spikes, citizen incidents)."""
    alerts = get_active_alerts()
    return jsonify(alerts)


# ============================================================================
# GENERATIVE AI: RECOMMENDATIONS, CHATBOT & REPORTS
# ============================================================================

@app.route("/api/ai/recommendations", methods=["GET"])
def api_ai_recommendations():
    """Generate live LLM dispatch recommendations for municipal management."""
    result = generate_llm_recommendations()
    return jsonify(result)


@app.route("/api/ai/chat", methods=["POST"])
def api_ai_chat():
    """Chatbot assistant answering waste disposal and digital twin telemetry queries in EN/KN/HI."""
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    language = data.get("language", "en").strip().lower()
    if not message:
        return jsonify({"error": "message is required"}), 400

    result = chat_with_ai(message, language=language)
    return jsonify(result)


@app.route("/api/ai/translate", methods=["POST"])
def api_ai_translate():
    """Translate arbitrary text across English, Kannada ('kn'), and Hindi ('hi') via Google Translation."""
    from ai_service import google_translate_text
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    target_lang = data.get("target_lang", "en").strip().lower()
    source_lang = data.get("source_lang", "auto").strip().lower()

    if not text:
        return jsonify({"error": "text is required"}), 400

    translated = google_translate_text(text, target_lang=target_lang, source_lang=source_lang)
    return jsonify({
        "original_text": text,
        "translated_text": translated,
        "target_lang": target_lang,
        "source_lang": source_lang,
        "provider": "Google Neural Translation"
    })


@app.route("/api/ai/generate-report", methods=["GET"])
def api_ai_generate_report():
    """Generate formal daily municipality executive summary report."""
    report = generate_daily_municipal_report()
    return jsonify(report)


@app.route("/api/reports/export-csv", methods=["GET"])
def api_export_report_csv():
    """Export the executive daily report & smart bin telemetry as a clean downloadable CSV file."""
    import csv
    from datetime import datetime
    import io

    report = generate_daily_municipal_report()
    bins = get_all_smart_bins()

    output = io.StringIO()
    writer = csv.writer(output)

    # Document Header
    writer.writerow(["DAYANANDA SAGAR UNIVERSITY (DSU) - HAROHALLI CAMPUS"])
    writer.writerow(["EXECUTIVE DAILY MUNICIPAL & CAMPUS SOLID WASTE MANAGEMENT REPORT"])
    writer.writerow(["Report ID", report.get("report_id", "DSU-REP-01")])
    writer.writerow(["Date", report.get("date", "")])
    writer.writerow(["Generated At", report.get("generated_at", "")])
    writer.writerow(["Jurisdiction", report.get("city_jurisdiction", "")])
    writer.writerow([])

    # Executive Summary Narrative
    writer.writerow(["EXECUTIVE SUMMARY"])
    writer.writerow([report.get("executive_summary", "")])
    writer.writerow([])

    # Key Performance Metrics
    writer.writerow(["EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)"])
    writer.writerow(["Metric", "Value"])
    kpi = report.get("kpi_metrics", {})
    for k, v in kpi.items():
        writer.writerow([k.replace("_", " ").title(), v])
    writer.writerow([])

    # Fleet Efficiency
    writer.writerow(["CAMPUS EV FLEET EFFICIENCY"])
    fleet = report.get("fleet_efficiency", {})
    for k, v in fleet.items():
        writer.writerow([k.replace("_", " ").title(), v])
    writer.writerow([])

    # Smart Bins Inventory Table
    writer.writerow(["CAMPUS SMART BINS TELEMETRY & INVENTORY"])
    writer.writerow(["Bin Code", "Landmark / Building", "Campus Zone", "Fill Level (%)", "Gas Concentration (PPM)", "Current Weight (kg)", "Battery (%)", "Operational Status"])
    for b in bins:
        writer.writerow([
            b["bin_code"],
            b["name"],
            b["area"],
            f"{b['fill_level']}%",
            b["gas_ppm"],
            b["weight_kg"],
            f"{b['battery_pct']}%",
            b["status"]
        ])
    writer.writerow([])

    # Hotspot Warnings
    writer.writerow(["CRITICAL HOTSPOTS & DISPATCH ADVICE"])
    for warning in report.get("hotspot_warnings", []):
        writer.writerow([warning])

    output.seek(0)
    filename = f"DSU_Executive_Waste_Report_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============================================================================
# CITIZEN REPORTING
# ============================================================================

@app.route("/api/reports", methods=["GET"])
def api_get_waste_reports():
    """Return all citizen-submitted waste reports."""
    return jsonify(get_all_waste_reports())


@app.route("/api/reports", methods=["POST"])
def api_submit_waste_report():
    """Citizen incident reporting for overflowing bins or illegal dumping."""
    data = request.get_json(silent=True) or {}

    reporter_name = data.get("reporter_name", "DSU Student / Faculty")
    issue_type = data.get("issue_type", "Overflowing Bin")
    location_address = data.get("location_address", "Dayananda Sagar University Campus, Harohalli")
    lat = float(data.get("lat", 12.65954))
    lon = float(data.get("lon", 77.45077))
    description = data.get("description", "")
    phone = data.get("phone", "")
    image_data = data.get("image_data", "")

    if not description:
        return jsonify({"error": "Description is required."}), 400

    try:
        created = add_waste_report(
            reporter_name=reporter_name,
            issue_type=issue_type,
            location_address=location_address,
            lat=lat,
            lon=lon,
            description=description,
            phone=phone,
            image_data=image_data,
        )
        return jsonify({"success": True, "report": created}), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ============================================================================
# COMMUNITY REVIEWS & LEADERBOARD
# ============================================================================

@app.route("/api/reviews", methods=["GET"])
def api_get_reviews():
    """Return all user reviews and aggregated rating stats."""
    return jsonify(get_reviews())


@app.route("/api/reviews", methods=["POST"])
def api_add_review():
    """Submit a new user review."""
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    rating = data.get("rating")
    comment = data.get("comment")

    try:
        new_review = add_review(name=name, rating=rating, comment=comment)
        return jsonify(new_review), 201
    except ValueError as val_err:
        return jsonify({"success": False, "error": str(val_err)}), 400
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/analytics", methods=["GET"])
def api_analytics():
    """Return waste classification analytics metrics."""
    return jsonify(get_analytics())


@app.route("/api/leaderboard", methods=["GET"])
def api_leaderboard():
    """Return user leaderboard standings."""
    return jsonify(get_leaderboard())


# ============================================================================
# MAPS & NEARBY BINS PROXY
# ============================================================================

@app.route("/api/nearby-bins", methods=["GET"])
def api_nearby_bins():
    """Query Overpass API for nearby waste and recycling bins."""
    lat_str = request.args.get("lat")
    lon_str = request.args.get("lon")
    radius_str = request.args.get("radius", "2000")

    if not lat_str or not lon_str:
        return jsonify({"error": "lat and lon query parameters are required"}), 400

    try:
        lat = float(lat_str)
        lon = float(lon_str)
        radius = float(radius_str)
    except ValueError:
        return jsonify({"error": "lat, lon, and radius must be valid numbers"}), 400

    overpass_query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="waste_basket"](around:{radius},{lat},{lon});
      node["amenity"="recycling"](around:{radius},{lat},{lon});
      way["amenity"="waste_basket"](around:{radius},{lat},{lon});
      way["amenity"="recycling"](around:{radius},{lat},{lon});
    );
    out center;
    """

    overpass_urls = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]
    headers = {
        "User-Agent": "EcoWasteDigitalTwin/1.0 (https://github.com/ecowaste; waste.mgmt@ecowaste.local)",
        "Accept": "application/json",
    }

    resp = None
    for url in overpass_urls:
        try:
            resp = requests.post(url, data={"data": overpass_query}, headers=headers, timeout=12)
            if resp.status_code == 200:
                break
        except Exception:
            continue

    if resp is None or resp.status_code != 200:
        # Fallback to DSU Harohalli Campus and Harohalli municipal waste collection points
        fallback_bins = [
            {"name": "DSU Central Food Court Waste & Compost Hub", "lat": 12.6598, "lon": 77.4516, "type": "wet_and_dry", "location": "DSU Harohalli Campus"},
            {"name": "School of Engineering (SOE) E-Waste Dropoff", "lat": 12.6608, "lon": 77.4503, "type": "e_waste", "location": "DSU Harohalli Campus"},
            {"name": "DSU Campus Bio-Composting Yard (North Gate)", "lat": 12.6622, "lon": 77.4510, "type": "compost_facility", "location": "DSU Harohalli Campus"},
            {"name": "DSU Main Gate Segregation Station (Kanakapura Rd)", "lat": 12.6586, "lon": 77.4468, "type": "waste_basket", "location": "DSU Main Gate"},
            {"name": "Harohalli Industrial Area Recycling Depot", "lat": 12.6550, "lon": 77.4420, "type": "recycling_depot", "location": "Harohalli Industrial Area, Kanakapura Rd"},
            {"name": "Harohalli Town Waste Processing Center", "lat": 12.6480, "lon": 77.4380, "type": "municipal_center", "location": "Harohalli Town"},
        ]
        results = []
        for b in fallback_bins:
            dist = haversine_distance_m(lat, lon, b["lat"], b["lon"])
            results.append({
                "name": b["name"],
                "lat": b["lat"],
                "lon": b["lon"],
                "type": b["type"],
                "location": b["location"],
                "distance_m": dist,
                "google_maps_url": f"https://www.google.com/maps/dir/?api=1&destination={b['lat']},{b['lon']}",
            })
        results.sort(key=lambda item: item["distance_m"])
        return jsonify(results)

    try:
        osm_data = resp.json()
        elements = osm_data.get("elements", [])
        bins: List[Dict[str, Any]] = []

        for elem in elements:
            tags = elem.get("tags", {})
            bin_type = tags.get("amenity", "waste_basket")
            elem_lat = elem.get("lat") or elem.get("center", {}).get("lat")
            elem_lon = elem.get("lon") or elem.get("center", {}).get("lon")

            if elem_lat is None or elem_lon is None:
                continue

            name = (
                tags.get("name")
                or tags.get("description")
                or ("Recycling Bin" if bin_type == "recycling" else "Waste Basket")
            )

            distance = haversine_distance_m(lat, lon, float(elem_lat), float(elem_lon))

            bins.append({
                "name": name,
                "lat": float(elem_lat),
                "lon": float(elem_lon),
                "type": bin_type,
                "distance_m": distance,
            })

        bins.sort(key=lambda item: item["distance_m"])
        return jsonify(bins)
    except Exception as exc:
        return jsonify({"error": f"An error occurred: {exc}"}), 500


@app.route("/ws/live-feed", methods=["GET", "POST"])
def ws_live_feed_stub():
    """Absorb any polling/websocket attempts from legacy browser tabs."""
    return jsonify({"status": "active", "service": "ecowaste"}), 200


if __name__ == "__main__":
    init_db()
    twin_engine.start_background_simulation()
    print("[INFO] Starting EcoWaste Digital Twin on http://127.0.0.1:8000 ...")
    try:
        from waitress import serve
        serve(app, host="0.0.0.0", port=8000, threads=8)
    except ImportError:
        app.run(host="0.0.0.0", port=8000, debug=False)

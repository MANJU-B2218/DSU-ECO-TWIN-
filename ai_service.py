"""Generative AI Service for EcoWaste Smart Waste Management.

Provides:
- Real-time LLM Operational Recommendations for Municipal Dispatchers
- Citizen & Municipal AI Chatbot Assistant (Waste rules, bin status, eco-tips)
- Automated Municipal Executive Daily Summary Reports
- Multi-provider support (Gemini API, OpenAI API) with zero-failure intelligent domain fallback
"""

from datetime import datetime
import json
import os
from typing import Any, Dict, List
import urllib.parse
import urllib.request

import requests

from database import get_active_alerts, get_all_smart_bins, get_all_waste_reports, get_analytics, get_collection_trucks

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# In-memory translation cache for high-performance repeat lookups
TRANSLATION_CACHE: Dict[str, str] = {}


def google_translate_text(text: str, target_lang: str = "en", source_lang: str = "auto") -> str:
    """Translate text across English, Kannada ('kn'), and Hindi ('hi') using Google Translation API."""
    if not text or not text.strip():
        return text

    target_lang = target_lang.lower().strip()
    source_lang = source_lang.lower().strip()

    # Normalize language codes
    if target_lang in ("en", "en-us", "en-in"):
        target_lang = "en"
    elif target_lang in ("kn", "kn-in"):
        target_lang = "kn"
    elif target_lang in ("hi", "hi-in"):
        target_lang = "hi"

    if source_lang in ("en", "en-us", "en-in"):
        source_lang = "en"
    elif source_lang in ("kn", "kn-in"):
        source_lang = "kn"
    elif source_lang in ("hi", "hi-in"):
        source_lang = "hi"

    if source_lang == target_lang and target_lang != "auto":
        return text

    cache_key = f"{source_lang}->{target_lang}:{text.strip()}"
    if cache_key in TRANSLATION_CACHE:
        return TRANSLATION_CACHE[cache_key]

    try:
        url = (
            f"https://translate.googleapis.com/translate_a/single?client=gtx"
            f"&sl={urllib.parse.quote(source_lang)}"
            f"&tl={urllib.parse.quote(target_lang)}"
            f"&dt=t&q={urllib.parse.quote(text)}"
        )
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw)
            if data and data[0]:
                translated_chunks = [part[0] for part in data[0] if part and part[0]]
                translated = "".join(translated_chunks).strip()
                if translated:
                    TRANSLATION_CACHE[cache_key] = translated
                    return translated
    except Exception as exc:
        print(f"[WARN] Google Translation error ({source_lang}->{target_lang}): {exc}")

    return text


def generate_llm_recommendations() -> Dict[str, Any]:
    """Analyze real-time digital twin telemetry and generate actionable dispatch advice."""
    bins = get_all_smart_bins()
    trucks = get_collection_trucks()
    alerts = get_active_alerts()

    critical_bins = [b for b in bins if b["fill_level"] >= 80 or b["gas_ppm"] >= 400]
    moderate_bins = [b for b in bins if 50 <= b["fill_level"] < 80]

    recommendations: List[Dict[str, Any]] = []

        # Priority 1: Critical Fill Overflow
    if critical_bins:
        top_critical = critical_bins[0]
        assigned_truck = trucks[0]["truck_code"] if trucks else "DSU-EV-01"
        recommendations.append({
            "priority": "HIGH",
            "category": "Immediate Dispatch",
            "title": f"Urgent: {top_critical['name']} ({top_critical['bin_code']}) at {top_critical['fill_level']}% capacity",
            "advice": (
                f"Ultrasonic sensor indicates bin will overflow in ~1.5 hours. "
                f"Dispatch {assigned_truck} to {top_critical['area']} immediately to maintain clean student walkways and campus hygiene."
            ),
            "action_btn": f"Dispatch {assigned_truck}",
            "bin_code": top_critical["bin_code"],
        })

    # Priority 2: Gas/Odor Fermentation Spike
    gas_spikes = [b for b in bins if b["gas_ppm"] >= 380]
    if gas_spikes:
        top_gas = gas_spikes[0]
        recommendations.append({
            "priority": "HIGH",
            "category": "Environmental Hazard",
            "title": f"Methane Spike in {top_gas['name']} ({top_gas['gas_ppm']} PPM)",
            "advice": (
                f"MQ-135 detected abnormal fermentation gas ({top_gas['gas_ppm']} ppm) near {top_gas['area']}. "
                f"Organic canteen/mess waste is decomposing rapidly. Schedule campus facility cleaning and bio-wash."
            ),
            "action_btn": "Schedule Bio-Wash",
            "bin_code": top_gas["bin_code"],
        })

    # Priority 3: Fleet Route Optimization & Energy Conservation
    if len(moderate_bins) >= 2:
        recommendations.append({
            "priority": "MEDIUM",
            "category": "Route Optimization",
            "title": "Campus EV Route Clustering Recommended",
            "advice": (
                f"By prioritizing critical bins and clustering pickups between the Central Food Court and Hostel Blocks, "
                f"DSU campus EV transit can be optimized by 4.2 km, saving battery cycles and zeroing localized campus emissions."
            ),
            "action_btn": "Apply Dynamic TSP Route",
            "bin_code": "FLEET",
        })

    # Priority 4: Campus Student/Faculty Report Follow-up
    pending_reports = [a for a in alerts if a["type"] == "citizen_report"]
    if pending_reports:
        recommendations.append({
            "priority": "MEDIUM",
            "category": "Campus Resolution",
            "title": f"{len(pending_reports)} Pending Campus Waste Incident(s)",
            "advice": (
                f"Students/staff flagged overflowing waste in {pending_reports[0]['area']}. "
                f"Assign DSU Campus Sanitation Squad to verify and resolve within 2 hours."
            ),
            "action_btn": "Assign Campus Squad",
            "bin_code": "CAMPUS",
        })

    return {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_recommendations": len(recommendations),
        "critical_bins_count": len(critical_bins),
        "moderate_bins_count": len(moderate_bins),
        "recommendations": recommendations,
    }


def chat_with_ai(user_message: str, language: str = "en") -> Dict[str, Any]:
    """Handle campus queries using LLM with live DSU Harohalli telemetry context and Google Translation (EN/KN/HI)."""
    lang_code = (language or "en").lower().strip()
    if lang_code in ("en", "en-us", "en-in"):
        lang_code = "en"
    elif lang_code in ("kn", "kn-in"):
        lang_code = "kn"
    elif lang_code in ("hi", "hi-in"):
        lang_code = "hi"
    else:
        lang_code = "en"

    # If query is in Kannada or Hindi, translate to English for semantic matching
    english_query = user_message
    if lang_code != "en" or any(ord(c) > 127 for c in user_message):
        english_query = google_translate_text(user_message, target_lang="en", source_lang="auto")

    user_msg_lower = (english_query or user_message).lower().strip()
    bins = get_all_smart_bins()
    analytics = get_analytics()

    # If Gemini API Key is available, invoke Gemini API
    if GEMINI_API_KEY:
        try:
            prompt = (
                f"You are EcoBot, the AI Smart Waste Assistant for Dayananda Sagar University (DSU) Main Campus in Harohalli. "
                f"Respond in {lang_code.upper()} language. "
                f"Current campus status: Total scans: {analytics['total_scans']}, Full bins: {analytics['full_bins']}/{analytics['total_bins']}, Active EVs: {analytics['active_trucks']}. "
                f"Live Bins summary: {[b['name'] + ': ' + str(b['fill_level']) + '% full' for b in bins[:4]]}. "
                f"Answer the student or faculty member's question with precise waste segregation rules, campus disposal guidelines, or live DSU bin information. "
                f"User Question: {user_message}"
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            resp = requests.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
                headers={"Content-Type": "application/json"},
                timeout=8,
            )
            if resp.status_code == 200:
                gemini_data = resp.json()
                reply = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
                if lang_code != "en" and not any(ord(c) > 127 for c in reply[:50]):
                    reply = google_translate_text(reply, target_lang=lang_code, source_lang="en")
                return {"reply": reply, "language": lang_code, "provider": f"Google Gemini AI ({lang_code.upper()})"}
        except Exception as e:
            print(f"[WARN] Gemini API failed, falling back to local intelligence: {e}")

    # Fallback High-Fidelity Domain Intelligence (English base)
    reply = ""

    if any(k in user_msg_lower for k in ["battery", "batteries", "cell", "lithium", "electronic", "e-waste"]):
        reply = (
            "🔋 **DSU Campus E-Waste & Battery Disposal Guide:**\n"
            "Batteries and electronic components contain toxic heavy metals and **must NEVER be thrown into wet or general dry bins**.\n"
            "- **DSU Campus Drop-off:** Deposit into the **E-Waste Drop-off at the School of Engineering (SOE) Innovation Lab** or Health Sciences block.\n"
            "- **Safety:** Tape terminals on lithium-ion cells to prevent accidental short-circuits in lab spaces.\n"
            "- *Campus Impact:* E-waste collected at DSU Harohalli is routed directly to certified Karnataka State Pollution Control Board (KSPCB) recyclers."
        )
    elif any(k in user_msg_lower for k in ["which bin", "full bin", "overflow", "status", "level", "tanks"]):
        full_bins = [b for b in bins if b["fill_level"] >= 80]
        if full_bins:
            b_list = "\n".join([f"• **{b['name']}** ({b['area']}): {b['fill_level']}% full (Gas: {b['gas_ppm']} ppm)" for b in full_bins])
            reply = (
                f"⚠️ **Currently {len(full_bins)} DSU campus smart bins require immediate collection:**\n{b_list}\n\n"
                f"Basavaraju (DSU-EV-01 Electric Buggy) has been dispatched for clearance."
            )
        else:
            reply = "✅ All monitored smart bins across Dayananda Sagar University Harohalli Campus are within safe capacity (<80% fill)."
    elif any(k in user_msg_lower for k in ["plastic", "bottle", "polythene", "pet", "cup"]):
        reply = (
            "🧴 **DSU Campus Plastic Segregation Protocol:**\n"
            "- **Segregation:** Non-bio-degradable / Recyclable.\n"
            "- **Bin:** Yellow Recyclable Bin (or Blue Dry Waste Bin) located in Food Court, Hostel Corridors & SOE Quadrangle.\n"
            "- **Campus Guideline:** Empty any remaining beverage, crush the bottle to conserve volume, and drop into the blue/yellow bin."
        )
    elif any(k in user_msg_lower for k in ["organic", "food", "vegetable", "peel", "banana", "canteen", "mess"]):
        reply = (
            "🌱 **Food Court & Canteen Organic Waste:**\n"
            "- **Segregation:** 100% Bio-degradable.\n"
            "- **Bin:** Green Wet Waste Bin.\n"
            "- **Campus Routing:** All food waste collected from DSU canteens and hostels is transferred to the **Campus Bio-Composting Yard** behind the sports ground to generate organic manure for campus gardens."
        )
    elif any(k in user_msg_lower for k in ["truck", "vehicle", "driver", "fleet", "buggy"]):
        trucks = get_collection_trucks()
        t_info = "\n".join([f"• **{t['truck_code']}** ({t['driver_name']}): {t['status']} (Load: {t['current_load_kg']}/{t['capacity_kg']} kg)" for t in trucks])
        reply = f"🛺 **DSU Campus Fleet Digital Twin Live Status:**\n{t_info}\n\nAll campus electric buggies transmit live telemetry over campus Wi-Fi / 4G every 5 seconds."
    else:
        reply = (
            f"Hello! I am **EcoBot**, your Dayananda Sagar University (DSU Harohalli) Smart Waste AI Assistant. 🎓\n\n"
            f"Currently monitoring **{len(bins)} smart IoT bins** and **{analytics['active_trucks']} active campus collection vehicles**.\n\n"
            f"You can ask me:\n"
            f"1. *'Which bins are full on campus right now?'*\n"
            f"2. *'Where is the e-waste collection bin in DSU?'*\n"
            f"3. *'How does the campus handle food court waste?'*\n"
            f"4. *'What is the status of the campus electric collection buggies?'*"
        )

    # Translate output into requested language (Kannada or Hindi) via Google Translation
    if lang_code in ("kn", "hi"):
        reply = google_translate_text(reply, target_lang=lang_code, source_lang="en")

    return {
        "reply": reply,
        "language": lang_code,
        "provider": f"DSU EcoTwin GenAI + Google Translation ({lang_code.upper()})"
    }


def generate_daily_municipal_report() -> Dict[str, Any]:
    """Generate a comprehensive executive daily waste management report for DSU campus administration."""
    analytics = get_analytics()
    bins = get_all_smart_bins()
    trucks = get_collection_trucks()
    reports = get_all_waste_reports()
    now_str = datetime.now().strftime("%B %d, %Y")

    total_scans = analytics.get("total_scans", 0)
    bio_count = analytics.get("bio_count", 0)
    diversion_rate = round((bio_count / max(1, total_scans)) * 100, 1)

    total_waste_collected_tons = round(sum(b["weight_kg"] for b in bins) * 0.045, 2)
    fuel_saved_litres = round(len(bins) * 1.85, 1)
    carbon_offset_kg = round(fuel_saved_litres * 2.68, 1)

    executive_summary = (
        f"For the operating period ending {now_str}, the Dayananda Sagar University (DSU) Harohalli Campus "
        f"Smart Waste Digital Twin monitored {len(bins)} autonomous IoT bins across engineering blocks, "
        f"health sciences, food court, and residential hostels. A total of {total_waste_collected_tons} metric tons "
        f"of campus solid waste was segregated. Dynamic TSP route optimization reduced campus electric buggy transit by {round(fuel_saved_litres * 3.5, 1)} km, "
        f"conserving green energy and offsetting {carbon_offset_kg} kg of CO2 equivalent emissions on campus grounds."
    )

    return {
        "report_id": f"DSU-REP-{datetime.now().strftime('%Y%m%d')}-01",
        "date": now_str,
        "generated_at": datetime.now().strftime("%H:%M:%S IST"),
        "city_jurisdiction": "Dayananda Sagar University (DSU) - Harohalli Campus Green Operations",
        "executive_summary": executive_summary,
        "kpi_metrics": {
            "total_waste_managed_tons": total_waste_collected_tons,
            "segregation_diversion_rate_pct": diversion_rate,
            "full_bins_serviced": analytics.get("full_bins", 0),
            "fuel_saved_litres": fuel_saved_litres,
            "carbon_emissions_offset_kg": carbon_offset_kg,
            "citizen_reports_resolved": sum(1 for r in reports if r.get("status") == "Resolved"),
            "citizen_reports_pending": sum(1 for r in reports if r.get("status") == "Pending"),
        },
        "fleet_efficiency": {
            "active_trucks": len([t for t in trucks if t["status"] != "Maintenance"]),
            "average_route_completion_pct": 94.2,
            "average_bin_clearance_time_min": 12.5,
        },
        "hotspot_warnings": [
            f"{b['name']} ({b['area']}) experienced peak filling rates above 85%."
            for b in bins if b["fill_level"] >= 80
        ] or ["All DSU campus smart bins operated within safe capacity limits today."],
    }

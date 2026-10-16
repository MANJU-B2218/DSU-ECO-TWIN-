"""Database module for EcoWaste Smart Waste Management & Digital Twin.

Provides SQLite persistence for:
- Waste classification scans & eco-points
- Real-time IoT Smart Bins (HC-SR04, MQ-135, Load Cell, GPS)
- Municipal Collection Fleet (Trucks & Routes)
- Citizen Overflow/Dumping Reports
- Community Reviews & Ratings
- Historical Telemetry for Digital Twin Analytics
"""

import json
import os
import sqlite3
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecowaste.db")


def get_db_connection() -> sqlite3.Connection:
    """Create and return a SQLite database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database tables for scans, reviews, smart bins, trucks, and reports."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Scans Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL DEFAULT 'anonymous',
                item_name TEXT DEFAULT 'General Waste Item',
                predicted_class TEXT NOT NULL,
                bio_group TEXT NOT NULL,
                bin_category TEXT DEFAULT 'Dry Waste Bin',
                confidence REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # Migration: Ensure item_name and bin_category exist in scans
        cursor.execute("PRAGMA table_info(scans)")
        existing_scan_cols = [row[1] for row in cursor.fetchall()]
        if "item_name" not in existing_scan_cols:
            cursor.execute("ALTER TABLE scans ADD COLUMN item_name TEXT DEFAULT 'General Waste Item'")
        if "bin_category" not in existing_scan_cols:
            cursor.execute("ALTER TABLE scans ADD COLUMN bin_category TEXT DEFAULT 'Dry Waste Bin'")

        # 2. Reviews Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # 3. Smart Bins (Digital Twin IoT Nodes)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS smart_bins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bin_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                area TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                fill_level INTEGER NOT NULL DEFAULT 0,
                gas_ppm INTEGER NOT NULL DEFAULT 120,
                weight_kg REAL NOT NULL DEFAULT 5.0,
                battery_pct INTEGER NOT NULL DEFAULT 100,
                status TEXT NOT NULL DEFAULT 'Normal',
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # 4. Collection Trucks (Fleet Twin)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS collection_trucks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                truck_code TEXT UNIQUE NOT NULL,
                driver_name TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'Active',
                capacity_kg REAL NOT NULL DEFAULT 2000.0,
                current_load_kg REAL NOT NULL DEFAULT 0.0,
                assigned_route TEXT DEFAULT '[]',
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # 5. Citizen Waste Reports
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS waste_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reporter_name TEXT NOT NULL,
                phone TEXT DEFAULT '',
                issue_type TEXT NOT NULL,
                location_address TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                image_data TEXT DEFAULT '',
                description TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # 6. IoT Telemetry Log
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS iot_telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bin_code TEXT NOT NULL,
                fill_level INTEGER NOT NULL,
                gas_ppm INTEGER NOT NULL,
                weight_kg REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        conn.commit()

        # Seed initial smart bins & trucks if empty
        _seed_digital_twin_data(conn)


def _seed_digital_twin_data(conn: sqlite3.Connection) -> None:
    """Seed realistic IoT smart bins and collection fleet across Dayananda Sagar University (DSU) Harohalli Campus."""
    cursor = conn.cursor()

    # Check if bins exist
    cursor.execute("SELECT COUNT(*) AS count FROM smart_bins")
    if cursor.fetchone()["count"] == 0:
        initial_bins = [
            ("DSU-BIN-01", "School of Engineering (SOE) Quadrangle", "SOE Academic Block", 12.6608, 77.4503, 38, 110, 16.5, 96, "Normal"),
            ("DSU-BIN-02", "Central Student Food Court & Cafeteria", "Student Amenities Hub", 12.6598, 77.4516, 88, 410, 48.0, 89, "Critical"),
            ("DSU-BIN-03", "School of Health Sciences & Nursing", "Medical Campus", 12.6618, 77.4496, 42, 135, 19.2, 94, "Normal"),
            ("DSU-BIN-04", "Hostel Quadrangle (Blocks A & B)", "Residential Zone", 12.6582, 77.4526, 76, 280, 37.5, 91, "Moderate"),
            ("DSU-BIN-05", "Innovation & Robotics Incubation Lab", "Research & Tech Wing", 12.6612, 77.4519, 25, 90, 9.8, 98, "Normal"),
            ("DSU-BIN-06", "DSU Central Library & Admin Tower", "Academic Zone", 12.6592, 77.4494, 60, 190, 24.0, 92, "Moderate"),
            ("DSU-BIN-07", "Campus Sports Complex & Arena", "Athletic Grounds", 12.6575, 77.4488, 84, 340, 42.0, 86, "Critical"),
            ("DSU-BIN-08", "DSU Main Campus Gate (Kanakapura Rd)", "Campus Entrance & Transit", 12.6586, 77.4468, 48, 150, 21.5, 95, "Normal"),
        ]
        cursor.executemany(
            """
            INSERT INTO smart_bins (bin_code, name, area, lat, lon, fill_level, gas_ppm, weight_kg, battery_pct, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            initial_bins,
        )

    # Check if trucks exist
    cursor.execute("SELECT COUNT(*) AS count FROM collection_trucks")
    if cursor.fetchone()["count"] == 0:
        initial_trucks = [
            ("DSU-EV-01", "Basavaraju (Electric Buggy)", 12.6596, 77.4510, "Active", 1200.0, 680.0, json.dumps(["DSU-BIN-02", "DSU-BIN-04"])),
            ("DSU-EV-02", "Manjunath (Campus Utility EV)", 12.6605, 77.4500, "On Route", 1500.0, 420.0, json.dumps(["DSU-BIN-07", "DSU-BIN-01"])),
            ("DSU-TRK-03", "Harohalli Municipal Liaison Truck", 12.6585, 77.4465, "Standby", 3000.0, 0.0, "[]"),
        ]
        cursor.executemany(
            """
            INSERT INTO collection_trucks (truck_code, driver_name, lat, lon, status, capacity_kg, current_load_kg, assigned_route)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            initial_trucks,
        )

    conn.commit()


def reset_dsu_campus_database() -> None:
    """Fresh start: Clear all dummy reviews, scans, reports, and reset smart bins/trucks to DSU Harohalli Campus."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM scans")
        cursor.execute("DELETE FROM reviews")
        cursor.execute("DELETE FROM waste_reports")
        cursor.execute("DELETE FROM iot_telemetry")
        cursor.execute("DELETE FROM smart_bins")
        cursor.execute("DELETE FROM collection_trucks")
        conn.commit()
        _seed_digital_twin_data(conn)
        print("[SUCCESS] Database reset: reviews, scans, reports cleared. DSU Harohalli Campus digital twin seeded.")


# ============================================================================
# SCANS & USER REVIEWS
# ============================================================================

def add_scan(
    username: str,
    predicted_class: str,
    bio_group: str,
    confidence: float,
    item_name: str = "General Waste Item",
    bin_category: str = "Dry Waste Bin",
) -> Dict[str, Any]:
    """Insert a new scan record and return the created row."""
    cleaned_username = username.strip() if (username and isinstance(username, str) and username.strip()) else "anonymous"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO scans (username, item_name, predicted_class, bio_group, bin_category, confidence)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                cleaned_username,
                str(item_name),
                str(predicted_class),
                str(bio_group),
                str(bin_category),
                float(confidence),
            ),
        )
        conn.commit()
        row_id = cursor.lastrowid
        cursor.execute("SELECT * FROM scans WHERE id = ?", (row_id,))
        row = cursor.fetchone()
        return dict(row) if row else {}


def get_analytics() -> Dict[str, Any]:
    """Calculate and return analytics metrics."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Category distribution
        cursor.execute(
            """
            SELECT predicted_class AS category, COUNT(*) AS count
            FROM scans
            GROUP BY predicted_class
            ORDER BY count DESC
            """
        )
        counts_per_category = [{"category": row["category"], "count": row["count"]} for row in cursor.fetchall()]

        # Daily trend
        cursor.execute(
            """
            SELECT date(timestamp) AS date, COUNT(*) AS count
            FROM scans
            WHERE timestamp >= datetime('now', '-30 days')
            GROUP BY date(timestamp)
            ORDER BY date ASC
            """
        )
        daily_trend = [{"date": row["date"], "count": row["count"]} for row in cursor.fetchall()]

        # Totals
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_scans,
                SUM(CASE WHEN LOWER(bio_group) LIKE '%non%' THEN 0 WHEN LOWER(bio_group) LIKE '%bio%' THEN 1 ELSE 0 END) AS bio_count,
                SUM(CASE WHEN LOWER(bio_group) LIKE '%non%' THEN 1 ELSE 0 END) AS nonbio_count
            FROM scans
            """
        )
        summary = cursor.fetchone()

        total_scans = summary["total_scans"] if summary and summary["total_scans"] else 0
        bio_count = summary["bio_count"] if summary and summary["bio_count"] else 0
        nonbio_count = summary["nonbio_count"] if summary and summary["nonbio_count"] else 0

        # Smart bins telemetry quick stats
        cursor.execute("SELECT COUNT(*) AS total_bins, SUM(CASE WHEN fill_level >= 80 THEN 1 ELSE 0 END) AS full_bins FROM smart_bins")
        bins_summary = cursor.fetchone()
        total_bins = bins_summary["total_bins"] if bins_summary else 0
        full_bins = bins_summary["full_bins"] if bins_summary and bins_summary["full_bins"] else 0

        # Active collection trucks
        cursor.execute("SELECT COUNT(*) AS active_trucks FROM collection_trucks WHERE status != 'Maintenance'")
        active_trucks = cursor.fetchone()["active_trucks"]

        return {
            "counts_per_category": counts_per_category,
            "daily_trend": daily_trend,
            "total_scans": total_scans,
            "bio_count": bio_count,
            "nonbio_count": nonbio_count,
            "total_bins": total_bins,
            "full_bins": full_bins,
            "active_trucks": active_trucks,
        }


def get_leaderboard() -> List[Dict[str, Any]]:
    """Return leaderboard rankings sorted by eco_points descending (top 20)."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                username,
                COUNT(*) AS scan_count,
                (COUNT(*) * 10) AS eco_points
            FROM scans
            GROUP BY username
            ORDER BY eco_points DESC, scan_count DESC
            LIMIT 20
            """
        )
        rows = cursor.fetchall()
        return [
            {
                "username": row["username"],
                "scan_count": row["scan_count"],
                "eco_points": row["eco_points"],
            }
            for row in rows
        ]


def add_review(name: str, rating: Any, comment: str) -> Dict[str, Any]:
    """Validate and insert a new user review."""
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Name must be a non-empty string.")

    try:
        rating_int = int(rating)
    except (TypeError, ValueError):
        raise ValueError("Rating must be an integer between 1 and 5.")

    if rating_int < 1 or rating_int > 5:
        raise ValueError("Rating must be between 1 and 5.")

    if not isinstance(comment, str) or not comment.strip():
        raise ValueError("Comment must be a non-empty string.")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO reviews (name, rating, comment) VALUES (?, ?, ?)",
            (name.strip(), rating_int, comment.strip()),
        )
        conn.commit()
        row_id = cursor.lastrowid
        cursor.execute("SELECT * FROM reviews WHERE id = ?", (row_id,))
        row = cursor.fetchone()
        return dict(row) if row else {}


def get_reviews() -> Dict[str, Any]:
    """Return all reviews with average rating and total count."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, rating, comment, timestamp FROM reviews ORDER BY timestamp DESC, id DESC")
        rows = cursor.fetchall()
        reviews = [dict(row) for row in rows]
        total = len(reviews)
        avg = round(sum(r["rating"] for r in reviews) / total, 1) if total > 0 else 0.0
        return {"reviews": reviews, "average_rating": avg, "total_reviews": total}


# ============================================================================
# DIGITAL TWIN: SMART BINS & TELEMETRY
# ============================================================================

def get_all_smart_bins() -> List[Dict[str, Any]]:
    """Return all smart bins for digital twin monitoring."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM smart_bins ORDER BY fill_level DESC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def update_bin_telemetry(
    bin_code: str,
    fill_level: int,
    gas_ppm: int,
    weight_kg: float,
    battery_pct: Optional[int] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Dict[str, Any]:
    """Update sensor telemetry for a smart bin (from simulator or ESP32 HTTP POST)."""
    # Determine status
    if fill_level >= 80 or gas_ppm >= 400:
        status = "Critical" if fill_level >= 80 else "Gas Alert"
    elif fill_level >= 50 or gas_ppm >= 250:
        status = "Moderate"
    else:
        status = "Normal"

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Update bin
        if lat is not None and lon is not None and battery_pct is not None:
            cursor.execute(
                """
                UPDATE smart_bins
                SET fill_level = ?, gas_ppm = ?, weight_kg = ?, battery_pct = ?, status = ?, lat = ?, lon = ?, last_updated = CURRENT_TIMESTAMP
                WHERE bin_code = ?
                """,
                (fill_level, gas_ppm, weight_kg, battery_pct, status, lat, lon, bin_code),
            )
        else:
            cursor.execute(
                """
                UPDATE smart_bins
                SET fill_level = ?, gas_ppm = ?, weight_kg = ?, status = ?, last_updated = CURRENT_TIMESTAMP
                WHERE bin_code = ?
                """,
                (fill_level, gas_ppm, weight_kg, status, bin_code),
            )

        # Log history
        cursor.execute(
            """
            INSERT INTO iot_telemetry (bin_code, fill_level, gas_ppm, weight_kg)
            VALUES (?, ?, ?, ?)
            """,
            (bin_code, fill_level, gas_ppm, weight_kg),
        )
        conn.commit()

        cursor.execute("SELECT * FROM smart_bins WHERE bin_code = ?", (bin_code,))
        row = cursor.fetchone()
        return dict(row) if row else {}


def get_collection_trucks() -> List[Dict[str, Any]]:
    """Return all collection fleet trucks for digital twin tracking."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM collection_trucks ORDER BY truck_code ASC")
        rows = cursor.fetchall()
        res = []
        for r in rows:
            d = dict(r)
            try:
                d["assigned_route"] = json.loads(d["assigned_route"])
            except Exception:
                d["assigned_route"] = []
            res.append(d)
        return res


def get_active_alerts() -> List[Dict[str, Any]]:
    """Return active critical alerts (full bins, gas spikes, pending citizen reports)."""
    alerts: List[Dict[str, Any]] = []
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Full bins (>80%)
        cursor.execute("SELECT bin_code, name, area, fill_level, weight_kg FROM smart_bins WHERE fill_level >= 80")
        for r in cursor.fetchall():
            alerts.append({
                "type": "fill_overflow",
                "severity": "critical",
                "title": f"Bin Overflow Alert: {r['name']} ({r['bin_code']})",
                "message": f"Fill level is at {r['fill_level']}% (Weight: {r['weight_kg']} kg). Immediate collection required.",
                "area": r["area"],
                "badge": f"{r['fill_level']}% Full",
                "time": "Active",
            })

        # Gas/Methane Spikes (>350 ppm)
        cursor.execute("SELECT bin_code, name, area, gas_ppm FROM smart_bins WHERE gas_ppm >= 350")
        for r in cursor.fetchall():
            alerts.append({
                "type": "gas_leak",
                "severity": "warning",
                "title": f"Methane/Odor Spike: {r['name']} ({r['bin_code']})",
                "message": f"MQ-135 reading is {r['gas_ppm']} ppm. High organic decomposition or hazardous fermentation detected.",
                "area": r["area"],
                "badge": f"{r['gas_ppm']} PPM",
                "time": "Active",
            })

        # Pending Citizen Reports
        cursor.execute("SELECT id, reporter_name, issue_type, location_address, timestamp FROM waste_reports WHERE status = 'Pending' LIMIT 5")
        for r in cursor.fetchall():
            alerts.append({
                "type": "citizen_report",
                "severity": "info",
                "title": f"Citizen Report: {r['issue_type']}",
                "message": f"Reported at {r['location_address']} by {r['reporter_name']}.",
                "area": r["location_address"],
                "badge": "Pending Review",
                "time": r["timestamp"],
            })

    return alerts


# ============================================================================
# CITIZEN REPORTING
# ============================================================================

def add_waste_report(
    reporter_name: str,
    issue_type: str,
    location_address: str,
    lat: float,
    lon: float,
    description: str,
    phone: str = "",
    image_data: str = "",
) -> Dict[str, Any]:
    """Insert a new citizen waste incident report."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO waste_reports (reporter_name, phone, issue_type, location_address, lat, lon, image_data, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
            """,
            (
                reporter_name.strip() or "Concerned Citizen",
                phone.strip(),
                issue_type.strip(),
                location_address.strip() or "Public Location",
                float(lat),
                float(lon),
                image_data,
                description.strip(),
            ),
        )
        conn.commit()
        row_id = cursor.lastrowid
        cursor.execute("SELECT * FROM waste_reports WHERE id = ?", (row_id,))
        row = cursor.fetchone()
        return dict(row) if row else {}


def get_all_waste_reports() -> List[Dict[str, Any]]:
    """Return all citizen waste reports."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM waste_reports ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

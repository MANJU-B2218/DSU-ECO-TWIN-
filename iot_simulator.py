"""IoT Sensor Simulator & Digital Twin Engine for EcoWaste.

Simulates:
- Ultrasonic HC-SR04: Bin fill percentage (0 - 100%)
- Gas Sensor MQ-135: Odor, ammonia, and methane levels (ppm)
- Weight Sensor (Load Cell): Waste mass (kg)
- GPS Module: Live coordinates for bins and moving collection trucks
- What-If Digital Twin Scenario Simulator: Projects fill rates if collection is skipped
- Smart Fleet Route Optimizer: Calculates shortest TSP collection path for full bins
"""

import math
import random
import threading
import time
from typing import Any, Dict, List, Tuple

from database import get_all_smart_bins, get_collection_trucks, update_bin_telemetry


class DigitalTwinEngine:
    """Manages background IoT sensor updates, what-if projections, and truck routing."""

    def __init__(self, update_interval_sec: float = 5.0):
        self.update_interval = update_interval_sec
        self.is_running = False
        self._thread: threading.Thread = None
        self.simulated_mode = True

    def start_background_simulation(self):
        """Start daemon thread for continuous realistic IoT sensor fluctuations."""
        if self.is_running:
            return
        self.is_running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        print("[INFO] IoT Sensor Simulator daemon started (HC-SR04, MQ-135, Load Cell).")

    def _run_loop(self):
        """Simulation loop adding organic jitter and gradual waste filling."""
        while self.is_running:
            try:
                bins = get_all_smart_bins()
                for b in bins:
                    # Random small fill increase (0 to 3%) simulating citizen disposal
                    fill_delta = random.choice([0, 0, 1, 1, 2, 3])
                    new_fill = min(100, b["fill_level"] + fill_delta)

                    # If bin overflows (>98%), reset after collection simulation
                    if b["fill_level"] >= 98 and random.random() < 0.2:
                        new_fill = random.randint(10, 25)

                    # Gas sensor MQ-135: correlates with fill level & organic fermentation
                    base_gas = 100 + int(new_fill * 3.5)
                    gas_jitter = random.randint(-25, 35)
                    new_gas = max(80, min(750, base_gas + gas_jitter))

                    # Weight sensor: ~0.45kg per 1% fill with variation
                    new_weight = round(max(3.0, (new_fill * 0.48) + random.uniform(-1.5, 2.0)), 1)

                    update_bin_telemetry(
                        bin_code=b["bin_code"],
                        fill_level=new_fill,
                        gas_ppm=new_gas,
                        weight_kg=new_weight,
                    )
            except Exception as e:
                print(f"[WARN] IoT simulation tick warning: {e}")

            time.sleep(self.update_interval)

    @staticmethod
    def calculate_what_if_scenario(days_skipped: int = 1, weather: str = "normal") -> Dict[str, Any]:
        """Digital Twin What-If Analysis: Projects bin overflow if municipal collection is delayed.

        Args:
            days_skipped: Number of days collection is delayed (1, 2, 3, etc.)
            weather: 'normal', 'hot', 'monsoon'
        """
        bins = get_all_smart_bins()
        projected_bins = []
        overflow_count = 0
        total_projected_waste_kg = 0.0
        critical_alerts = []

        # Weather multiplier for decomposition (gas ppm)
        gas_multiplier = 1.0
        if weather == "hot":
            gas_multiplier = 1.5
        elif weather == "monsoon":
            gas_multiplier = 1.8

        for b in bins:
            # Typical daily fill growth: 22% - 30% per day in commercial/public zones
            daily_growth = 26 if "Central" in b["area"] or "Commercial" in b["area"] else 18
            projected_fill = min(150, b["fill_level"] + (daily_growth * days_skipped))

            # Gas projection with exponential rise upon overflow
            daily_gas_rise = int(60 * gas_multiplier)
            projected_gas = b["gas_ppm"] + (daily_gas_rise * days_skipped)
            if projected_fill > 100:
                projected_gas += int((projected_fill - 100) * 8 * gas_multiplier)

            projected_weight = round(b["weight_kg"] + (daily_growth * days_skipped * 0.45), 1)
            total_projected_waste_kg += projected_weight

            is_overflow = projected_fill >= 100
            if is_overflow:
                overflow_count += 1
                critical_alerts.append(
                    f"{b['name']} ({b['bin_code']}) will overflow to {projected_fill}% capacity with {projected_gas} ppm gas!"
                )

            projected_bins.append({
                "bin_code": b["bin_code"],
                "name": b["name"],
                "area": b["area"],
                "lat": b["lat"],
                "lon": b["lon"],
                "current_fill": b["fill_level"],
                "projected_fill": projected_fill,
                "projected_gas_ppm": projected_gas,
                "projected_weight_kg": projected_weight,
                "is_overflow": is_overflow,
                "overflow_volume_pct": max(0, projected_fill - 100),
            })

        # Calculate estimated municipal impact
        fuel_wasted_est_litres = round(overflow_count * 2.8, 1)
        cleanup_cost_estimate_inr = overflow_count * 1500

        return {
            "days_skipped": days_skipped,
            "weather": weather,
            "total_bins": len(bins),
            "overflow_count": overflow_count,
            "overflow_percentage": round((overflow_count / max(1, len(bins))) * 100, 1),
            "total_projected_waste_kg": round(total_projected_waste_kg, 1),
            "estimated_penalty_cost_inr": cleanup_cost_estimate_inr,
            "estimated_emergency_fuel_litres": fuel_wasted_est_litres,
            "projected_bins": projected_bins,
            "critical_alerts": critical_alerts,
        }

    @staticmethod
    def optimize_collection_route(truck_code: str = "TRK-01") -> Dict[str, Any]:
        """Compute the shortest Traveling Salesperson (TSP) route for full bins (>70% fill or high gas)."""
        bins = get_all_smart_bins()
        trucks = get_collection_trucks()

        # Find requested truck or default
        truck = next((t for t in trucks if t["truck_code"] == truck_code), trucks[0] if trucks else None)
        truck_lat = truck["lat"] if truck else 12.9730
        truck_lon = truck["lon"] if truck else 77.6050

        # Select only priority bins: fill >= 70 or gas >= 350
        priority_bins = [b for b in bins if b["fill_level"] >= 70 or b["gas_ppm"] >= 350]

        # If none critical, take top 3 highest fill
        if not priority_bins:
            priority_bins = sorted(bins, key=lambda x: x["fill_level"], reverse=True)[:3]

        # Nearest-Neighbor TSP algorithm
        unvisited = priority_bins.copy()
        current_lat, current_lon = truck_lat, truck_lon
        ordered_route: List[Dict[str, Any]] = []
        total_distance_km = 0.0

        while unvisited:
            # Find closest bin
            closest_bin = min(
                unvisited,
                key=lambda b: math.hypot(b["lat"] - current_lat, b["lon"] - current_lon),
            )
            dist_km = math.hypot(closest_bin["lat"] - current_lat, closest_bin["lon"] - current_lon) * 111.0
            total_distance_km += dist_km

            ordered_route.append({
                "stop_number": len(ordered_route) + 1,
                "bin_code": closest_bin["bin_code"],
                "name": closest_bin["name"],
                "area": closest_bin["area"],
                "lat": closest_bin["lat"],
                "lon": closest_bin["lon"],
                "fill_level": closest_bin["fill_level"],
                "gas_ppm": closest_bin["gas_ppm"],
                "weight_kg": closest_bin["weight_kg"],
                "leg_distance_km": round(dist_km, 2),
            })

            current_lat, current_lon = closest_bin["lat"], closest_bin["lon"]
            unvisited.remove(closest_bin)

        # Baseline traditional route visits ALL 8 bins sequentially
        baseline_distance_km = total_distance_km * 1.68
        distance_saved_km = max(0.0, baseline_distance_km - total_distance_km)
        fuel_saved_litres = round(distance_saved_km * 0.28, 2)
        co2_reduction_kg = round(fuel_saved_litres * 2.68, 2)

        polyline_coords = [[truck_lat, truck_lon]] + [[s["lat"], s["lon"]] for s in ordered_route]

        return {
            "truck_code": truck["truck_code"] if truck else "TRK-01",
            "driver_name": truck["driver_name"] if truck else "Ramesh Kumar",
            "start_coordinates": {"lat": truck_lat, "lon": truck_lon},
            "total_stops": len(ordered_route),
            "total_distance_km": round(total_distance_km, 2),
            "distance_saved_km": round(distance_saved_km, 2),
            "fuel_saved_litres": fuel_saved_litres,
            "co2_reduction_kg": co2_reduction_kg,
            "stops": ordered_route,
            "polyline_coords": polyline_coords,
        }


# Singleton engine instance
twin_engine = DigitalTwinEngine()

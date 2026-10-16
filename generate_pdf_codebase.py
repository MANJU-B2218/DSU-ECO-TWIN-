"""
DSU EcoTwin - Complete Python Codebase PDF Generator
Compiles the complete, production-grade Python architecture for the
Dayananda Sagar University (DSU) Harohalli Campus Smart Waste Management Digital Twin.

Includes:
- Cover page with DSU Campus branding & metadata
- Table of Contents with file summaries and line counts
- Line-numbered, syntax-formatted source code listings for all core modules:
    1. requirements.txt (Dependencies manifest)
    2. app.py (Flask REST API & Web Application Server)
    3. database.py (SQLite DB Schema, DSU Harohalli Campus Nodes & Seeds)
    4. predict.py (MobileNetV3 Deep Learning Vision + Google Search Engine AI)
    5. iot_simulator.py (Digital Twin Engine, Sensor Simulation, What-If, TSP Fleet Routing)
    6. ai_service.py (Generative AI Recommendations, EcoBot Chatbot, Daily Reports)
    7. train_model.py (Transfer Learning Pipeline & PyTorch Kaggle Trainer)
    8. generate_deck.py (Automated Executive PowerPoint Deck Generator)
"""

import os
import sys
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
    Preformatted,
    HRFlowable,
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Canvas that performs a two-pass calculation for total page count."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Skip header and footer on cover page
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#059669"))  # Emerald Green

        # Running Header
        self.drawString(40, letter[1] - 30, "DSU ECOTWIN: SMART CAMPUS WASTE DIGITAL TWIN (HAROHALLI)")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(letter[0] - 40, letter[1] - 30, "COMPLETE PYTHON CODEBASE")

        # Top rule
        self.setStrokeColor(colors.HexColor("#10b981"))
        self.setLineWidth(0.8)
        self.line(40, letter[1] - 36, letter[0] - 40, letter[1] - 36)

        # Bottom rule
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.6)
        self.line(40, 42, letter[0] - 40, 42)

        # Running Footer
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(40, 30, "Dayananda Sagar University • Computer Vision + IoT Digital Twin + Google Search AI + GenAI")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 40, 30, page_str)
        self.restoreState()


def format_code_with_line_numbers(code_text: str, max_chars: int = 96) -> str:
    """Add clean line numbers and wrap oversized lines to prevent PDF clipping."""
    lines = code_text.splitlines()
    formatted = []
    for idx, raw_line in enumerate(lines, start=1):
        clean_line = raw_line.replace("\t", "    ")
        prefix = f"{idx:>4} | "
        if len(clean_line) <= max_chars:
            formatted.append(prefix + clean_line)
        else:
            first_part = clean_line[:max_chars]
            formatted.append(prefix + first_part)
            remaining = clean_line[max_chars:]
            cont_prefix = "     |   ↳ "
            while remaining:
                chunk = remaining[: max_chars - 5]
                formatted.append(cont_prefix + chunk)
                remaining = remaining[max_chars - 5 :]
    return "\n".join(formatted)


def build_codebase_pdf(output_pdf="DSU_EcoTwin_Complete_Codebase.pdf"):
    abs_output = os.path.abspath(output_pdf)
    doc = SimpleDocTemplate(
        abs_output,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=46,
        bottomMargin=48,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    cover_tag_style = ParagraphStyle(
        "CoverTag",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#065f46"),
    )

    cover_title_style = ParagraphStyle(
        "CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=8,
    )

    cover_subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        fontName="Helvetica",
        fontSize=12,
        leading=17,
        textColor=colors.HexColor("#475569"),
        spaceAfter=16,
    )

    section_heading_style = ParagraphStyle(
        "SectionHeading",
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    file_title_style = ParagraphStyle(
        "FileTitle",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#047857"),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True,
    )

    meta_text_style = ParagraphStyle(
        "MetaText",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=8,
    )

    body_style = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=4,
    )

    code_style = ParagraphStyle(
        "CodeText",
        fontName="Courier",
        fontSize=6.5,
        leading=8.3,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 24))

    # Badge Pill
    badge_data = [[Paragraph("<b>● DAYANANDA SAGAR UNIVERSITY (HAROHALLI) • OFFICIAL CODEBASE SPECIFICATION</b>", cover_tag_style)]]
    badge_table = Table(badge_data, colWidths=[5.8 * inch])
    badge_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ecfdf5")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#6ee7b7")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(badge_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("DSU EcoTwin: Smart Waste Management Digital Twin", cover_title_style))
    story.append(
        Paragraph(
            "Complete Production Python Architecture &amp; Implementation: Deep Learning Computer Vision, "
            "Google Search Engine Knowledge Retrieval, IoT Telemetry Mesh, Leaflet GIS Digital Twin, "
            "Predictive What-If Scenario Engine, and LLM Generative AI.",
            cover_subtitle_style,
        )
    )

    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#10b981"), spaceAfter=14))

    # Architecture Overview Table
    meta_info = [
        [
            Paragraph("<b>Institution / Campus:</b>", body_style),
            Paragraph("Dayananda Sagar University (DSU), Main Campus, Harohalli, Karnataka 562112", body_style),
        ],
        [
            Paragraph("<b>Campus Coordinates:</b>", body_style),
            Paragraph("Latitude: 12.65954° N, Longitude: 77.45077° E (Building-level GIS Twin)", body_style),
        ],
        [
            Paragraph("<b>Core Python Stack:</b>", body_style),
            Paragraph("Python 3.12, Flask 3.0, PyTorch 2.2, TorchVision (MobileNetV3 Large)", body_style),
        ],
        [
            Paragraph("<b>Database Layer:</b>", body_style),
            Paragraph("SQLite 3 (Fresh Zero-State: Real scans, verified reviews, IoT bins, EV fleet)", body_style),
        ],
        [
            Paragraph("<b>Visual &amp; Web AI:</b>", body_style),
            Paragraph("PyTorch MobileNetV3 + Google Search Engine Knowledge Scraping + Gemini 1.5", body_style),
        ],
        [
            Paragraph("<b>IoT Sensor Mesh:</b>", body_style),
            Paragraph("HC-SR04 (Ultrasonic), MQ-135 (Air/Gas), Load Cell (Weight), GPS Telemetry", body_style),
        ],
        [
            Paragraph("<b>Live Public Tunnel:</b>", body_style),
            Paragraph("https://mother-towers-academics-casino.trycloudflare.com (Active TLS)", body_style),
        ],
        [
            Paragraph("<b>Compiled On:</b>", body_style),
            Paragraph(datetime.now().strftime("%B %d, %Y at %H:%M:%S IST"), body_style),
        ],
    ]
    meta_table = Table(meta_info, colWidths=[2.0 * inch, 5.2 * inch])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # Table of Contents
    story.append(Paragraph("<b>Table of Contents — Included Modules</b>", section_heading_style))
    toc_items = [
        ("1. requirements.txt", "Package dependency specifications and locked library versions"),
        ("2. app.py", "Flask REST API, Digital Twin telemetry loop, Leaflet endpoints & routes"),
        ("3. database.py", "SQLite schema, DSU Harohalli smart bins, fleet vehicles, reviews & scans"),
        ("4. predict.py", "MobileNetV3 vision extractor + Google Search Engine Knowledge AI"),
        ("5. iot_simulator.py", "IoT HC-SR04, MQ-135, load cell, What-If simulator & TSP fleet routing"),
        ("6. ai_service.py", "Generative AI recommendations, EcoBot chatbot & daily executive reports"),
        ("7. train_model.py", "PyTorch deep learning model trainer with Kaggle datasets & confusion matrix"),
        ("8. generate_deck.py", "Executive PowerPoint presentation (.pptx) automated 16:9 builder"),
    ]
    toc_table_data = []
    for f, desc in toc_items:
        toc_table_data.append([Paragraph(f"<b>{f}</b>", body_style), Paragraph(desc, body_style)])

    toc_table = Table(toc_table_data, colWidths=[2.2 * inch, 5.0 * inch])
    toc_table.setStyle(
        TableStyle([
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    story.append(toc_table)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # HELPER TO ADD CODE FILES
    # -------------------------------------------------------------------------
    base_dir = os.path.dirname(os.path.abspath(__file__))

    def add_source_file_section(title, rel_path, purpose_summary):
        abs_path = os.path.join(base_dir, rel_path)
        if not os.path.exists(abs_path):
            story.append(Paragraph(title, section_heading_style))
            story.append(Paragraph(f"<b>File:</b> <font color='#dc2626'>{rel_path} (NOT FOUND)</font>", file_title_style))
            story.append(Spacer(1, 10))
            return

        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            code_text = f.read()

        line_count = len(code_text.splitlines())
        file_size_kb = round(os.path.getsize(abs_path) / 1024.0, 1)

        story.append(Paragraph(title, section_heading_style))
        story.append(
            Paragraph(
                f"<b>File:</b> <font color='#047857'>{rel_path}</font> &nbsp;|&nbsp; "
                f"<b>Size:</b> {file_size_kb} KB &nbsp;|&nbsp; "
                f"<b>Total Lines:</b> {line_count}",
                file_title_style,
            )
        )
        story.append(Paragraph(f"<b>Purpose:</b> {purpose_summary}", meta_text_style))
        story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#e2e8f0"), spaceAfter=8))

        formatted_code = format_code_with_line_numbers(code_text, max_chars=96)
        code_lines = formatted_code.splitlines()

        # Split into 55-line chunks to keep table cells within page bounds
        chunk_size = 55
        for i in range(0, len(code_lines), chunk_size):
            chunk = "\n".join(code_lines[i : i + chunk_size])
            code_flowable = Preformatted(chunk, code_style)
            chunk_table = Table([[code_flowable]], colWidths=[7.2 * inch])
            chunk_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ])
            )
            story.append(chunk_table)
            story.append(Spacer(1, 3))

        story.append(PageBreak())

    # -------------------------------------------------------------------------
    # APPEND ALL CODE MODULES
    # -------------------------------------------------------------------------
    add_source_file_section(
        "Module 1: Package Dependencies Manifest",
        "requirements.txt",
        "Official dependency manifest locking all Python libraries including Flask, PyTorch, TorchVision, ReportLab, and BeautifulSoup.",
    )

    add_source_file_section(
        "Module 2: Main Web Server & REST API Gateway",
        "app.py",
        "Flask web application orchestrating REST API endpoints, Digital Twin Leaflet telemetry, route optimization, What-If simulations, and incident reporting.",
    )

    add_source_file_section(
        "Module 3: Database & Digital Twin State Layer",
        "database.py",
        "Implements SQLite database persistence: real scans, DSU Harohalli campus smart bins, collection fleet, incident reports, and eco-points leaderboard.",
    )

    add_source_file_section(
        "Module 4: Computer Vision & Google Search Engine AI",
        "predict.py",
        "Implements PyTorch MobileNetV3 deep learning feature extractor + live Google Search Engine knowledge retrieval with a 60% confidence floor.",
    )

    add_source_file_section(
        "Module 5: IoT Sensor Simulator & Digital Twin Engine",
        "iot_simulator.py",
        "Simulates HC-SR04 ultrasonic fill levels, MQ-135 air/methane sensors, load cell weights, What-If projection simulation, and Dijkstra/TSP fleet routing.",
    )

    add_source_file_section(
        "Module 6: Generative AI Intelligence & Automated Reports",
        "ai_service.py",
        "Real-time LLM dispatch advice, interactive EcoBot chatbot with DSU campus domain context, and automated daily executive municipality reports.",
    )

    add_source_file_section(
        "Module 7: Transfer Learning Model Trainer",
        "train_model.py",
        "Deep learning transfer learning pipeline supporting MobileNetV2/MobileNetV3 on Kaggle TrashNet datasets with class weighting and confusion matrix metrics.",
    )

    add_source_file_section(
        "Module 8: Automated PowerPoint Presentation Generator",
        "generate_deck.py",
        "Python script generating a 16:9 executive pitch deck (.pptx) with architecture diagrams, KPI metrics, and DSU campus customization.",
    )

    # -------------------------------------------------------------------------
    # COMPILE PDF DOCUMENT
    # -------------------------------------------------------------------------
    print(f"[INFO] Building PDF document: {abs_output}...")
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF generated successfully at: {abs_output}")

    # Copy to static/downloads for direct web access
    static_download_dir = os.path.join(base_dir, "static", "downloads")
    os.makedirs(static_download_dir, exist_ok=True)
    target_copy = os.path.join(static_download_dir, os.path.basename(output_pdf))
    with open(abs_output, "rb") as src, open(target_copy, "wb") as dst:
        dst.write(src.read())
    print(f"[SUCCESS] Copied to web download directory: {target_copy}")
    return abs_output


if __name__ == "__main__":
    build_codebase_pdf("DSU_EcoTwin_Complete_Codebase.pdf")

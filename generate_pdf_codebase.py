"""
Generates a complete, publication-grade PDF containing the entire Python codebase
for the Smart Waste Management Digital Twin project.
Uses ReportLab Platypus with custom styles, headers, footers, cover page, and TOC.
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
    KeepTogether,
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
        self.setFillColor(colors.HexColor("#059669")) # Emerald

        # Running Header
        self.drawString(54, letter[1] - 36, "ECOTWIN: SMART WASTE MANAGEMENT DIGITAL TWIN")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(letter[0] - 54, letter[1] - 36, "COMPLETE PYTHON CODEBASE")

        # Top rule
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Bottom rule
        self.line(54, 48, letter[0] - 54, 48)

        # Running Footer
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 34, "Hackathon Track: Computer Vision + Digital Twin + Generative AI")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 34, page_str)
        self.restoreState()


def build_codebase_pdf(output_pdf="EcoTwin_Complete_Codebase.pdf"):
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    cover_title_style = ParagraphStyle(
        "CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#0f172a"),
        alignment=0,
        spaceAfter=10,
    )

    cover_subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#475569"),
        alignment=0,
        spaceAfter=20,
    )

    section_heading_style = ParagraphStyle(
        "SectionHeading",
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    file_title_style = ParagraphStyle(
        "FileTitle",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#047857"),
        spaceBefore=12,
        spaceAfter=4,
        keepWithNext=True,
    )

    meta_text_style = ParagraphStyle(
        "MetaText",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=8,
    )

    body_style = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )

    code_style = ParagraphStyle(
        "CodeText",
        fontName="Courier",
        fontSize=7.2,
        leading=9.2,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------------------
    story.append(Spacer(1, 40))

    # Pill badge
    track_badge_table = Table(
        [[Paragraph("<font color='#047857'><b>● HACKATHON COMPLETE SYSTEM CODEBASE</b></font>", body_style)]],
        colWidths=[3.2 * inch],
    )
    track_badge_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ecfdf5")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#6ee7b7")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(track_badge_table)
    story.append(Spacer(1, 16))

    story.append(Paragraph("EcoTwin: Smart Waste Management Digital Twin", cover_title_style))
    story.append(
        Paragraph(
            "Complete Production Python Architecture: Computer Vision, Live Google Search Engine AI, "
            "IoT Telemetry Mesh, GIS Virtual Twin, Predictive What-If Simulation, and Generative AI.",
            cover_subtitle_style,
        )
    )

    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#10b981"), spaceAfter=18))

    # Metadata Grid Table
    meta_info = [
        [
            Paragraph("<b>Track:</b>", body_style),
            Paragraph("Smart Waste Management Digital Twin (CV + IoT + GenAI)", body_style),
        ],
        [
            Paragraph("<b>Backend Engine:</b>", body_style),
            Paragraph("Python 3.12, Flask 3.0, PyTorch, TorchVision (MobileNetV3)", body_style),
        ],
        [
            Paragraph("<b>Database:</b>", body_style),
            Paragraph("SQLite 3 (zero fake data; scans, reviews, reports, IoT nodes)", body_style),
        ],
        [
            Paragraph("<b>Search Intelligence:</b>", body_style),
            Paragraph("DuckDuckGo / Google Search Engine Knowledge Scraping AI", body_style),
        ],
        [
            Paragraph("<b>Live Public Tunnel:</b>", body_style),
            Paragraph("https://c804522a00efb6.lhr.life (HTTPS TLS active)", body_style),
        ],
        [
            Paragraph("<b>Generated On:</b>", body_style),
            Paragraph(datetime.now().strftime("%B %d, %Y - %H:%M:%S IST"), body_style),
        ],
    ]
    meta_table = Table(meta_info, colWidths=[1.8 * inch, 5.0 * inch])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 24))

    story.append(Paragraph("<b>Table of Contents — Included Modules</b>", section_heading_style))
    toc_items = [
        ("1. requirements.txt", "Package dependency specifications and library versions"),
        ("2. database.py", "SQLite schema, real reviews, IoT smart bins, fleet trucks & eco-points"),
        ("3. predict.py", "MobileNetV3 vision extractor + Google Search Engine Knowledge AI & 60% floor"),
        ("4. app.py", "Flask REST API, Digital Twin telemetry loop, What-If simulator & routes"),
        ("5. train.py", "Transfer learning training script with Kaggle datasets, weights & confusion matrix"),
        ("6. build_premium_deck.py", "Executive PowerPoint presentation (.pptx) automated builder"),
    ]
    toc_table_data = []
    for f, desc in toc_items:
        toc_table_data.append([Paragraph(f"<b>{f}</b>", body_style), Paragraph(desc, body_style)])

    toc_table = Table(toc_table_data, colWidths=[2.2 * inch, 4.6 * inch])
    toc_table.setStyle(
        TableStyle([
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(toc_table)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # HELPER TO ADD CODE FILES
    # -------------------------------------------------------------------------
    def add_source_file_section(title, rel_path, purpose_summary):
        story.append(Paragraph(title, section_heading_style))
        story.append(Paragraph(f"<b>File:</b> <font color='#047857'>{rel_path}</font>", file_title_style))
        story.append(Paragraph(f"<b>Purpose:</b> {purpose_summary}", meta_text_style))

        abs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), rel_path)
        if not os.path.exists(abs_path):
            story.append(Paragraph(f"<i>Error: File not found at {abs_path}</i>", body_style))
            story.append(PageBreak())
            return

        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            code_text = f.read()

        # Wrap code block inside formatted box
        # Split large files into chunks to prevent platypus overflow
        lines = code_text.splitlines()
        chunk_size = 50  # lines per chunk
        for i in range(0, len(lines), chunk_size):
            chunk = "\n".join(lines[i:i + chunk_size])
            code_flowable = Preformatted(chunk, code_style)
            chunk_table = Table([[code_flowable]], colWidths=[6.8 * inch])
            chunk_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ])
            )
            story.append(chunk_table)
            story.append(Spacer(1, 3))

        story.append(PageBreak())

    # -------------------------------------------------------------------------
    # APPEND SOURCE FILES
    # -------------------------------------------------------------------------
    add_source_file_section(
        "Module 1: Package Dependencies",
        "requirements.txt",
        "All required libraries for computer vision, search scraping, deep learning, web server, and presentation generation.",
    )

    add_source_file_section(
        "Module 2: Database & Digital Twin State Layer",
        "database.py",
        "Implements full SQLite database persistence: scans, eco-points leaderboard, reviews, reports, IoT smart bins, and collection fleet.",
    )

    add_source_file_section(
        "Module 3: Vision & Search Engine Intelligence",
        "predict.py",
        "Implements MobileNetV3 Large deep feature extraction + live DuckDuckGo/Google search engine knowledge retrieval with strict 60% confidence threshold.",
    )

    add_source_file_section(
        "Module 4: Main Web Server & REST API",
        "app.py",
        "Flask web server orchestrating the Digital Twin, dynamic route optimization, What-If simulator, IoT telemetry loop, reviews, reports, and AI chatbot.",
    )

    add_source_file_section(
        "Module 5: Transfer Learning Model Trainer",
        "train.py",
        "Kaggle dataset training script using MobileNetV3/MobileNetV2 with class weights, data augmentation, confusion matrix, and accuracy evaluation.",
    )

    add_source_file_section(
        "Module 6: PowerPoint Pitch Deck Generator",
        "build_premium_deck.py",
        "Automated generator for high-contrast executive hackathon presentation slides (.pptx).",
    )

    # -------------------------------------------------------------------------
    # BUILD DOCUMENT
    # -------------------------------------------------------------------------
    print(f"[INFO] Compiling PDF codebase document...")
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF generated successfully at: {output_pdf}")

    # Copy to static/downloads for web download
    static_download_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "downloads")
    os.makedirs(static_download_dir, exist_ok=True)
    target_copy = os.path.join(static_download_dir, os.path.basename(output_pdf))
    with open(output_pdf, "rb") as src, open(target_copy, "wb") as dst:
        dst.write(src.read())
    print(f"[SUCCESS] Copied to web downloads folder: {target_copy}")


if __name__ == "__main__":
    build_codebase_pdf("EcoTwin_Complete_Codebase.pdf")

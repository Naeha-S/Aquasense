from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE

# Colors matching AquaSense branding
BLACK = RGBColor(0x14, 0x14, 0x14)
CREAM = RGBColor(0xE5, 0xE3, 0xDF)
DARK_CREAM = RGBColor(0xD7, 0xD4, 0xCF)
BLUE = RGBColor(0x25, 0x63, 0xEB)
CYAN = RGBColor(0x06, 0xB6, 0xD4)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return RGBColor(int(hex_str[0:2],16), int(hex_str[2:4],16), int(hex_str[4:6],16))

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Helper functions
def set_slide_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_shape(slide, left, top, width, height, fill_color, border_color=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1)
    return shape

def add_text_box(slide, left, top, width, height, text, font_size=18, bold=False, color=BLACK, alignment=PP_ALIGN.LEFT, font_name="Calibri", line_spacing=1.2):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = font_name
    p.alignment = alignment
    p.space_after = Pt(6)
    p.line_spacing = line_spacing
    return txBox

def add_bullet_list(slide, left, top, width, height, items, font_size=14, color=BLACK, spacing=Pt(8)):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for idx, item in enumerate(items):
        if idx == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = item
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = "Calibri"
        p.space_after = spacing
        p.level = 0
    return txBox

# Slide 1: Title
slide = prs.slides.add_slide(prs.slide_layouts[6]) # blank
set_slide_bg(slide, BLACK)

# Top accent line
add_shape(slide, Inches(0.8), Inches(0.6), Inches(1.2), Pt(4), CREAM)

add_text_box(slide, Inches(0.8), Inches(0.9), Inches(6), Inches(0.5), "Ω  AQUASENSE", font_size=12, bold=True, color=CREAM, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(1.3), Inches(7), Inches(1.5), "AquaSense", font_size=54, bold=True, color=CREAM, font_name="Times New Roman")
add_text_box(slide, Inches(0.8), Inches(2.6), Inches(7), Inches(0.8), "EO Observation & Few-Shot Classifier", font_size=22, bold=False, color=CREAM, font_name="Calibri")

add_text_box(slide, Inches(0.8), Inches(3.6), Inches(5.5), Inches(1.2),
             "Real-time wetland hydrology intelligence from Sentinel-2\nNDWI temporal quantification • Gemini ecological reasoning • Planetary Computer STAC",
             font_size=14, color=RGBColor(0xAA,0xA8,0xA5), font_name="Consolas")

# Right side - tagline box
add_shape(slide, Inches(8.5), Inches(1.0), Inches(4.0), Inches(5.5), RGBColor(0x1E,0x1E,0x1E), border_color=RGBColor(0x33,0x33,0x33))
add_text_box(slide, Inches(9.0), Inches(1.3), Inches(3.0), Inches(0.4), "MISSION", font_size=10, bold=True, color=AMBER, font_name="Consolas")
add_text_box(slide, Inches(9.0), Inches(1.7), Inches(3.0), Inches(1.2), "Monitoring Earth's most threatened ecosystems with satellite intelligence", font_size=18, bold=True, color=CREAM, font_name="Calibri")
add_text_box(slide, Inches(9.0), Inches(3.0), Inches(3.0), Inches(0.8),
             "STAC • EO-HYDRO • NDWI\n(B03-B08)/(B03+B08)\n10m/px Resolution",
             font_size=11, color=RGBColor(0x88,0x88,0x88), font_name="Consolas")

add_text_box(slide, Inches(9.0), Inches(4.2), Inches(3.0), Inches(1.5),
             "PALLIKARANAI MARSH • CHENNAI\nBaseline 2019 → Target 2025\nCloud <20% • Threshold >0.20",
             font_size=11, color=BLUE, font_name="Consolas")

# Footer
add_text_box(slide, Inches(0.8), Inches(6.8), Inches(11), Inches(0.3), "Sentinel-2 Spectral Ingestion  •  Microsoft Planetary Computer  •  Gemini 3.7 Flash  •  0x8a92f02c", font_size=8, color=RGBColor(0x55,0x55,0x55), font_name="Consolas")

# Slide 2: Problem
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, CREAM)

add_shape(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.2), BLACK)
add_text_box(slide, Inches(0.8), Inches(0.3), Inches(2), Inches(0.6), "02 / PROBLEM", font_size=10, bold=True, color=AMBER, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.1), Inches(6), Inches(1.0), "The Wetland Crisis", font_size=32, bold=True, color=CREAM, font_name="Times New Roman")

# 3 columns
problems = [
    ("35% LOST", "Of natural wetlands lost since 1970. Fastest disappearing ecosystem on Earth.", "WORLDWIDE"),
    ("Data Blindness", "No real-time, high-resolution monitoring for local conservation bodies. Manual surveys are slow.", "MONITORING GAP"),
    ("Climate Risk", "Urban encroachment, precipitation anomalies, and pollution go undetected until irreversible.", "NO EARLY WARNING")
]
for i, (title, desc, tag) in enumerate(problems):
    left = Inches(0.8 + i*4.0)
    add_shape(slide, left, Inches(1.8), Inches(3.6), Inches(4.2), RGBColor(0xFF,0xFF,0xFF), border_color=BLACK)
    add_text_box(slide, left+Inches(0.3), Inches(2.0), Inches(1.0), Inches(0.3), tag, font_size=9, bold=True, color=BLUE, font_name="Consolas")
    add_text_box(slide, left+Inches(0.3), Inches(2.4), Inches(3.0), Inches(0.6), title, font_size=24, bold=True, color=BLACK, font_name="Calibri")
    add_text_box(slide, left+Inches(0.3), Inches(3.2), Inches(3.0), Inches(1.8), desc, font_size=13, color=RGBColor(0x55,0x55,0x55))

add_text_box(slide, Inches(0.8), Inches(6.3), Inches(11), Inches(0.5), "We need an autonomous, satellite-native observatory that turns raw spectral bands into actionable ecological intelligence.", font_size=13, bold=True, color=BLACK, font_name="Calibri", alignment=PP_ALIGN.CENTER)

# Slide 3: Solution
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, RGBColor(0x0E,0x0E,0x0E))

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(3), Inches(0.3), "03 / SOLUTION", font_size=10, bold=True, color=CYAN, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.9), Inches(6), Inches(1.0), "Introducing AquaSense", font_size=36, bold=True, color=CREAM, font_name="Times New Roman")
add_text_box(slide, Inches(0.8), Inches(1.8), Inches(5.5), Inches(1.0), "An end-to-end Earth Observation pipeline that ingests Sentinel-2, computes NDWI, and delivers hydrological change with AI ecological synthesis.", font_size=14, color=RGBColor(0xAA,0xA8,0xA5), font_name="Calibri")

features = [
    "🛰️  STAC Auto-Discovery — Queries Microsoft Planetary Computer for best low-cloud scenes with retry-on-failure",
    "🌊  NDWI Intelligence — (B03-B08)/(B03+B08) with dynamic thresholding & 5 color ramps (Viridis, Plasma, etc)",
    "📊  Pixel Quantification — Real-time water extent in km², % change, longitudinal trend (2019-2025)",
    "🧠  Gemini Ecological AI — 4 modes: Deep Reasoning, Search Grounding, Maps Grounding, Fast Summary",
    "🗺️  Interactive Observatory — Drag BBOX anchors, split-slider comparison, diff mask (gain/loss)",
    "📸  Field Verification — Multimodal image understanding for ground-truthing & few-shot classification"
]
add_bullet_list(slide, Inches(0.8), Inches(3.0), Inches(5.5), Inches(4.0), features, font_size=13, color=CREAM, spacing=Pt(12))

# Right visual - pipeline diagram
add_shape(slide, Inches(7.2), Inches(1.0), Inches(5.3), Inches(5.8), RGBColor(0x1A,0x1A,0x1A), border_color=RGBColor(0x2A,0x2A,0x2A))
steps = [
    ("01", "STAC INGEST", "Sentinel-2 L2A\nPlanetary Computer\nCloud <20%"),
    ("02", "NDWI COMPUTE", "(B03-B08)/(B03+B08)\nColorized LUT\nThreshold >0.20"),
    ("03", "DIFF & TREND", "Water pixels ×0.0001\nkm² change\nAnnual snapshots"),
    ("04", "AI SYNTHESIS", "Gemini 3.7 Flash\nEcology + Search\n+ Maps Grounding")
]
for i, (num, title, desc) in enumerate(steps):
    top = Inches(1.4 + i*1.35)
    add_shape(slide, Inches(7.6), top, Inches(0.6), Inches(0.6), BLACK)
    add_text_box(slide, Inches(7.6), top, Inches(0.6), Inches(0.6), num, font_size=14, bold=True, color=AMBER, alignment=PP_ALIGN.CENTER, font_name="Consolas")
    add_text_box(slide, Inches(8.5), top, Inches(2.0), Inches(0.3), title, font_size=11, bold=True, color=CREAM, font_name="Consolas")
    add_text_box(slide, Inches(8.5), top+Inches(0.35), Inches(2.5), Inches(0.8), desc, font_size=10, color=RGBColor(0x88,0x88,0x88), font_name="Consolas")

# Slide 4: Architecture
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, CREAM)
add_shape(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.0), BLACK)
add_text_box(slide, Inches(0.8), Inches(0.2), Inches(4), Inches(0.6), "04 / ARCHITECTURE", font_size=10, bold=True, color=CYAN, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.1), Inches(8), Inches(0.8), "System Architecture & Tech Stack", font_size=28, bold=True, color=CREAM, font_name="Times New Roman")

# Architecture boxes
arch = [
    ("FRONTEND", "React 19 + Vite\nTailwind 4.1\nMap Editor, Split Slider\nRecharts, Turf.js", Inches(0.8)),
    ("BACKEND", "Express + TSX\nSTAC API Client\nRaster Pipeline\nProvenance Export", Inches(3.2)),
    ("GEOSPATIAL", "Sentinel-2 L2A\nNDWI: B03 & B08\nPlanetary Computer\nCloud Filter + BBOX", Inches(5.6)),
    ("ML / AI", "Clay Encoder\nPrithvi Foundation\nFew-Shot Classifier\nKNN / Logistic", Inches(8.0)),
    ("GEN AI", "Gemini 3.7 Flash\nDeep Reasoning\nSearch Grounding\nMaps + Multimodal", Inches(10.4))
]
for title, desc, left in arch:
    add_shape(slide, left, Inches(1.6), Inches(2.2), Inches(2.8), RGBColor(0xFF,0xFF,0xFF), border_color=BLACK)
    add_text_box(slide, left+Inches(0.2), Inches(1.7), Inches(1.8), Inches(0.3), title, font_size=10, bold=True, color=BLUE, font_name="Consolas")
    add_text_box(slide, left+Inches(0.2), Inches(2.1), Inches(1.8), Inches(1.8), desc, font_size=11, color=BLACK, font_name="Consolas")

# Data flow
add_text_box(slide, Inches(0.8), Inches(4.8), Inches(11), Inches(0.4), "DATA FLOW:  User BBOX → STAC Search (5 candidates) → Verify Rasters → NDWI Thresholding → Color LUT → Diff Mask → Trend → Gemini Analysis → Export", font_size=10, bold=True, color=BLACK, font_name="Consolas", alignment=PP_ALIGN.CENTER)
add_shape(slide, Inches(0.8), Inches(5.2), Inches(11.7), Inches(0.08), BLACK)

# Tech logos / stack details
stack_details = [
    "✔ Sentinel-2 10m resolution (0.0001 km²/pixel)  |  ✔ Microsoft Planetary Computer STAC v1  |  ✔ NDWI = (Green - NIR)/(Green + NIR)",
    "✔ Retry-On-Failure: Tests top 5 scenes for raster integrity  |  ✔ Real-time threshold recalculation with canvas pixel counting",
    "✔ Export: GeoJSON + Provenance JSON with methodology hash 0x8a92f02c"
]
add_bullet_list(slide, Inches(0.8), Inches(5.6), Inches(11), Inches(1.5), stack_details, font_size=11, color=RGBColor(0x44,0x44,0x44))

# Slide 5: Key Features Deep Dive
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, BLACK)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(4), Inches(0.3), "05 / FEATURES", font_size=10, bold=True, color=AMBER, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.9), Inches(7), Inches(0.8), "Observatory-Grade Features", font_size=32, bold=True, color=CREAM, font_name="Times New Roman")

features_grid = [
    ("Interactive BBOX Editor", "Drag corner anchors on Leaflet map, upload GeoJSON boundary, live bbox telemetry. Precision control for any wetland."),
    ("Dynamic NDWI Controls", "Slider -0.30 to +0.70, presets [-0.05, 0.10, 0.20, 0.35]. Instant recalculation of km² water extent & trend."),
    ("5 Scientific Color Ramps", "Viridis, Plasma, Inferno, Cividis, Turbo. CSS gradient preview, LUT needle bar, scale legend."),
    ("True Color vs NDWI Swipe", "Split-slider with handle, T0 vs T1 comparison, Raw vs Colorized, Diff Mask (Blue=gain, Red=loss)."),
    ("Cloud Filter Intelligence", "Slider 1-80%, presets [10,20,35,50]%. STAC query sorts by eo:cloud_cover ASC, verifies raster load."),
    ("Provenance & Export", "JSON with timestamp, system_hash, methodology, bbox, quantification, source scene IDs. Audit-ready.")
]

for i, (title, desc) in enumerate(features_grid):
    col = i % 3
    row = i // 3
    left = Inches(0.8 + col*4.1)
    top = Inches(2.0 + row*2.5)
    add_shape(slide, left, top, Inches(3.8), Inches(2.0), RGBColor(0x1E,0x1E,0x1E), border_color=RGBColor(0x2E,0x2E,0x2E))
    add_text_box(slide, left+Inches(0.3), top+Inches(0.2), Inches(3.2), Inches(0.4), title, font_size=12, bold=True, color=CREAM, font_name="Calibri")
    add_text_box(slide, left+Inches(0.3), top+Inches(0.7), Inches(3.2), Inches(1.1), desc, font_size=10, color=RGBColor(0x99,0x99,0x99), font_name="Calibri")

# Slide 6: AI & ML Innovation
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, CREAM)

add_shape(slide, Inches(0), Inches(0), Inches(5.5), Inches(7.5), BLACK)
add_text_box(slide, Inches(0.8), Inches(0.5), Inches(3), Inches(0.3), "06 / AI + ML", font_size=10, bold=True, color=CYAN, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.9), Inches(4.0), Inches(1.2), "Few-Shot Intelligence & Gemini Reasoning", font_size=28, bold=True, color=CREAM, font_name="Times New Roman")
add_text_box(slide, Inches(0.8), Inches(2.3), Inches(4.0), Inches(1.0), "Beyond NDWI: We embed spectral patches and classify with minimal labels — then explain it with grounded LLMs.", font_size=12, color=RGBColor(0xAA,0xA8,0xA5), font_name="Calibri")

ml_items = [
    "ENCODERS: Clay (foundation EO model) + Prithvi (NASA IBM geospatial)",
    "CLASSIFIERS: KNN, Logistic, Few-Shot Prototypical (water/wetland/built_up)",
    "PATCH EXTRACTION: Sliding window inference over Sentinel tiles",
    "FINE-TUNING: Python pipeline with PyTorch, adapter training"
]
add_bullet_list(slide, Inches(0.8), Inches(3.5), Inches(4.0), Inches(2.0), ml_items, font_size=11, color=CREAM)

add_text_box(slide, Inches(0.8), Inches(5.8), Inches(4.0), Inches(0.8), "GEMINI MODES:\n• Deep Reasoning (3.7 Flash) – Hydrological trajectory\n• Search Grounding – Recent news & conservation\n• Maps Grounding – Landmarks & protected zones\n• Fast Summary (3.1 Lite) – Low-latency bullets\n• Multimodal – Field photo validation", font_size=10, color=RGBColor(0x88,0x88,0x88), font_name="Consolas")

# Right side - Gemini modes visual
add_text_box(slide, Inches(6.0), Inches(0.5), Inches(6), Inches(0.8), "Four-Mode Ecological Intelligence", font_size=20, bold=True, color=BLACK, font_name="Calibri")

modes = [
    ("🧠 DEEP THINKING", "gemini-3.7-flash", "Hydrological trajectory, driving factors, ecosystem services, conservation interventions. Authoritative synthesis."),
    ("🔍 SEARCH GROUNDED", "gemini-3.5-flash + GoogleSearch", "Live factual grounding: recent reports, government actions, climate events in basin. With citations."),
    ("🗺️ MAPS GROUNDED", "gemini-3.5-flash + GoogleMaps", "Geographic orientation: landmarks, protected zones, urban centers, inlets/outlets."),
    ("⚡ FAST SUMMARY", "gemini-3.1-flash-lite", "3-4 bullet low-latency summary for dashboards. Optimized for speed."),
    ("📸 FIELD INSPECTION", "Multimodal Vision", "Upload drone/field photo → water clarity, algae, vegetation, encroachment + few-shot scores.")
]
for i, (title, model, desc) in enumerate(modes):
    top = Inches(1.3 + i*1.15)
    add_shape(slide, Inches(6.0), top, Inches(6.5), Inches(1.0), RGBColor(0xFF,0xFF,0xFF), border_color=BLACK)
    add_text_box(slide, Inches(6.2), top+Inches(0.05), Inches(2.5), Inches(0.25), title, font_size=10, bold=True, color=BLACK, font_name="Consolas")
    add_text_box(slide, Inches(6.2), top+Inches(0.3), Inches(2.5), Inches(0.2), model, font_size=8, color=BLUE, font_name="Consolas")
    add_text_box(slide, Inches(8.8), top+Inches(0.1), Inches(3.5), Inches(0.8), desc, font_size=10, color=RGBColor(0x55,0x55,0x55), font_name="Calibri")

# Slide 7: Demo / UI Walkthrough
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, RGBColor(0x16,0x16,0x16))

add_text_box(slide, Inches(0.8), Inches(0.4), Inches(4), Inches(0.3), "07 / LIVE DEMO", font_size=10, bold=True, color=AMBER, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.8), Inches(8), Inches(0.8), "Observatory Interface Walkthrough", font_size=30, bold=True, color=CREAM, font_name="Times New Roman")

# Mock UI panels
# Left panel
add_shape(slide, Inches(0.8), Inches(1.8), Inches(3.0), Inches(5.0), RGBColor(0xD7,0xD4,0xCF), border_color=BLACK)
add_text_box(slide, Inches(1.0), Inches(1.9), Inches(2.6), Inches(0.3), "PIPELINE TELEMETRY", font_size=8, bold=True, color=BLACK, font_name="Consolas")
add_text_box(slide, Inches(1.0), Inches(2.3), Inches(2.6), Inches(1.0), "1. Planetary Computer STAC ✓\n2. NDWI Raster & LUT ✓\n3. Hydrological Differencing ✓", font_size=9, color=BLACK, font_name="Consolas")
add_text_box(slide, Inches(1.0), Inches(3.4), Inches(2.6), Inches(0.3), "AREA OF INTEREST", font_size=8, bold=True, color=BLACK, font_name="Consolas")
add_shape(slide, Inches(1.0), Inches(3.8), Inches(2.6), Inches(1.5), RGBColor(0x22,0x22,0x22))
add_text_box(slide, Inches(1.1), Inches(4.0), Inches(2.4), Inches(1.0), "[Interactive BBOX Map]\nDrag anchors\n12.91,80.20 → 12.95,80.23", font_size=8, color=CREAM, font_name="Consolas", alignment=PP_ALIGN.CENTER)

# Center canvas
add_shape(slide, Inches(4.2), Inches(1.8), Inches(5.0), Inches(5.0), BLACK, border_color=RGBColor(0x33,0x33,0x33))
add_text_box(slide, Inches(4.4), Inches(1.9), Inches(4.6), Inches(0.4), "TRUE COLOR SWIPE  |  NDWI SWIPE (VIRIDIS)  |  DIFF MASK", font_size=7, bold=True, color=CREAM, font_name="Consolas")
add_shape(slide, Inches(4.4), Inches(2.4), Inches(4.6), Inches(3.5), RGBColor(0x1A,0x1A,0x1A))
add_text_box(slide, Inches(4.4), Inches(3.8), Inches(4.6), Inches(0.6), "[Satellite Split Slider]\n2019 ← drag → 2025\nTrue Color + NDWI Colorized", font_size=10, color=RGBColor(0x66,0x66,0x66), font_name="Consolas", alignment=PP_ALIGN.CENTER)
add_text_box(slide, Inches(4.4), Inches(6.0), Inches(4.6), Inches(0.5), "NDWI Scale: -1.0 [Water ← → Land] +1.0  Threshold >0.20", font_size=8, color=CYAN, font_name="Consolas")

# Right panel
add_shape(slide, Inches(9.6), Inches(1.8), Inches(3.0), Inches(5.0), RGBColor(0xDF,0xDC,0xD7), border_color=BLACK)
add_text_box(slide, Inches(9.8), Inches(1.9), Inches(2.6), Inches(0.3), "HYDROLOGICAL QUANTIFICATION", font_size=8, bold=True, color=BLACK, font_name="Consolas")
add_text_box(slide, Inches(9.8), Inches(2.3), Inches(2.6), Inches(1.2),
             "2019 WATER: 4.82 km²\n2025 WATER: 3.15 km²\nCHANGE: -1.67 km²\nRELATIVE: -34.6%\n\n[Longitudinal Trend Chart]\n2019→2020→2021→2025",
             font_size=9, color=BLACK, font_name="Consolas")
add_shape(slide, Inches(9.8), Inches(4.0), Inches(2.6), Inches(2.0), RGBColor(0xFF,0xFF,0xFF), border_color=BLACK)
add_text_box(slide, Inches(10.0), Inches(4.1), Inches(2.2), Inches(0.3), "✨ GEMINI INSIGHTS", font_size=8, bold=True, color=BLACK, font_name="Consolas")
add_text_box(slide, Inches(10.0), Inches(4.5), Inches(2.2), Inches(1.2), "Hydrological Trajectory...\nDriving Factors...\nEcosystem Services...\nRecommendations...", font_size=8, color=RGBColor(0x55,0x55,0x55), font_name="Calibri")

# Slide 8: Impact & Use Cases
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, CREAM)

add_shape(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.0), BLACK)
add_text_box(slide, Inches(0.8), Inches(0.2), Inches(4), Inches(0.3), "08 / IMPACT", font_size=10, bold=True, color=AMBER, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.1), Inches(8), Inches(0.8), "Real-World Impact & Use Cases", font_size=28, bold=True, color=CREAM, font_name="Times New Roman")

use_cases = [
    ("🏛️ Government & Policy", "Wetland Authority monitoring, Ramsar reporting, encroachment detection, flood/drought vulnerability mapping."),
    ("🌱 Conservation NGOs", "Biodiversity assessment, habitat loss alerts, restoration prioritization, community engagement with visual proof."),
    ("🏙️ Urban Planning", "Chennai Pallikaranai case: -34% loss correlates with urbanization. Early warning for planners to enforce buffers."),
    ("🔬 Research & Academia", "Longitudinal studies, climate correlation, open STAC data, reproducible provenance JSON, ML few-shot benchmarks."),
    ("🚨 Disaster Response", "Pre-monsoon water capacity assessment, post-flood inundation mapping, drought early warning via NDWI trend."),
    ("📱 Citizen Science", "Field photo upload for ground-truthing, community wetland watch, educational tool for EO literacy.")
]

for i, (title, desc) in enumerate(use_cases):
    col = i % 3
    row = i // 3
    left = Inches(0.8 + col*4.1)
    top = Inches(1.6 + row*2.6)
    add_shape(slide, left, top, Inches(3.8), Inches(2.2), RGBColor(0xFF,0xFF,0xFF), border_color=BLACK)
    add_text_box(slide, left+Inches(0.3), top+Inches(0.2), Inches(3.2), Inches(0.4), title, font_size=12, bold=True, color=BLACK, font_name="Calibri")
    add_text_box(slide, left+Inches(0.3), top+Inches(0.7), Inches(3.2), Inches(1.3), desc, font_size=11, color=RGBColor(0x55,0x55,0x55), font_name="Calibri")

# Slide 9: Quantification Methodology
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, BLACK)

add_text_box(slide, Inches(0.8), Inches(0.5), Inches(4), Inches(0.3), "09 / METHODOLOGY", font_size=10, bold=True, color=CYAN, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.9), Inches(7), Inches(0.8), "Scientific Rigor & Quantification", font_size=30, bold=True, color=CREAM, font_name="Times New Roman")

left_content = [
    "FORMULA: NDWI = (Green - NIR) / (Green + NIR) = (B03 - B08)/(B03+B08)",
    "  • B03 = 560nm Green, B08 = 842nm NIR, Sentinel-2 L2A",
    "  • Range -1 to +1, Water >0.20 typically",
    "",
    "PIXEL COUNTING:",
    "  • Canvas-based raster analysis (offscreen)",
    "  • countWaterPixelsWithThreshold() → water pixels",
    "  • Area = pixels × 0.0001 km² (10m × 10m = 100m²)",
    "",
    "DIFFERENCE MASK:",
    "  • generateDifferenceMapWithThreshold()",
    "  • Blue = Gained (inundation), Red = Lost (desiccation)",
    "  • Dark Blue = Unchanged water",
    "",
    "ROBUSTNESS:",
    "  • Retry-On-Failure across top 5 STAC candidates",
    "  • Pre-cache verification with getCachedImage()",
    "  • Cloud occlusion advisory >15%"
]
add_bullet_list(slide, Inches(0.8), Inches(2.0), Inches(5.5), Inches(5.0), left_content, font_size=11, color=CREAM)

# Right - code snippet visual
add_shape(slide, Inches(7.0), Inches(1.8), Inches(5.5), Inches(5.2), RGBColor(0x1A,0x1A,0x1A), border_color=RGBColor(0x2A,0x2A,0x2A))
add_text_box(slide, Inches(7.3), Inches(2.0), Inches(5.0), Inches(0.3), "pipeline.ts // core logic", font_size=9, color=RGBColor(0x66,0x66,0x66), font_name="Consolas")
code = """// STAC Search with cloud filter
POST /api/stac/v1/search
{
  collections: [\"sentinel-2-l2a\"],
  bbox: [80.20,12.91,80.23,12.95],
  datetime: \"2019-03-01/2019-03-31\",
  query: { \"eo:cloud_cover\": {lt: 20} },
  sortby: [{field: \"eo:cloud_cover\", dir: \"asc\"}],
  limit: 5
}

// NDWI Preview URL
.../item/preview.png?expression=(B03-B08)/(B03+B08)
&asset_as_band=True&rescale=-1,1

// Area Calculation
area_km2 = water_pixels * 0.0001
change = areaB - areaA
pct = (change/areaA)*100

// Provenance Export
{
  methodology: \"NDWI >0.20, 10m\",
  system_hash: \"0x8a92f02c\",
  quantification: { yearA, yearB, change }
}"""
add_text_box(slide, Inches(7.3), Inches(2.5), Inches(5.0), Inches(4.2), code, font_size=9, color=RGBColor(0x88,0xCC,0x88), font_name="Consolas")

# Slide 10: Roadmap
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, CREAM)

add_shape(slide, Inches(0), Inches(0), Inches(13.333), Inches(1.0), BLACK)
add_text_box(slide, Inches(0.8), Inches(0.2), Inches(4), Inches(0.3), "10 / ROADMAP", font_size=10, bold=True, color=AMBER, font_name="Consolas")
add_text_box(slide, Inches(0.8), Inches(0.1), Inches(8), Inches(0.8), "Roadmap & Future Vision", font_size=28, bold=True, color=CREAM, font_name="Times New Roman")

roadmap = [
    ("NOW - Q3 2025", "✓ MVP Observatory\n✓ STAC + NDWI Pipeline\n✓ Gemini 4-Mode Insights\n✓ Pallikaranai Validation", True),
    ("NEXT - Q4 2025", "• Multi-index: NDVI, MNDWI, AWEI\n• Time-series animation\n• User accounts & saved AOIs\n• Mobile PWA + offline tiles", False),
    ("Q1 2026", "• Clay & Prithvi fine-tuning UI\n• Few-shot labeling tool\n• Crowdsourced ground-truth\n• Model comparison dashboard", False),
    ("Q2 2026 - SCALE", "• Pan-India wetland atlas\n• API for NGOs & govt\n• Alert system (loss >10%)\n• Partnerships: ISRO, WWF", False),
    ("VISION 2027", "• Global wetland watch\n• Carbon credit quantification\n• Flood prediction integration\n• Open science platform", False)
]

for i, (phase, items, is_done) in enumerate(roadmap):
    left = Inches(0.8 + i*2.5)
    add_shape(slide, left, Inches(1.6), Inches(2.2), Inches(4.5), RGBColor(0xFF,0xFF,0xFF) if not is_done else BLACK, border_color=BLACK)
    add_text_box(slide, left+Inches(0.2), Inches(1.7), Inches(1.8), Inches(0.3), phase, font_size=9, bold=True, color=AMBER if is_done else BLUE, font_name="Consolas")
    add_text_box(slide, left+Inches(0.2), Inches(2.1), Inches(1.8), Inches(3.5), items, font_size=11, color=CREAM if is_done else BLACK, font_name="Consolas")

# Slide 11: Closing / Thank You
slide = prs.slides.add_slide(prs.slide_layouts[6])
set_slide_bg(slide, BLACK)

add_shape(slide, Inches(0.8), Inches(0.6), Inches(1.2), Pt(4), CREAM)
add_text_box(slide, Inches(0.8), Inches(1.2), Inches(8), Inches(1.0), "AquaSense", font_size=48, bold=True, color=CREAM, font_name="Times New Roman")
add_text_box(slide, Inches(0.8), Inches(2.2), Inches(8), Inches(0.6), "Protecting wetlands with satellite intelligence.", font_size=20, color=RGBColor(0xAA,0xA8,0xA5), font_name="Calibri")

add_text_box(slide, Inches(0.8), Inches(3.2), Inches(5), Inches(2.0),
             "Every pixel tells a story.\nEvery km² matters.\n\nBuilt with:\n• Microsoft Planetary Computer\n• Sentinel-2 L2A • NDWI Science\n• Gemini Ecological Reasoning\n• Few-Shot Foundation Models",
             font_size=14, color=CREAM, font_name="Calibri")

add_shape(slide, Inches(7.5), Inches(1.0), Inches(5.0), Inches(5.5), RGBColor(0x1E,0x1E,0x1E), border_color=RGBColor(0x33,0x33,0x33))
add_text_box(slide, Inches(8.0), Inches(1.3), Inches(4.0), Inches(0.5), "GET STARTED", font_size=12, bold=True, color=AMBER, font_name="Consolas")
add_text_box(slide, Inches(8.0), Inches(1.9), Inches(4.0), Inches(1.0),
             "Live Demo: aquasense.eo\nGitHub: Naeha-S/Aquasense\n\nTry Pallikaranai Marsh\nChennai • 2019 → 2025\nBBOX: 80.20,12.91,80.23,12.95",
             font_size=13, color=CREAM, font_name="Consolas")

add_text_box(slide, Inches(8.0), Inches(3.5), Inches(4.0), Inches(1.5),
             "Contact:\n[Your Name]\n[Email] • [LinkedIn]\n\n\"From spectral bands to ecological insights — autonomous, explainable, actionable.\"",
             font_size=11, color=RGBColor(0x88,0x88,0x88), font_name="Calibri")

add_text_box(slide, Inches(0.8), Inches(6.8), Inches(11), Inches(0.3), "Ω AquaSense EO • STAC • EO-HYDRO • NDWI (B03-B08)/(B03+B08) • 10m/px • 0x8a92f02c • Built for Earth", font_size=8, color=RGBColor(0x55,0x55,0x55), font_name="Consolas", alignment=PP_ALIGN.CENTER)

# Save
output_path = "/home/user/Aquasense/AquaSense_Pitch_Deck.pptx"
prs.save(output_path)
print(f"Saved to {output_path}")

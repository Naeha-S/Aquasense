import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ==============================================================================
# AQUASENSE DEEP OCEANIC & ORBITAL EARTH OBSERVATION DESIGN SYSTEM
# ==============================================================================

# Background & Layer Hierarchy (Deep Abyssal to Oceanic Shelf)
OCEAN_ABYSS     = RGBColor(0x03, 0x07, 0x12) # Deep Space Abyssal Black (#030712)
OCEAN_DEEP      = RGBColor(0x07, 0x13, 0x26) # Mariana Oceanic Navy (#071326)
OCEAN_CARD      = RGBColor(0x0C, 0x1E, 0x3D) # Submerged Trench Card (#0C1E3D)
OCEAN_CARD_HI   = RGBColor(0x13, 0x2B, 0x54) # Continental Shelf Highlight (#132B54)
OCEAN_PANEL     = RGBColor(0x17, 0x35, 0x64) # Elevated Instrument Surface (#173564)

# Borders & Structural Grid
OCEAN_BORDER    = RGBColor(0x1D, 0x3D, 0x73) # Subtle Deep Sea Marine Border (#1D3D73)
OCEAN_BORDER_HI = RGBColor(0x02, 0x84, 0xC7) # Electric Azure Active Border (#0284C7)
BORDER_AQUA     = RGBColor(0x06, 0xD6, 0xA0) # Bioluminescent Emerald Teal (#06D6A0)

# Bioluminescent Accents & Spectral Palette
AQUA_BRIGHT     = RGBColor(0x22, 0xD3, 0xEE) # Phosphorescent Aqua Cyan (#22D3EE)
AQUA_ELECTRIC   = RGBColor(0x0E, 0xA5, 0xE9) # Electric Ocean Sky (#0EA5E9)
AQUA_DEEP       = RGBColor(0x02, 0x84, 0xC7) # Deep Atlantic Blue (#0284C7)
TEAL_BIO        = RGBColor(0x06, 0xD6, 0xA0) # Coastal Mangrove Bioluminescence (#06D6A0)
SOLAR_AMBER     = RGBColor(0xFB, 0xBF, 0x24) # Orbital Sunlight / Flare (#FBBF24)
CORAL_CRIMSON   = RGBColor(0xF4, 0x3F, 0x5E) # Desiccation / Loss Crimson (#F43F5E)

# Typography Hierarchy
TEXT_GLACIAL    = RGBColor(0xF0, 0xFD, 0xFA) # Pure Glacial White / Ice (#F0FDFA)
TEXT_FOAM       = RGBColor(0xCA, 0xDA, 0xEE) # Seafoam Silver Secondary (#CADDAE)
TEXT_SEABED     = RGBColor(0x73, 0x8C, 0xAD) # Seabed Muted Gray (#738CAD)
TEXT_MONO_CYAN  = RGBColor(0x38, 0xBD, 0xF8) # Telemetry Bright Cyan (#38BDF8)

FONT_TITLE = "Trebuchet MS"
FONT_BODY  = "Calibri"
FONT_MONO  = "Consolas"

# Assets Directory
ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "images")
IMG_SATELLITE = os.path.join(ASSETS_DIR, "satellite_earth_orbit.jpg")
IMG_SPECTRAL  = os.path.join(ASSETS_DIR, "wetland_ndwi_spectral.jpg")
IMG_DRONE     = os.path.join(ASSETS_DIR, "multimodal_field_drone.jpg")
IMG_ARCH      = os.path.join(ASSETS_DIR, "technical_approach_diagram.jpg")

IMG_NODE1     = os.path.join(ASSETS_DIR, "node1_stac_satellite.jpg")
IMG_NODE2     = os.path.join(ASSETS_DIR, "node2_band_math.jpg")
IMG_NODE3     = os.path.join(ASSETS_DIR, "node3_diff_mask.jpg")
IMG_NODE4     = os.path.join(ASSETS_DIR, "node4_gemini_ai.jpg")

# Initialize 16:9 Widescreen Presentation
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK_LAYOUT = prs.slide_layouts[6]

# ==============================================================================
# ROBUST DRAWING & LAYOUT HELPER FUNCTIONS
# ==============================================================================
def create_slide(prs, bg_color=OCEAN_ABYSS):
    slide = prs.slides.add_slide(BLANK_LAYOUT)
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = bg_color
    return slide

def add_rect(slide, left, top, width, height, fill_color, border_color=None, border_width=1):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(border_width)
    else:
        shape.line.fill.background()
    return shape

def add_pill_badge(slide, left, top, width, height, text, bg_color=OCEAN_CARD_HI, text_color=AQUA_BRIGHT, font_size=8.5):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = OCEAN_BORDER
    shape.line.width = Pt(0.75)
    
    tf = shape.text_frame
    tf.word_wrap = False
    tf.margin_left = Inches(0.06)
    tf.margin_right = Inches(0.06)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = True
    p.font.color.rgb = text_color
    p.font.name = FONT_MONO
    p.alignment = PP_ALIGN.CENTER
    return shape

def add_slide_header(slide, slide_num, category, title, subtitle=None):
    add_rect(slide, Inches(0.8), Inches(0.4), Inches(1.8), Pt(3), AQUA_BRIGHT)
    add_pill_badge(slide, Inches(0.8), Inches(0.52), Inches(2.2), Inches(0.28), f"ORBIT {slide_num:02d} // {category.upper()}", bg_color=OCEAN_CARD, text_color=SOLAR_AMBER, font_size=8.5)
    
    txBox = slide.shapes.add_textbox(Inches(0.8), Inches(0.82), Inches(11.7), Inches(0.65))
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = TEXT_GLACIAL
    p.font.name = FONT_TITLE
    
    if subtitle:
        p2 = tf.add_paragraph()
        p2.text = subtitle
        p2.font.size = Pt(11.5)
        p2.font.color.rgb = TEXT_SEABED
        p2.font.name = FONT_BODY
        p2.space_before = Pt(2)

def add_card(slide, left, top, width, height, title="", category_tag="", bg_color=OCEAN_CARD, border_color=OCEAN_BORDER, border_width=1):
    card = add_rect(slide, left, top, width, height, bg_color, border_color, border_width)
    
    if category_tag or title:
        txBox = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.16), width - Inches(0.4), Inches(0.65))
        tf = txBox.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        if category_tag:
            p0 = tf.paragraphs[0]
            p0.text = category_tag.upper()
            p0.font.size = Pt(8)
            p0.font.bold = True
            p0.font.color.rgb = AQUA_BRIGHT
            p0.font.name = FONT_MONO
            p0.space_after = Pt(2)
            
            if title:
                p1 = tf.add_paragraph()
                p1.text = title
                p1.font.size = Pt(12)
                p1.font.bold = True
                p1.font.color.rgb = TEXT_GLACIAL
                p1.font.name = FONT_TITLE
        elif title:
            p0 = tf.paragraphs[0]
            p0.text = title
            p0.font.size = Pt(12)
            p0.font.bold = True
            p0.font.color.rgb = TEXT_GLACIAL
            p0.font.name = FONT_TITLE
            
    return card

def add_bullet_list(slide, left, top, width, height, items, font_size=10.0, color=TEXT_FOAM, spacing=Pt(4)):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    for idx, item in enumerate(items):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = item
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = FONT_BODY
        p.space_after = spacing
    return txBox

def add_table_grid(slide, left, top, width, height, headers, rows, col_widths=None):
    num_cols = len(headers)
    num_rows = len(rows) + 1
    table_shape = slide.shapes.add_table(num_rows, num_cols, left, top, width, height)
    table = table_shape.table
    
    if col_widths and len(col_widths) == num_cols:
        for i, w in enumerate(col_widths):
            table.columns[i].width = w
            
    for c_idx, head in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = OCEAN_PANEL
        p = cell.text_frame.paragraphs[0]
        p.text = head.upper()
        p.font.size = Pt(8.5)
        p.font.bold = True
        p.font.color.rgb = AQUA_BRIGHT
        p.font.name = FONT_MONO
        p.alignment = PP_ALIGN.LEFT
        
    for r_idx, row_data in enumerate(rows):
        row_bg = OCEAN_CARD if r_idx % 2 == 0 else OCEAN_DEEP
        for c_idx, cell_data in enumerate(row_data):
            cell = table.cell(r_idx + 1, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = row_bg
            p = cell.text_frame.paragraphs[0]
            p.text = str(cell_data)
            p.font.size = Pt(9)
            p.font.name = FONT_BODY
            p.font.color.rgb = TEXT_GLACIAL if c_idx == 0 else TEXT_FOAM
            if c_idx == 0:
                p.font.bold = True
                
    return table_shape

def add_image_with_frame(slide, image_path, left, top, width, height, label=None, border_color=OCEAN_BORDER_HI):
    if os.path.exists(image_path):
        pic = slide.shapes.add_picture(image_path, left, top, width, height)
        frame = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
        frame.fill.background()
        frame.line.color.rgb = border_color
        frame.line.width = Pt(1.5)
        
        if label:
            add_pill_badge(slide, left + Inches(0.12), top + Inches(0.12), Inches(len(label)*0.075 + 0.4), Inches(0.24), label, bg_color=OCEAN_ABYSS, text_color=AQUA_BRIGHT, font_size=7.0)
        return pic
    else:
        card = add_card(slide, left, top, width, height, title="Image Asset", category_tag=label or "GRAPHIC", border_color=border_color)
        return card

def add_footer_telemetry(slide, text="AQUASENSE OBSERVATORY • SENTINEL-2 L2A STAC • NDWI (B03-B08)/(B03+B08) • 10m/px • GEMINI 3.7 FLASH • 0x8a92f02c"):
    txBox = slide.shapes.add_textbox(Inches(0.8), Inches(7.08), Inches(11.7), Inches(0.3))
    tf = txBox.text_frame
    tf.word_wrap = False
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(7.5)
    p.font.color.rgb = TEXT_SEABED
    p.font.name = FONT_MONO
    p.alignment = PP_ALIGN.CENTER

# ==============================================================================
# SLIDE 1: COSMIC ORBITAL HERO SLIDE (WITH EMBEDDED SATELLITE IMAGE)
# ==============================================================================
slide1 = create_slide(prs)

add_pill_badge(slide1, Inches(0.8), Inches(0.6), Inches(3.2), Inches(0.28), "ORBITAL NODE: ESA SENTINEL-2 // STAC", bg_color=OCEAN_DEEP, text_color=AQUA_BRIGHT, font_size=8)
add_rect(slide1, Inches(0.8), Inches(0.95), Inches(1.8), Pt(4), AQUA_BRIGHT)

# Left Column: Observatory Title & Value Proposition
tx_title = slide1.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(6.2), Inches(2.2))
tf = tx_title.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

p1 = tf.paragraphs[0]
p1.text = "AquaSense"
p1.font.size = Pt(52)
p1.font.bold = True
p1.font.color.rgb = TEXT_GLACIAL
p1.font.name = FONT_TITLE

p2 = tf.add_paragraph()
p2.text = "Autonomous Earth Observation & AI Wetland Hydro-Observatory"
p2.font.size = Pt(16)
p2.font.bold = True
p2.font.color.rgb = AQUA_BRIGHT
p2.font.name = FONT_BODY
p2.space_before = Pt(4)

p3 = tf.add_paragraph()
p3.text = "Continuous multispectral satellite ingestion, real-time NDWI temporal quantification, and multimodal ecological reasoning powered by Google Gemini 3.7 & Microsoft Planetary Computer."
p3.font.size = Pt(11.5)
p3.font.color.rgb = TEXT_FOAM
p3.font.name = FONT_BODY
p3.space_before = Pt(8)

# Core Feature Badges
badges_s1 = [
    ("🛰️ STAC Pipeline", OCEAN_PANEL, AQUA_BRIGHT),
    ("💧 NDWI Canvas", OCEAN_PANEL, TEAL_BIO),
    ("🧠 Gemini 3.7 AI", OCEAN_PANEL, SOLAR_AMBER),
    ("🔬 Few-Shot ML", OCEAN_PANEL, TEXT_FOAM)
]
for idx, (txt, bg_c, txt_c) in enumerate(badges_s1):
    add_pill_badge(slide1, Inches(0.8 + idx * 1.55), Inches(3.7), Inches(1.48), Inches(0.32), txt, bg_color=bg_c, text_color=txt_c, font_size=8)

# Live Study Area Telemetry Panel (Left Lower)
add_card(slide1, Inches(0.8), Inches(4.3), Inches(6.0), Inches(2.5), title="Active Pilot: Pallikaranai Ramsar Basin", category_tag="LONGITUDINAL HYDROLOGICAL TELEMETRY", bg_color=OCEAN_CARD, border_color=OCEAN_BORDER_HI)
add_bullet_list(slide1, Inches(1.0), Inches(4.95), Inches(5.6), Inches(1.75), [
    "• Coordinates: [80.20°E, 12.91°N] to [80.23°E, 12.95°N] • Chennai, India",
    "• Observation Epochs: Baseline 2019 (T0) → Target 2025 (T1) Multi-Year Audit",
    "• Spectral Bands: Sentinel-2 L2A BOA (B03 Green 560nm, B08 NIR 842nm)",
    "• Resolution & Area Metric: 10m Ground Grid = 0.0001 km² / pixel",
    "• Gemini Grounding: Real-time Search + Maps + Multimodal Drone Vision"
], font_size=9.5, spacing=Pt(2))

# Right Column: High-Resolution Satellite Visual Asset
add_image_with_frame(slide1, IMG_SATELLITE, Inches(7.1), Inches(0.8), Inches(5.4), Inches(4.0), label="SENTINEL-2 L2A ORBITAL STREAM")

# Right Lower: Telemetry Specs Bar
add_card(slide1, Inches(7.1), Inches(5.0), Inches(5.4), Inches(1.8), title="Planetary Computer Ingestion Status", category_tag="REAL-TIME TELEMETRY", bg_color=OCEAN_CARD, border_color=TEAL_BIO)
add_bullet_list(slide1, Inches(7.3), Inches(5.6), Inches(5.0), Inches(1.1), [
    "✔ STAC Endpoint: planetarycomputer.microsoft.com/api/stac/v1",
    "✔ Cloud Filter: Dynamic sorting by eo:cloud_cover (<20%)",
    "✔ Resilient Scene Resolver: Auto-fallback across top 5 candidate scenes",
    "✔ Provenance Hash: 0x8a92f02c • Output: Immutable JSON Audit Bundle"
], font_size=9, spacing=Pt(2))

add_footer_telemetry(slide1)

# ==============================================================================
# SLIDE 2: ASYMMETRICAL 2-COLUMN DEEP DIVE (THE GLOBAL WATER CRISIS)
# ==============================================================================
slide2 = create_slide(prs)
add_slide_header(slide2, 2, "Crisis Telemetry", "The Global Wetland Crisis & Monitoring Blindspots", "Freshwater ecosystems are vanishing 3x faster than terrestrial forests, leaving catastrophic flood and drought vulnerabilities.")

# Left Large Hero Stat Card
add_card(slide2, Inches(0.8), Inches(1.8), Inches(4.5), Inches(4.9), title="Ecosystem Collapse", category_tag="GLOBAL HYDROLOGICAL ANOMALY", bg_color=OCEAN_CARD, border_color=CORAL_CRIMSON, border_width=1.5)

tx_s2_left = slide2.shapes.add_textbox(Inches(1.05), Inches(2.6), Inches(4.0), Inches(3.9))
tf_l = tx_s2_left.text_frame
tf_l.word_wrap = True
tf_l.margin_left = tf_l.margin_top = tf_l.margin_right = tf_l.margin_bottom = 0

p_stat = tf_l.paragraphs[0]
p_stat.text = "-35%"
p_stat.font.size = Pt(50)
p_stat.font.bold = True
p_stat.font.color.rgb = CORAL_CRIMSON
p_stat.font.name = FONT_TITLE

p_stat_lbl = tf_l.add_paragraph()
p_stat_lbl.text = "GLOBAL WETLANDS LOST SINCE 1970"
p_stat_lbl.font.size = Pt(10)
p_stat_lbl.font.bold = True
p_stat_lbl.font.color.rgb = TEXT_GLACIAL
p_stat_lbl.font.name = FONT_MONO
p_stat_lbl.space_after = Pt(12)

bullets_l = [
    "• Ramsar Convention Data: Over 35% of natural freshwater marshlands and coastal wetlands destroyed in 50 years.",
    "• Urban Encroachment: Rapid metropolitan expansion converts natural drainage basins into impermeable concrete surfaces.",
    "• Climate Amplification: Unregulated infilling magnifies monsoon flash-flood destruction and summer groundwater collapse."
]
for b in bullets_l:
    p_b = tf_l.add_paragraph()
    p_b.text = b
    p_b.font.size = Pt(10)
    p_b.font.color.rgb = TEXT_FOAM
    p_b.space_after = Pt(6)

# Right Stacked Diagnostic Cards
right_diagnostics = [
    ("MONITORING LATENCY & BLINDSPOTS", "DATA INSUFFICIENCY GAP", [
        "• Manual Field Surveys: Expensive ($15k+ per basin), slow, and restricted to sparse discrete GPS points.",
        "• Static Decadal GIS: Municipalities rely on 5 to 10-year-old cartographic maps that miss illegal weekly encroachment.",
        "• Satellite Archive Inaccessibility: Terabytes of raw ESA Sentinel-2 STAC data remain trapped in complex GIS servers."
    ], SOLAR_AMBER),
    ("UNVERIFIED RESTORATION INVESTMENTS", "ACCOUNTABILITY GAP", [
        "• Public Funding Waste: Governments allocate millions to wetland restoration without objective post-monsoon tracking.",
        "• Absence of Early Warnings: Wetland shrinkage is typically detected only after catastrophic flooding occurs.",
        "• Disconnected AI Reasoning: Traditional remote sensing lacks automated ecological interpretation for city planners."
    ], AQUA_BRIGHT)
]

for idx, (title, tag, pts, col) in enumerate(right_diagnostics):
    top = Inches(1.8 + idx * 2.5)
    add_card(slide2, Inches(5.6), top, Inches(6.9), Inches(2.3), title=title, category_tag=tag, border_color=col)
    add_bullet_list(slide2, Inches(5.8), top + Inches(0.8), Inches(6.4), Inches(1.4), pts, font_size=10, spacing=Pt(4))

add_footer_telemetry(slide2)

# ==============================================================================
# SLIDE 3: ASYMMETRIC BENTO BOX (THE AQUASENSE ENGINE)
# ==============================================================================
slide3 = create_slide(prs)
add_slide_header(slide3, 3, "Solution Architecture", "The AquaSense Solution: Autonomous Hydro-Observatory", "A full-stack planetary observatory turning multi-spectral satellite streams into real-time verified ecological action.")

# Left Hero Bento Card (STAC + Band Engine)
add_card(slide3, Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.9), title="Autonomous Planetary Ingestion", category_tag="CORE EARTH OBSERVATION ENGINE", bg_color=OCEAN_CARD, border_color=OCEAN_BORDER_HI, border_width=1.5)

add_bullet_list(slide3, Inches(1.05), Inches(2.6), Inches(5.3), Inches(3.9), [
    "🛰️ Direct Planetary Computer STAC Integration:",
    "   • Live query of Copernicus Sentinel-2 Level-2A surface reflectance data.",
    "   • Dynamic cloud filtering (<20%) with resilient fallback across candidate scenes.",
    "",
    "💧 Zero-Latency Client-Side NDWI Processing:",
    "   • Continuous evaluation of McFeeters band math: (B03-B08)/(B03+B08).",
    "   • Instant sub-pixel canvas recounting across custom threshold ranges (-0.30 to +0.70).",
    "",
    "🎨 7 Scientific Look-Up Table (LUT) Colormaps:",
    "   • Viridis, Inferno, Turbo, Cividis, Mako, Blues, and Chlorophyll palettes.",
    "   • Real-time gradient needle scale indicating active water cutoff.",
    "",
    "📈 Multi-Year Longitudinal Trendlines:",
    "   • Annual STAC scene sampling revealing decade-long wetland trajectories."
], font_size=10.5, spacing=Pt(3))

# Right 3 Stacked Bento Mini-Cards
mini_bento = [
    ("TRIPARTITE CHANGE MASK", "SPATIAL BITMASKING", "Isolates Water Gained (Inundation/Blue), Water Lost (Desiccation/Red), and Persistent Water on top of high-res satellite imagery.", TEAL_BIO),
    ("GEMINI 4-TIER AI SUITE", "ECOLOGICAL REASONING", "Combines Deep Reasoning (3.7 Flash), live Google Search grounding, Google Maps infrastructure analysis, and drone photo validation.", SOLAR_AMBER),
    ("AUDIT-READY PROVENANCE", "CRYPTOGRAPHIC MRV", "Generates immutable JSON audit logs containing system hashes, ESA scene IDs, pixel math, and bounding boxes for legal filings.", AQUA_BRIGHT)
]

for idx, (title, tag, desc, col) in enumerate(mini_bento):
    top = Inches(1.8 + idx * 1.68)
    add_card(slide3, Inches(6.9), top, Inches(5.6), Inches(1.55), title=title, category_tag=tag, border_color=col)
    
    txBox = slide3.shapes.add_textbox(Inches(7.1), top + Inches(0.75), Inches(5.2), Inches(0.7))
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = desc
    p.font.size = Pt(10)
    p.font.color.rgb = TEXT_FOAM
    p.font.name = FONT_BODY

add_footer_telemetry(slide3)

# ==============================================================================
# SLIDE 4: ORBITAL PIPELINE NODES (WITH EMBEDDED IMAGES AT COLUMN BOTTOMS)
# ==============================================================================
slide4 = create_slide(prs)
add_slide_header(slide4, 4, "Execution Telemetry", "Live Earth Observation Pipeline & Data Flow", "How raw multispectral electromagnetic reflections transform into quantified surface water metrics.")

pipeline_nodes = [
    ("NODE 01", "STAC Ingestion & Cloud Filter", [
        "INPUT: GeoJSON BBOX + Years",
        "• Query Microsoft Planetary STAC",
        "• Filter Sentinel-2 L2A BOA",
        "• Sort by eo:cloud_cover <20%",
        "• Auto-retry across 5 scenes",
        "OUTPUT: ESA Scene Assets"
    ], OCEAN_PANEL, AQUA_BRIGHT, IMG_NODE1, "STAC SATELLITE HUD"),
    ("NODE 02", "Spectral Band Mathematics", [
        "INPUT: B03 (560nm) & B08 (842nm)",
        "• Compute NDWI expression",
        "• (B03-B08)/(B03+B08)",
        "• Rescale [-1, 1] → [0, 255] byte",
        "• 256-color LUT pre-caching",
        "OUTPUT: 8-Bit Grayscale Grid"
    ], OCEAN_PANEL, TEAL_BIO, IMG_NODE2, "SPECTRAL REFLECTANCE"),
    ("NODE 03", "Quantification & Diff Mask", [
        "INPUT: Threshold Cutoff > C_thresh",
        "• In-memory sub-pixel counting",
        "• Area = N_pixels × 0.0001 km²",
        "• Tri-state differencing bitmask",
        "• Annual STAC time-series audit",
        "OUTPUT: km² Stats & Diff Map"
    ], OCEAN_PANEL, SOLAR_AMBER, IMG_NODE3, "TRI-STATE DIFF MASK"),
    ("NODE 04", "Gemini Multimodal AI", [
        "INPUT: Spatial Area + Photos",
        "• Gemini 3.7: Deep synthesis",
        "• Google Search tool grounding",
        "• Google Maps landmark lookup",
        "• Drone vision verification",
        "OUTPUT: Policy & Audit JSON"
    ], OCEAN_PANEL, CORAL_CRIMSON, IMG_NODE4, "GEMINI SYNTHESIS HUD")
]

for idx, (node, title, steps, bg_c, border_c, img_path, img_lbl) in enumerate(pipeline_nodes):
    left = Inches(0.8 + idx * 3.0)
    # Text card at top
    add_card(slide4, left, Inches(1.75), Inches(2.8), Inches(3.2), title=title, category_tag=node, bg_color=OCEAN_CARD, border_color=border_c, border_width=1.5)
    add_bullet_list(slide4, left + Inches(0.18), Inches(2.45), Inches(2.44), Inches(2.3), steps, font_size=8.8, spacing=Pt(2))
    
    # Embedded image at bottom of each column
    add_image_with_frame(slide4, img_path, left, Inches(5.05), Inches(2.8), Inches(1.85), label=img_lbl, border_color=border_c)

add_footer_telemetry(slide4)

# ==============================================================================
# SLIDE 5: HIGH-COMPLEXITY TECHNICAL ARCHITECTURE DIAGRAM
# ==============================================================================
slide5 = create_slide(prs)
add_slide_header(slide5, 5, "Technical Approach", "End-to-End Software System Architecture & Technical Approach", "Comprehensive system blueprint connecting STAC ingestion, raster bitmasking, storage provenance, AI reasoning, and containerized DevOps.")

# Embed High-Complexity, Icon-Rich Dark Technical Architecture Diagram
add_image_with_frame(slide5, IMG_ARCH, Inches(0.8), Inches(1.6), Inches(11.7), Inches(5.15), label="SYSTEM ARCHITECTURE // COMPLETE TECHNICAL BLUEPRINT", border_color=OCEAN_BORDER_HI)

add_footer_telemetry(slide5)

# ==============================================================================
# SLIDE 6: SPECTRAL PHYSICS & EMBEDDED RASTER IMAGE
# ==============================================================================
slide6 = create_slide(prs)
add_slide_header(slide6, 6, "Remote Sensing Physics", "Sentinel-2 MSI Band Characteristics & NDWI Heatmap", "Electromagnetic wavelength properties and spatial area conversion mathematics.")

# Left Table Card: Sentinel-2 Multispectral Bands + Math
add_card(slide6, Inches(0.8), Inches(1.8), Inches(6.4), Inches(4.9), title="Sentinel-2 MSI Spectral Band Physics", category_tag="ELECTROMAGNETIC SPECTRUM & BAND MATH", border_color=AQUA_BRIGHT)

band_headers = ["Band", "Wavelength", "Resolution", "Physical Role in AquaSense"]
band_rows = [
    ["B02 (Blue)", "490 nm", "10 m", "True-Color RGB & water clarity"],
    ["B03 (Green)", "560 nm", "10 m", "Primary NDWI numerator (high water reflection)"],
    ["B04 (Red)", "665 nm", "10 m", "Chlorophyll absorption & vegetation boundary"],
    ["B08 (NIR)", "842 nm", "10 m", "Primary NDWI denominator (water absorbs, flora reflects)"],
    ["B11 (SWIR-1)", "1610 nm", "20 m", "Moisture stress & Prithvi foundation encoder"]
]
add_table_grid(slide6, Inches(1.0), Inches(2.6), Inches(6.0), Inches(2.5), band_headers, band_rows, [Inches(1.2), Inches(1.0), Inches(1.0), Inches(2.8)])

# Lower Mathematical Formula Box
add_rect(slide6, Inches(1.0), Inches(5.3), Inches(6.0), Inches(1.25), OCEAN_DEEP, OCEAN_BORDER)
tx_f = slide6.shapes.add_textbox(Inches(1.15), Inches(5.35), Inches(5.7), Inches(1.15))
tf_f = tx_f.text_frame
tf_f.word_wrap = True
tf_f.margin_left = tf_f.margin_top = tf_f.margin_right = tf_f.margin_bottom = 0
pf1 = tf_f.paragraphs[0]
pf1.text = "NDWI FORMULA: (rho_Green - rho_NIR) / (rho_Green + rho_NIR) = (B03 - B08) / (B03 + B08)"
pf1.font.size = Pt(8.5)
pf1.font.bold = True
pf1.font.color.rgb = AQUA_BRIGHT
pf1.font.name = FONT_MONO

pf2 = tf_f.add_paragraph()
pf2.text = "Spatial Scaling: 10m x 10m = 100 m² = 0.0001 km² / pixel | Cutoff: C = round(((T + 1) / 2) * 255)"
pf2.font.size = Pt(8.5)
pf2.font.color.rgb = TEXT_FOAM
pf2.font.name = FONT_MONO
pf2.space_before = Pt(3)

# Right: High-Resolution Embedded NDWI Split Raster Image
add_image_with_frame(slide6, IMG_SPECTRAL, Inches(7.5), Inches(1.8), Inches(5.0), Inches(3.7), label="TRUE-COLOR VS NDWI WATER MASK")

# Right Lower: Image Caption Card
add_card(slide6, Inches(7.5), Inches(5.6), Inches(5.0), Inches(1.1), title="Visualizing Hydrological Inundation", category_tag="FALSE-COLOR NDWI", bg_color=OCEAN_CARD, border_color=TEAL_BIO)
add_bullet_list(slide6, Inches(7.7), Inches(6.05), Inches(4.6), Inches(0.6), [
    "• Left: Sentinel-2 True Color (TCI) RGB optical view.",
    "• Right: High-contrast NDWI water index (Cyan > +0.20 water extent)."
], font_size=8.5, spacing=Pt(1))

add_footer_telemetry(slide6)

# ==============================================================================
# SLIDE 7: CARTOGRAPHIC OBSERVATORY UI BREAKDOWN
# ==============================================================================
slide7 = create_slide(prs)
add_slide_header(slide7, 7, "Product Interface", "AquaSense Cartographic Observatory Layout", "High-density scientific user interface delivering synchronized spatial, spectral, and temporal insights.")

# UI Mockup Layout Simulation (3 Panes)
add_card(slide7, Inches(0.8), Inches(1.8), Inches(3.2), Inches(4.9), title="Telemetry & BBOX Panel", category_tag="LEFT: CONFIGURATION STAGE", bg_color=OCEAN_CARD, border_color=OCEAN_BORDER)
add_bullet_list(slide7, Inches(1.0), Inches(2.6), Inches(2.8), Inches(3.9), [
    "• Pipeline Status Telemetry:",
    "  [STAC Query ✓] [NDWI LUT ✓] [Diff ✓]",
    "",
    "• Interactive 8-Point BBOX Editor:",
    "  Draggable anchor handles for custom spatial bounds [minLon, minLat, maxLon, maxLat].",
    "",
    "• Dynamic Cloud Cover Slider:",
    "  Filters STAC scenes from <1% to <80%.",
    "",
    "• Epoch Selectors:",
    "  Baseline (2019) vs. Target (2025)."
], font_size=9.5, spacing=Pt(4))

add_card(slide7, Inches(4.2), Inches(1.8), Inches(4.9), Inches(4.9), title="Observatory Canvas Stage", category_tag="CENTER: SATELLITE VISUALIZATION", bg_color=OCEAN_CARD_HI, border_color=AQUA_BRIGHT, border_width=1.5)
add_bullet_list(slide7, Inches(4.4), Inches(2.6), Inches(4.5), Inches(3.9), [
    "• Split-Screen Swipe Comparison:",
    "  Drag-handle divider comparing 2019 (T0) vs 2025 (T1) in True-Color RGB or False-Color NDWI.",
    "",
    "• Tri-State Hydrological Difference Mask:",
    "  🔵 Electric Blue: Water Extent Gained (Inundation)",
    "  🔴 Signal Red: Water Extent Lost (Desiccation)",
    "  🔷 Deep Navy: Persistent Water Body",
    "",
    "• 7 Scientific LUT Palettes with Needle Bar:",
    "  Viridis, Inferno, Turbo, Cividis, Mako, Blues."
], font_size=9.5, spacing=Pt(4))

add_card(slide7, Inches(9.3), Inches(1.8), Inches(3.2), Inches(4.9), title="Quantification & AI Panel", category_tag="RIGHT: METRICS & REASONING", bg_color=OCEAN_CARD, border_color=OCEAN_BORDER)
add_bullet_list(slide7, Inches(9.5), Inches(2.6), Inches(2.8), Inches(3.9), [
    "• Dynamic NDWI Threshold Slider:",
    "  Continuous range [-0.30, 0.70] with sub-second area recalculation.",
    "",
    "• Water Extent Metrics:",
    "  2019: 4.12 km² | 2025: 3.48 km²",
    "  Net Change: -0.64 km² (-15.53%)",
    "",
    "• Multi-Year Recharts Trendline:",
    "  Annual intermediate STAC samples.",
    "",
    "• Gemini 4-Mode Ecological Tabs"
], font_size=9.5, spacing=Pt(4))

add_footer_telemetry(slide7)

# ==============================================================================
# SLIDE 8: GOOGLE GEMINI 4-MODE AI & EMBEDDED DRONE VISION
# ==============================================================================
slide8 = create_slide(prs)
add_slide_header(slide8, 8, "Multimodal AI Suite", "Google Gemini 4-Mode Ecological Intelligence Suite", "Combining deep contextual reasoning, real-time web grounding, geographic spatial analysis, and drone vision.")

# Left side: 3 Structured Text Modes
left_modes = [
    ("🧠 DEEP ECOLOGICAL REASONING", "gemini-3.7-flash", [
        "• Formulates structured hydrological trajectory reports.",
        "• Isolates primary drivers (urban encroachment, rainfall deficits).",
        "• Assesses flood attenuation & groundwater ecosystem services.",
        "• Generates prioritized ecological conservation interventions."
    ], AQUA_BRIGHT),
    ("🔍 SEARCH-GROUNDED FACT CHECKING", "gemini-3.5-flash + GoogleSearch", [
        "• Integrates live Google Search tool for current basin status.",
        "• Discovers recent municipal eco-restoration orders & litigation.",
        "• Correlates satellite anomalies with extreme weather events.",
        "• Returns verifiable, clickable grounding citations."
    ], TEAL_BIO),
    ("🗺️ MAPS-GROUNDED SPATIAL ZONING", "gemini-3.5-flash + GoogleMaps", [
        "• Google Maps spatial database integration.",
        "• Pinpoints surrounding industrial corridors and IT developments.",
        "• Maps protected bird sanctuaries and wildlife buffer zones.",
        "• Identifies primary storm-drain inlets and outflow bottlenecks."
    ], SOLAR_AMBER)
]

for idx, (title, model, pts, col) in enumerate(left_modes):
    top = Inches(1.8 + idx * 1.68)
    add_card(slide8, Inches(0.8), top, Inches(6.4), Inches(1.55), title=title, category_tag=model, border_color=col)
    add_bullet_list(slide8, Inches(1.0), top + Inches(0.75), Inches(6.0), Inches(0.75), pts, font_size=8.5, spacing=Pt(1))

# Right side: Embedded Drone Vision Image + Card
add_image_with_frame(slide8, IMG_DRONE, Inches(7.5), Inches(1.8), Inches(5.0), Inches(3.4), label="MULTIMODAL FIELD VALIDATION")

add_card(slide8, Inches(7.5), Inches(5.3), Inches(5.0), Inches(1.4), title="📸 Drone & Ground-Truth Photo Understanding", category_tag="GEMINI 3.7 FLASH (MULTIMODAL VISION)", bg_color=OCEAN_CARD, border_color=CORAL_CRIMSON)
add_bullet_list(slide8, Inches(7.7), Inches(5.95), Inches(4.6), Inches(0.7), [
    "• Ingests field photos, drone captures, or handheld phone images.",
    "• Evaluates water turbidity, surface algae, and hyacinth mats.",
    "• Produces estimated Few-Shot class confidence breakdowns."
], font_size=8.5, spacing=Pt(1))

add_footer_telemetry(slide8)

# ==============================================================================
# SLIDE 9: GEOSPATIAL ML & VECTOR EMBEDDINGS LABORATORY
# ==============================================================================
slide9 = create_slide(prs)
add_slide_header(slide9, 9, "Machine Learning", "Earth Observation Foundation Models & Few-Shot Learning", "Overcoming spectral index limitations through dense latent representations and few-shot classification.")

# Left Card: Foundation Model Encoders
add_card(slide9, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.9), title="IBM-NASA Prithvi-100M & Clay v1", category_tag="PRE-TRAINED GEOSPATIAL FOUNDATION MODELS", border_color=AQUA_BRIGHT)

foundation_info = [
    "1. ARCHITECTURE & SPECIFICATIONS:",
    "   • Model Architecture: Temporal Vision Transformer (ViT-Base).",
    "   • Input Tensor: 224 x 224 x 6 Multispectral Patch (B02, B03, B04, B08, B11, B12).",
    "   • Pre-training Objective: Masked Autoencoder (MAE) across 100M+ global Sentinel scenes.",
    "   • Latent Feature Representation: 768-dimensional dense embedding per patch.",
    "",
    "2. COMPUTATIONAL & MEMORY EFFICIENCY:",
    "   • Adaptive VRAM Memory Sizing: Dynamically calculates batch size based on free GPU memory.",
    "   • Batch Size Formula: max(1, min(64, floor((VRAM_free - 1GB) / 150MB))).",
    "   • SCL Cloud Masking: Automatically masks Scene Classification Layer codes 8, 9, 10.",
    "",
    "3. CLAY V1 FOUNDATION ENCODER:",
    "   • Universal multi-sensor representation model for global multitemporal analysis."
]
add_bullet_list(slide9, Inches(1.0), Inches(2.6), Inches(5.3), Inches(3.9), foundation_info, font_size=9.5, spacing=Pt(3))

# Right Card: FewShotClassifier Mathematics
add_card(slide9, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.9), title="FewShotClassifier Mathematical Engine", category_tag="RAPID ADAPTATION OVER FROZEN EMBEDDINGS", border_color=TEAL_BIO)

fewshot_math = [
    "1. ONE-VS-REST (OvR) L2-REGULARIZED LOGISTIC REGRESSION:",
    "   Loss = -1/N sum [ w+ y log(sigma(z)) + w- (1-y) log(1-sigma(z)) ] + 1/(2C) ||w||²",
    "   • Class Balancing: w+ = N / (2*N+), w- = N / (2*N-) to prevent class imbalance.",
    "   • Multiclass Softmax Probability: P(y=c|x) = exp(w_c^T x + b_c) / sum exp(w_k^T x + b_k).",
    "",
    "2. COSINE-WEIGHTED k-NEAREST NEIGHBORS (k-NN):",
    "   Distance = 1.0 - (x . r_j) / (||x|| * ||r_j||)",
    "   • Voting Weights: w_j = 1.0 / (dist_j + 1e-5).",
    "   • Effective k = min(n_neighbors, training_samples_count).",
    "",
    "3. STATE SERIALIZATION & EDGE PORTABILITY:",
    "   • Complete model state exported to portable JSON (weights, biases, vectors).",
    "   • Allows zero-dependency edge inference in Node.js or browser without PyTorch."
]
add_bullet_list(slide9, Inches(7.0), Inches(2.6), Inches(5.3), Inches(3.9), fewshot_math, font_size=9.5, spacing=Pt(3))

add_footer_telemetry(slide9)

# ==============================================================================
# SLIDE 10: QUANTITATIVE CASE STUDY: PALLIKARANAI MARSHLAND
# ==============================================================================
slide10 = create_slide(prs)
add_slide_header(slide10, 10, "Field Validation", "Pallikaranai Ramsar Marshland (Chennai) Multi-Year Audit", "Quantifying surface water shrinkage and urban encroachment across 2019-2025 satellite epochs.")

# Top 4 Quantitative Metric Tiles
case_stats = [
    ("4.12 km²", "2019 BASELINE WATER (T0)", "Post-monsoon water surface extent", AQUA_BRIGHT),
    ("3.48 km²", "2025 TARGET WATER (T1)", "Recent Sentinel-2 pass water extent", AQUA_DEEP),
    ("-0.64 km²", "ABSOLUTE NET CHANGE", "Permanent water surface lost", CORAL_CRIMSON),
    ("-15.53%", "RELATIVE WETLAND LOSS", "Severe hydrological constriction", SOLAR_AMBER)
]

for idx, (val, title, desc, col) in enumerate(case_stats):
    left = Inches(0.8 + idx * 3.0)
    card = add_rect(slide10, left, Inches(1.8), Inches(2.8), Inches(1.2), OCEAN_CARD, col, border_width=1.5)
    
    tx = slide10.shapes.add_textbox(left + Inches(0.15), Inches(1.85), Inches(2.5), Inches(1.1))
    tf = tx.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p0 = tf.paragraphs[0]
    p0.text = val
    p0.font.size = Pt(20)
    p0.font.bold = True
    p0.font.color.rgb = col
    p0.font.name = FONT_TITLE
    
    p1 = tf.add_paragraph()
    p1.text = title
    p1.font.size = Pt(8)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_GLACIAL
    p1.font.name = FONT_MONO
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(8.5)
    p2.font.color.rgb = TEXT_SEABED

# Left Column: Spatial Findings & Ground-Truth
add_card(slide10, Inches(0.8), Inches(3.2), Inches(5.7), Inches(3.5), title="Spatial Findings & ESA Scene Metadata", category_tag="SATELLITE GROUND-TRUTH CONFIRMATION", border_color=CORAL_CRIMSON)

findings = [
    "• Northern Perimeter Shrinkage: The Diff Mask reveals intense signal red loss along the Velachery-Tambaram IT corridor expansion.",
    "• Southern Floodwater Retention: Blue expansion confirms active monsoon buffering in the southern wildlife sanctuary zone.",
    "• Verified ESA Scenes: Baseline S2A_MSIL2A_20190325 (0.0% cloud) vs. Target S2B_MSIL2A_20250218 (4.2% cloud).",
    "• Ground-Truth Corroboration: Gemini Search grounding retrieved Chennai Smart City Corporation wetland desilting filings verifying boundaries."
]
add_bullet_list(slide10, Inches(1.0), Inches(3.9), Inches(5.3), Inches(2.6), findings, font_size=9.5, spacing=Pt(4))

# Right Column: Annual Longitudinal Trend Data Table
add_card(slide10, Inches(6.8), Inches(3.2), Inches(5.7), Inches(3.5), title="Annual Longitudinal Time-Series Data", category_tag="INTERMEDIATE ANNUAL STAC SAMPLING", border_color=TEAL_BIO)

trend_headers = ["Year", "Water Area (km²)", "Cloud Cover", "Hydrological State"]
trend_rows = [
    ["2019", "4.12 km²", "0.0%", "Baseline Post-Drought Recovery"],
    ["2020", "4.05 km²", "2.1%", "Stable Pre-Monsoon Capacity"],
    ["2021", "4.38 km²", "5.4%", "Extreme Monsoon Inundation Peak"],
    ["2022", "3.89 km²", "1.8%", "Construction Encroachment Phase"],
    ["2023", "3.62 km²", "0.9%", "Summer Dry-Down & Constriction"],
    ["2024", "3.51 km²", "3.2%", "Fragmented Southern Retention"],
    ["2025", "3.48 km²", "4.2%", "Current Verified Target (-15.53%)"]
]
add_table_grid(slide10, Inches(7.0), Inches(3.9), Inches(5.3), Inches(2.6), trend_headers, trend_rows, [Inches(0.9), Inches(1.4), Inches(1.1), Inches(1.9)])

add_footer_telemetry(slide10)

# ==============================================================================
# SLIDE 11: COMBINED GLOBAL IMPACT & STRATEGIC SCALING ROADMAP
# ==============================================================================
slide11 = create_slide(prs)
add_slide_header(slide11, 11, "Strategic Impact & Roadmap", "Global Stakeholder Applications & Strategic Scaling Roadmap", "Transforming satellite observation into verifiable conservation policy, smart city resilience, and planetary hydro-intelligence.")

# LEFT SECTION: 4 Stakeholder Applications (2x2 Grid)
add_card(slide11, Inches(0.8), Inches(1.75), Inches(5.7), Inches(5.0), title="Target Stakeholders & Real-World Impact", category_tag="GLOBAL APPLICATION DOMAINS", bg_color=OCEAN_CARD, border_color=OCEAN_BORDER_HI)

stakeholders_mini = [
    ("🏛️ GOVERNANCE & POLICY", "WETLAND AUTHORITIES", [
        "• Ramsar & Biodiversity compliance reporting.",
        "• Automated alerts on illegal landfilling.",
        "• Court-admissible proof (hash: 0x8a92f02c)."
    ], AQUA_BRIGHT),
    ("🌱 CONSERVATION NGOS", "ECOLOGISTS & ADVOCACY", [
        "• Continuous remote monitoring of basins.",
        "• Field photo ground-truthing portal.",
        "• Multi-year trend data for climate grants."
    ], TEAL_BIO),
    ("🏙️ SMART CITIES & PLANNERS", "FLOOD ATTENUATION", [
        "• Pre-monsoon water holding capacity checks.",
        "• Critical urban flood buffer preservation.",
        "• City emergency dashboard integration."
    ], SOLAR_AMBER),
    ("💼 ESG & BLUE CARBON", "SUSTAINABILITY AUDIT", [
        "• Independent satellite MRV verification.",
        "• Auditable wetland carbon credit validation.",
        "• Corporate water stewardship reporting."
    ], CORAL_CRIMSON)
]

for idx, (title, tag, pts, col) in enumerate(stakeholders_mini):
    col_idx = idx % 2
    row_idx = idx // 2
    c_left = Inches(1.0 + col_idx * 2.7)
    c_top  = Inches(2.45 + row_idx * 2.05)
    
    add_rect(slide11, c_left, c_top, Inches(2.55), Inches(1.95), OCEAN_DEEP, col, border_width=1)
    
    txBox = slide11.shapes.add_textbox(c_left + Inches(0.1), c_top + Inches(0.1), Inches(2.35), Inches(1.75))
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p0 = tf.paragraphs[0]
    p0.text = title
    p0.font.size = Pt(8.5)
    p0.font.bold = True
    p0.font.color.rgb = col
    p0.font.name = FONT_TITLE
    
    p1 = tf.add_paragraph()
    p1.text = tag
    p1.font.size = Pt(7.0)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_SEABED
    p1.font.name = FONT_MONO
    p1.space_after = Pt(3)
    
    for pt in pts:
        p_pt = tf.add_paragraph()
        p_pt.text = pt
        p_pt.font.size = Pt(8.0)
        p_pt.font.color.rgb = TEXT_FOAM
        p_pt.space_after = Pt(2)

# RIGHT SECTION: 4 Strategic Scaling Roadmap Phases (Vertical Stack)
add_card(slide11, Inches(6.8), Inches(1.75), Inches(5.7), Inches(5.0), title="Strategic Scaling Roadmap & Milestones", category_tag="PLANETARY DEPLOYMENT PHASES", bg_color=OCEAN_CARD, border_color=TEAL_BIO)

roadmap_phases = [
    ("PHASE 1: CURRENT PRODUCTION", "BENCHMARK DEPLOYMENT", "✔ STAC pipeline, sub-second NDWI canvas kernel, Gemini 4-mode AI, JSON audit provenance, and Pallikaranai audit.", TEAL_BIO),
    ("PHASE 2: Q4 2025", "MULTI-SENSOR RADAR FUSION", "• Sentinel-1 SAR C-band radar (all-weather penetrating), MNDWI/AWEI indices, STAC webhook alerts, GeoJSON vector export.", AQUA_BRIGHT),
    ("PHASE 3: Q1 2026", "ACTIVE LEARNING ML", "• Few-shot patch labeling UI, Prithvi-100M fine-tuning adapter, citizen science mobile photo portal, thermal water tracking.", SOLAR_AMBER),
    ("PHASE 4: 2027 VISION", "PLANETARY HYDRO-NETWORK", "• Pan-India & Global Wetland Atlas, real-time flood surge forecasting, open public API for NGOs, automated Blue Carbon registry.", CORAL_CRIMSON)
]

for idx, (phase, tag, desc, col) in enumerate(roadmap_phases):
    p_top = Inches(2.45 + idx * 1.02)
    add_rect(slide11, Inches(7.0), p_top, Inches(5.3), Inches(0.92), OCEAN_DEEP, col, border_width=1)
    
    txBox = slide11.shapes.add_textbox(Inches(7.15), p_top + Inches(0.08), Inches(5.0), Inches(0.78))
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p0 = tf.paragraphs[0]
    p0.text = f"{phase}  //  {tag}"
    p0.font.size = Pt(8.5)
    p0.font.bold = True
    p0.font.color.rgb = col
    p0.font.name = FONT_MONO
    
    p1 = tf.add_paragraph()
    p1.text = desc
    p1.font.size = Pt(8.0)
    p1.font.color.rgb = TEXT_FOAM
    p1.space_before = Pt(2)

add_footer_telemetry(slide11)

# ==============================================================================
# SAVE PRESENTATION TO LOCAL WORKSPACE DIRECTORY
# ==============================================================================
output_filename = "AquaSense_Pitch_Deck.pptx"
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), output_filename)
try:
    prs.save(output_path)
    print(f"[SUCCESS] AquaSense presentation generated successfully: {output_path}")
except PermissionError:
    alt_filename = "AquaSense_Pitch_Deck_v2.pptx"
    alt_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), alt_filename)
    prs.save(alt_path)
    print(f"[SUCCESS] AquaSense presentation saved to: {alt_path}")

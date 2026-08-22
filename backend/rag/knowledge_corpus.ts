export type KnowledgeCategory =
  | "ramsar"
  | "cpcb"
  | "who"
  | "bio_optics"
  | "climate"
  | "regional";

export interface KnowledgeChunk {
  id: string;
  source: string;
  category: KnowledgeCategory;
  text: string;
}

/**
 * Domain knowledge corpus for the Local Hydrological RAG engine.
 * Statutory / scientific references used as retrieval targets for the
 * in-memory vector store. Tokens in `text` are matched lexically against
 * live basin telemetry during retrieval.
 */
export const KNOWLEDGE_CORPUS: KnowledgeChunk[] = [
  {
    id: "ramsar-art3.1",
    source: "Ramsar Convention Art. 3.1",
    category: "ramsar",
    text: "Ramsar Convention Article 3.1 requires Contracting Parties to formulate and implement planning for the conservation of wetlands and the wise use of wetland resources, especially those of international importance. Wetland loss mitigation demands halting conversion of Ramsar sites to built-up land and protecting hydric soils from drainage.",
  },
  {
    id: "ramsar-ecological-character",
    source: "Ramsar Ecological Character",
    category: "ramsar",
    text: "The Ramsar Convention defines ecological character as the combination of biotic, abiotic and cultural components and processes that maintain wetland health. Degradation of ecological character indicators such as surface water extent and hydric soil integrity can trigger Montreux Record scrutiny and conservation intervention.",
  },
  {
    id: "ramsar-mangrove-buffer",
    source: "Ramsar Vegetation Buffer",
    category: "ramsar",
    text: "Mangrove and marsh vegetation buffers coastal and inland wetlands against storm surge and filters nutrients. Loss of the vegetative wetland fringe lowers flood buffer capacity and raises eutrophication and encroachment risk.",
  },
  {
    id: "cpcb-class-a",
    source: "CPCB IS 2296 Class A",
    category: "cpcb",
    text: "CPCB water quality standards (IS 2296 / BIS): Class A water is suitable as a drinking water source after conventional treatment and disinfection, requiring total coliforms nil, pH 6.5-8.5 and dissolved oxygen above 6 mg/L. High turbidity and eutrophication exclude water from Class A.",
  },
  {
    id: "cpcb-classes-b-e",
    source: "CPCB Classes B-E",
    category: "cpcb",
    text: "CPCB classification: Class B for outdoor bathing; Class C for drinking water with conventional treatment; Class D for fish culture, propagation of wildlife and fisheries; Class E for irrigation, industrial cooling and controlled waste disposal. Eutrophication, turbidity and nutrient pollution push water toward lower classes.",
  },
  {
    id: "who-turbidity",
    source: "WHO Turbidity Guideline",
    category: "who",
    text: "World Health Organization drinking water guidelines set a turbidity limit of 5 NTU for safe supply and 1 NTU for highly protected supplies. High turbidity from suspended sediment increases pathogen attachment and reduces disinfection efficiency, signalling degraded water quality.",
  },
  {
    id: "carlson-tsi",
    source: "Carlson TSI 1977",
    category: "bio_optics",
    text: "The Carlson Trophic State Index (Carlson 1977) classifies lakes: TSI below 40 oligotrophic, 40-50 mesotrophic, above 50 eutrophic. TSI is derived from chlorophyll-a, Secchi depth and total phosphorus; dense algal blooms raise chlorophyll and the trophic state index.",
  },
  {
    id: "ndti-sediment",
    source: "NDTI Sediment Benchmark",
    category: "bio_optics",
    text: "The Normalized Difference Turbidity Index NDTI = (Red - Green)/(Red + Green) correlates with suspended sediment concentration and turbidity. Saturation benchmarks indicate NDTI above 0.1 denotes heavy sediment load, degraded water quality and high turbidity.",
  },
  {
    id: "cdom-humic",
    source: "CDOM Absorption",
    category: "bio_optics",
    text: "Colored dissolved organic matter (CDOM) absorption in blue and green wavelengths signals humic substance input from wetland vegetation decay and urban runoff, reducing light penetration and increasing eutrophication risk in surface water.",
  },
  {
    id: "ndci-chlorophyll",
    source: "NDCI Algal Bloom",
    category: "bio_optics",
    text: "The Normalized Difference Chlorophyll Index NDCI = (Red Edge - Red)/(Red Edge + Red) detects chlorophyll-a and algal blooms. NDCI above 0.2 indicates dense phytoplankton and high eutrophication pressure on the water body.",
  },
  {
    id: "era5-rainfall",
    source: "ERA5 Monsoon Anomaly",
    category: "climate",
    text: "ERA5 reanalysis shows South Asian monsoon rainfall anomalies drive interannual wetland inundation. Negative rainfall anomalies cause desiccation and water loss, while extreme positive anomalies drive flooding and expansion of surface water extent.",
  },
  {
    id: "regional-pallikaranai",
    source: "Pallikaranai Marsh Chennai",
    category: "regional",
    text: "Pallikaranai Marsh in Chennai is one of South India's last natural freshwater and brackish marshes and a Ramsar site. Urban encroachment from IT corridors and road construction has caused wetland shrinkage, hydrological disconnection and water quality decline.",
  },
  {
    id: "regional-chilika",
    source: "Chilika Lake Odisha",
    category: "regional",
    text: "Chilika Lake in Odisha is India's largest coastal lagoon and a Ramsar site. Sedimentation from river inflows, aquaculture and eutrophication threaten its ecological character; continual water quality monitoring guides restoration.",
  },
  {
    id: "regional-vembanad",
    source: "Vembanad Lake Kerala",
    category: "regional",
    text: "Vembanad Lake in Kerala is a Ramsar site where reclamation and bunding for aquaculture have reduced lake area and altered tidal exchange, increasing eutrophication, turbidity and fish-kill risk.",
  },
  {
    id: "regional-loktak",
    source: "Loktak Lake Manipur",
    category: "regional",
    text: "Loktak Lake in Manipur is a Ramsar site famous for phumdis (floating wetlands). Encroachment, siltation and eutrophication from nutrient runoff degrade water quality and the endangered sangai habitat.",
  },
  {
    id: "regional-mead",
    source: "Lake Mead USA",
    category: "regional",
    text: "Lake Mead in the USA is the largest reservoir by volume in the country. Prolonged drought and reduced Colorado River inflow have caused record low water levels, exposing bed sediments and concentrating salinity, turbidity and suspended solids.",
  },
  {
    id: "urban-encroachment",
    source: "Urban Encroachment Pressure",
    category: "regional",
    text: "Urban expansion and built-up conversion replace pervious wetland with impervious surface, increasing storm runoff, sediment load and nutrient pollution. Protecting eco-perimeters sustains flood retention, water quality and wetland resilience.",
  },
];

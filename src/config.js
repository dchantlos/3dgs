// Catalog of Gaussian Splat reality captures + app constants.
// Sourced from the public "Gaussian Splat Examples" web scene
// (item 646ad56647544762b1919508158ba619 on IVT.maps.arcgis.com).
// Every tileset below is a public 3D Tiles / Gaussian Splat service (no token).

export const PORTAL = "https://IVT.maps.arcgis.com";
export const SOURCE_WEBSCENE_ID = "646ad56647544762b1919508158ba619";

// Base for real portal thumbnails used in the gallery cards.
const THUMB = (itemId, file) =>
  `${PORTAL}/sharing/rest/content/items/${itemId}/info/${file}`;

// Web Mercator (wkid 102100) camera captured from each web scene slide.
export const CAPTURES = [
  {
    id: "boston",
    title: "City of Boston",
    provider: "BlueSky International",
    location: "Boston, Massachusetts",
    country: "USA",
    category: "City",
    itemId: "9c3cef8c4d9545be83574365d4f929d8",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/Boston_Aerial_3D_Gaussian_Splat/3DTilesServer/tileset.json",
    thumb: THUMB("9c3cef8c4d9545be83574365d4f929d8", "thumbnail/_7B34E0CF33-8755-4410-8792-4F6F3F65D537_7D.png"),
    blurb: "Aerial reality capture of downtown Boston rendered as millions of Gaussian splats.",
    camera: { x: -7908504.187316146, y: 5213826.047141828, z: 488.7606, heading: 300.242, tilt: 62.736 }
  },
  {
    id: "phoenix",
    title: "City of Phoenix",
    provider: "IGI · Fugro · City of Phoenix",
    location: "Phoenix, Arizona",
    country: "USA",
    category: "City",
    itemId: "512019f656924ce0b47a3e15c10b015e",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/Phoenix_IGI_Fugro_3DGaussianSplat_3500ft/3DTilesServer/tileset.json",
    thumb: THUMB("512019f656924ce0b47a3e15c10b015e", "thumbnail/_7B5B1D4321-D777-4386-932C-DA420F1310E1_7D.png"),
    blurb: "Wide-area aerial splat survey flown at 3,500 ft over central Phoenix.",
    camera: { x: -12476057.074913874, y: 3960708.9160004454, z: 457.7005, heading: 328.657, tilt: 34.985 }
  },
  {
    id: "denver",
    title: "Empower Field at Mile High",
    provider: "Esri",
    location: "Denver, Colorado",
    country: "USA",
    category: "Landmark",
    itemId: "a1edea97b7be4324b32bff4619595978",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/Denver_Mile_High_Stadium_Drone_3D_Gaussian_Splat/3DTilesServer/tileset.json",
    thumb: THUMB("a1edea97b7be4324b32bff4619595978", "thumbnail/_7B7AF1388D-328A-426A-8111-75F9D015A605_7D.png"),
    blurb: "Drone capture of the Denver stadium bowl, showing splats' fidelity on complex structure.",
    camera: { x: -11690637.140804376, y: 4828393.832024286, z: 1778.0884, heading: 338.614, tilt: 58.258 }
  },
  {
    id: "roaster",
    title: "Coffee Roaster",
    provider: "ShareUAV",
    location: "Kansas City",
    country: "USA",
    category: "Industry",
    itemId: "4bc7c3b1d50a4160ab82787fd2012791",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/KansasCityRoaster_ShareUAV_Drone_GaussianSplat/3DTilesServer/tileset.json",
    thumb: THUMB("4bc7c3b1d50a4160ab82787fd2012791", "thumbnail/thumbnail1762449296687.png"),
    blurb: "Close-range drone capture of an industrial coffee roaster with thin pipework and railings.",
    camera: { x: -10530752.76200882, y: 4732930.827766522, z: 281.6578, heading: 40.151, tilt: 46.592 }
  },
  {
    id: "alcatraz",
    title: "Alcatraz Island",
    provider: "VCTO Labs",
    location: "San Francisco, California",
    country: "USA",
    category: "Landmark",
    itemId: "337bfffd9c364d1686b351141d63f3d5",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/Alcatraz_Drone_3D_GaussianSplat/3DTilesServer/tileset.json",
    thumb: THUMB("337bfffd9c364d1686b351141d63f3d5", "thumbnail/thumbnail1761320836856.png"),
    blurb: "Drone survey of Alcatraz Island, captured with an accompanying water body feature.",
    camera: { x: -13627744.692577872, y: 4554889.527952603, z: 165.2035, heading: 280.185, tilt: 57.347 }
  },
  {
    id: "building-2019",
    title: "Building E — Under Construction",
    provider: "Esri",
    location: "Redlands, California",
    country: "USA",
    category: "Construction",
    epoch: "2019",
    itemId: "5cd49045be9a4a28a46ea74ce268a4d2",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/Building_E_20190919_Gaussian_Splat/3DTilesServer/tileset.json",
    thumb: THUMB("5cd49045be9a4a28a46ea74ce268a4d2", "thumbnail/thumbnail1761318113534.png"),
    blurb: "Esri Redlands Building E mid-construction, captured 2019-09-19.",
    camera: { x: -13046440.7282444, y: 4036729.762539461, z: 443.3577, heading: 110.361, tilt: 60.518 }
  },
  {
    id: "building-complete",
    title: "Building E — Completed",
    provider: "Esri",
    location: "Redlands, California",
    country: "USA",
    category: "Construction",
    epoch: "2025",
    itemId: "52a16cc8ed704dd5b1c1e060188fbdcd",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/BuildingE_202521_Gaussian_Splats/3DTilesServer/tileset.json",
    thumb: THUMB("52a16cc8ed704dd5b1c1e060188fbdcd", "thumbnail/thumbnail1776790688743.png"),
    blurb: "The same Esri Building E after completion — the twin for a before/after comparison.",
    camera: { x: -13046427.00016235, y: 4036636.241852063, z: 470.9108, heading: 59.978, tilt: 47.794 }
  },
  {
    id: "cathedral",
    title: "Collégiale de Mantes",
    provider: "Esri France",
    location: "Mantes-la-Jolie",
    country: "France",
    category: "Landmark",
    itemId: "21c053ee253a49568e0cdf3a726465cd",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/Collégiale_Mantes_la_Jolie_Drone_3D_Gaussian_Splat/3DTilesServer/tileset.json",
    thumb: THUMB("21c053ee253a49568e0cdf3a726465cd", "thumbnail/thumbnail1762188312736.png"),
    blurb: "Gothic collegiate church captured by drone — intricate tracery ideal for splats.",
    camera: { x: 191413.3732430973, y: 6273257.911965693, z: 53.0423, heading: 95.333, tilt: 61.624 }
  },
  {
    id: "stuttgart",
    title: "City of Stuttgart",
    provider: "GeoFly GmbH",
    location: "Stuttgart",
    country: "Germany",
    category: "City",
    itemId: "9220ac489a604e7eba02ffe4f6d40f84",
    url: "https://tiles-eu1.arcgis.com/7cCya5lpv5CmFJHv/arcgis/rest/services/Stuttgart_Reality_Twin/3DTilesServer/tileset.json",
    thumb: THUMB("9220ac489a604e7eba02ffe4f6d40f84", "thumbnail/_7B09135E5A-5EA3-4780-A555-AC153E60523F_7D.png"),
    blurb: "A city-scale \"reality twin\" of Stuttgart, hosted on Esri's European tile cloud.",
    camera: { x: 1021658.900228722, y: 6236516.820852754, z: 423.1535, heading: 11.434, tilt: 65.040 }
  },
  {
    id: "zurich",
    title: "City of Zürich",
    provider: "Wingtra",
    location: "Zürich",
    country: "Switzerland",
    category: "City",
    itemId: "34215399d6f346f3a2328fa243c87fd7",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/Zurich_Drone_3D_Gaussian_Splat/3DTilesServer/tileset.json",
    thumb: THUMB("34215399d6f346f3a2328fa243c87fd7", "thumbnail/thumbnail1761510587027.png"),
    blurb: "Fixed-wing drone capture of central Zürich rooftops and spires.",
    camera: { x: 951207.999121936, y: 6001596.705168391, z: 756.9666, heading: 346.329, tilt: 65.391 }
  },
  {
    id: "industrial",
    title: "Industrial Facility",
    provider: "Portcoast",
    location: "Vietnam",
    country: "Vietnam",
    category: "Industry",
    itemId: "d271ecae011d4fc29bb5dab1b55884a9",
    url: "https://tiles.arcgis.com/tiles/uujCiiEZAflDbdxE/arcgis/rest/services/Portcoast_3DGS_IndustrialFacility/3DTilesServer/tileset.json",
    thumb: THUMB("d271ecae011d4fc29bb5dab1b55884a9", "thumbnail/thumbnail1761317970736.png"),
    blurb: "Reality capture of a working industrial facility with dense structural detail.",
    camera: { x: 12111329.11759361, y: 1733253.575329276, z: 171.7313, heading: 9.232, tilt: 63.813 }
  }
];

export const CATEGORIES = ["All", "City", "Landmark", "Industry", "Construction"];

// Tunables.
export const SCENE_GLOW = 0.65;      // webscene/Glow intensity (0..1)
export const FLY_MS = 3200;          // camera fly duration
export const TOUR_DWELL_MS = 5200;   // pause at each tour stop

export const byId = (id) => CAPTURES.find((c) => c.id === id);

import { TomTomConfig } from "@anw/maps-sdk-js/core";
import {
  TomTomMap,
  TrafficModule,
  POIsModule,
  RoutingModule
} from "@anw/maps-sdk-js/map";
import { reverseGeocode, calculateRoute } from "@anw/maps-sdk-js/services";
import { Marker, Popup } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";

const parisBounds = [
  [2.2241, 48.90216],
  [2.46991, 48.81552]
];
let tomTomMap;
let routingModule;
let resetButton;
let tempMarker;
let poiWasClicked = false;
let waypoints = [];

TomTomConfig.instance.put({
  apiKey: process.env.API_KEY
});

function initMap() {
  tomTomMap = new TomTomMap({
    container: "tt-map",
    fitBoundsOptions: {
      padding: 100
    },
    bounds: parisBounds
  });

  tomTomMap.mapLibreMap.on("click", handleMapClick);
}

async function initTraffic() {
  const trafficModule = await TrafficModule.get(tomTomMap);
  trafficModule.setFlowVisible(false);
  trafficModule.setIncidentsVisible(false);
}

async function initPois() {
  const poisModule = await POIsModule.get(tomTomMap);
  poisModule.events.on("click", handlePoiClick);
}

async function initRouting() {
  routingModule = await RoutingModule.init(tomTomMap);
}

async function handleMapClick(e) {
  if (poiWasClicked) {
    poiWasClicked = false;
    return;
  }

  const { lngLat } = e;
  const place = await reverseGeocode({ position: lngLat.toArray() });

  addTempMarker(place);
}

function handlePoiClick(poi) {
  poiWasClicked = true;

  addTempMarker(poi);
}

function addTempMarker(place) {
  tempMarker?.remove();

  const {
    properties,
    geometry: { coordinates }
  } = place;

  const name =
    properties?.name || properties?.address?.freeformAddress || "Unknown place";
  const content = createPopupContent(name, () => addPlaceToRoute(place));

  tempMarker = new Marker()
    .setLngLat(coordinates)
    .setPopup(
      new Popup({
        anchor: "bottom",
        offset: [0, -34],
        closeButton: false
      })
        .setDOMContent(content)
        .setMaxWidth("200px")
    )
    .addTo(tomTomMap.mapLibreMap);
  tempMarker.togglePopup();
}

function addPlaceToRoute(place) {
  tempMarker.remove();
  waypoints.push(place);
  routingModule.showWaypoints(waypoints);
  calculateRouteIfNeeded();
}

function createPopupContent(title, onAddClick) {
  const contentEl = document.createElement("div");
  contentEl.className = "tt-popup-content";

  const titleEl = document.createElement("div");
  titleEl.className = "tt-popup-title";
  titleEl.innerHTML = title;
  contentEl.appendChild(titleEl);

  const buttonEl = document.createElement("button");
  buttonEl.className = "tt-button";
  buttonEl.innerHTML = "Add to route";
  buttonEl.addEventListener("click", onAddClick);
  contentEl.appendChild(buttonEl);

  return contentEl;
}

async function calculateRouteIfNeeded() {
  if (waypoints.length > 1) {
    resetButton.disabled = false;
    routingModule.showRoutes(await calculateRoute({ geoInputs: waypoints }));
  }
}

function reset() {
  routingModule.clearRoutes();
  routingModule.clearWaypoints();
  waypoints = [];
  resetButton.disabled = true;
}

function init() {
  resetButton = document.getElementById("reset");
  resetButton.addEventListener("click", reset);

  initMap();
  initTraffic();
  initPois();
  initRouting();
}

init();

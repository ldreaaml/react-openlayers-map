import React, { useState, useEffect, useRef } from "react";

// openlayers
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { transform } from "ol/proj";
import { fromLonLat } from "ol/proj";

const MapComponent = () => {
  const [map, setMap] = useState();

  const mapElement = useRef();
  const mapRef = useRef();
  mapRef.current = map;

  useEffect(() => {
    const initialMap = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat([-74.006, 40.712]), // Coordinates of New York
        zoom: 7, //Initial Zoom Level
      }),
    });

    setMap(initialMap);
  }, []);

  return (
    <>
      <div ref={mapElement} className="map-container"></div>
    </>
  );
};

export default MapComponent;

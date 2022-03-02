import React, { useState, useEffect, useRef } from "react";

// openlayers
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { transform } from "ol/proj";
import { fromLonLat } from "ol/proj";
import Overlay from "ol/Overlay";

const MapComponent = () => {
  var lower = [156.24702734375, -51.040750041469];
  var upper = [360 + -170.48637109375, -30.939046030799];
  const getCenterOfExtent = (Extent) => {
    var X = Extent[0] + (Extent[2] - Extent[0]) / 2;
    var Y = Extent[1] + (Extent[3] - Extent[1]) / 2;
    return [X, Y];
  };

  const [map, setMap] = useState();
  const mapElement = useRef();
  const mapRef = useRef();
  mapRef.current = map;

  useEffect(() => {
    const _map = new Map({
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

    var lowerXY = transform(lower, "EPSG:4326", "EPSG:3857");
    var upperXY = transform(upper, "EPSG:4326", "EPSG:3857");
    var extent = lowerXY.concat(upperXY);
    var center = getCenterOfExtent(extent);

    _map.getView().setCenter(center);
    _map.getView().fit(extent, _map.getSize());

    var canvas = document.createElement("canvas");
    canvas.id = "a_boat";
    canvas.width = 20;
    canvas.height = 20;
    canvas.style.zIndex = 1;
    canvas.style.position = "absolute";
    canvas.style.border = "1px solid";
    document.body.appendChild(canvas);
    const markerOverlay = new Overlay({
      element: canvas,
      positioning: "center-center",
      stopEvent: false,
      autoPan: true,
      offset: [-10, -10],
    });

    var data_set = {};
    var token =
      "f82f0bf1fd54d297981f3452efbd9e8001a15032b69245affb9bfa1fabe5d0cd";
    var serial_numbers = ["FA-AA-AAAM"];
    var index = 0;

    fetch("https://www.igtimi.com/api/v1/resources/data", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: {
          access_token: token,
          start_time: 1328480640000,
          end_time: 1328486508000,
          serial_numbers: serial_numbers,
          types: {
            1: 0.00009,
          },
        },
      },
    })
      .then((response) => {
        // Examine the text in the response
        console.log(response);
        // response.json().then(function (data) {
        //   console.log(data);
        // });
      })
      .catch(function (err) {
        console.log("Fetch Error: ", err);
      });

    const updateOverlay = () => {
      for (var i = 0; i < serial_numbers.length; i++) {
        if (serial_numbers[i] in data_set) {
          var gps_set = data_set[serial_numbers[i]]["1"];
          if (index >= gps_set["1"].length) {
          }
          if (index < gps_set["1"].length) {
            var lat = gps_set["1"][index];
            var lng = gps_set["2"][index];
          }
          var lat_lng = [lat, lng];
          var lat_lngXY = transform(lat_lng, "EPSG:4326", "EPSG:3857");
          markerOverlay.setPosition(lat_lngXY);
          _map.addOverlay(markerOverlay);
          _map.render();
        }
      }
    };

    setMap(_map);

    setInterval(() => {
      updateOverlay();
      index = index + 1;
    }, 1000);
  }, []);

  return (
    <>
      <div ref={mapElement} className="map-container"></div>
    </>
  );
};

export default MapComponent;

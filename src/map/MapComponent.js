import React, { useState, useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import Overlay from "ol/Overlay";
import { transform, fromLonLat } from "ol/proj";
import { Draw, Modify } from "ol/interaction";
import { LineString, Point } from "ol/geom";
import { OSM, Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import {
  formatArea,
  formatLength,
  modifyStyle,
  segmentStyle,
  style,
  labelStyle,
  tipStyle,
} from "./MeasuringComponent";

let tipPoint;

const segmentStyles = [segmentStyle];
const source = new VectorSource();
const modify = new Modify({ source: source, style: modifyStyle });

const styleFunction = (feature, segments, drawType, tip) => {
  //drawing lines for measuring tools
  const styles = [style];
  const geometry = feature.getGeometry();
  const type = geometry.getType();
  let point, label, line;
  if (!drawType || drawType === type) {
    if (type === "Polygon") {
      point = geometry.getInteriorPoint();
      label = formatArea(geometry);
      line = new LineString(geometry.getCoordinates()[0]);
    } else if (type === "LineString") {
      point = new Point(geometry.getLastCoordinate());
      label = formatLength(geometry);
      line = geometry;
    }
  }
  if (segments && line) {
    let count = 0;
    line.forEachSegment(function (a, b) {
      const segment = new LineString([a, b]);
      const label = formatLength(segment);
      if (segmentStyles.length - 1 < count) {
        segmentStyles.push(segmentStyle.clone());
      }
      const segmentPoint = new Point(segment.getCoordinateAt(0.5));
      segmentStyles[count].setGeometry(segmentPoint);
      segmentStyles[count].getText().setText(label);
      styles.push(segmentStyles[count]);
      count++;
    });
  }
  if (label) {
    labelStyle.setGeometry(point);
    labelStyle.getText().setText(label);
    styles.push(labelStyle);
  }
  if (
    tip &&
    type === "Point" &&
    !modify.getOverlay().getSource().getFeatures().length
  ) {
    tipPoint = geometry;
    tipStyle.getText().setText(tip);
    styles.push(tipStyle);
  }
  return styles;
};

const MapComponent = () => {
  const [map, setMap] = useState();
  const mapElement = useRef();
  const mapRef = useRef();
  mapRef.current = map;
  useEffect(() => {
    const vector = new VectorLayer({
      source: source,
      style: function (feature) {
        return styleFunction(feature, true);
      },
    });
    const _map = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vector,
      ],
      view: new View({
        center: fromLonLat([-74.006, 40.712]), // Coordinates of New York
        zoom: 7, //Initial Zoom Level
      }),
    });

    _map.addInteraction(modify);
    let draw;
    //note: There are supposed to be 2 different mode for drawing
    //(Polygon and Line drawing) but I couldn't figure out why line drawing isn't work
    const addInteraction = () => {
      const drawType = "Polygon";
      const activeTip =
        "Click to continue drawing the " +
        (drawType === "Polygon" ? "polygon" : "line");
      const idleTip = "Click to start measuring";
      let tip = idleTip;
      draw = new Draw({
        source: source,
        type: drawType,
        style: function (feature) {
          return styleFunction(feature, true, drawType, tip);
        },
      });
      draw.on("drawstart", function () {
        source.clear();
        modify.setActive(false);
        tip = activeTip;
      });
      draw.on("drawend", function () {
        modifyStyle.setGeometry(tipPoint);
        modify.setActive(true);
        _map.once("pointermove", function () {
          modifyStyle.setGeometry();
        });
        tip = idleTip;
      });
      modify.setActive(true);
      _map.addInteraction(draw);
    };
    addInteraction();

    //box overlay
    var lower = [156.24702734375, -51.040750041469];
    var upper = [360 + -170.48637109375, -30.939046030799];
    const getCenterOfExtent = (Extent) => {
      var X = Extent[0] + (Extent[2] - Extent[0]) / 2;
      var Y = Extent[1] + (Extent[3] - Extent[1]) / 2;
      return [X, Y];
    };
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
    var start_time = 1328480640000;
    var end_time = 1328486508000;

    var url = new URL('https://www.igtimi.com/api/v1/resources/data')
    var params = {
      start_time: start_time,
      end_time: end_time,
      access_token: token,
      "serial_numbers[]": serial_numbers,
      "types[1]": 0.00009,
    };
    url.search = new URLSearchParams(params).toString();

    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then(responseJson => {
        data_set = responseJson;

        setInterval(() => {
          updateOverlay();
          index = index + 1;
        }, 1000);
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
  }, []);

  const removeLines = () => {
    source.clear();
  };

  return (
    <>
      <div ref={mapElement} className="map-container"></div>
      <div className="measuring-tool">
        <button className="reset-button" onClick={removeLines}>
          Remove Lines
        </button>
      </div>
    </>
  );
};

export default MapComponent;

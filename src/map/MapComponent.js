import React, { useState, useEffect, useRef, createRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { transform } from "ol/proj";
import { fromLonLat } from "ol/proj";
import Overlay from "ol/Overlay";
import { Draw, Modify } from "ol/interaction";
import { LineString, Point } from "ol/geom";
import { OSM, Vector as VectorSource } from "ol/source";
import { Tile, Vector as VectorLayer } from "ol/layer";
import { getArea, getLength } from "ol/sphere";
import {
  Circle as CircleStyle,
  Fill,
  RegularShape,
  Stroke,
  Style,
  Text,
} from "ol/style";

const style = new Style({
  fill: new Fill({
    color: "rgba(255, 255, 255, 0.2)",
  }),
  stroke: new Stroke({
    color: "rgba(0, 0, 0, 0.5)",
    lineDash: [10, 10],
    width: 2,
  }),
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: "rgba(0, 0, 0, 0.7)",
    }),
    fill: new Fill({
      color: "rgba(255, 255, 255, 0.2)",
    }),
  }),
});

const labelStyle = new Style({
  text: new Text({
    font: "14px Calibri,sans-serif",
    fill: new Fill({
      color: "rgba(255, 255, 255, 1)",
    }),
    backgroundFill: new Fill({
      color: "rgba(0, 0, 0, 0.7)",
    }),
    padding: [3, 3, 3, 3],
    textBaseline: "bottom",
    offsetY: -15,
  }),
  image: new RegularShape({
    radius: 8,
    points: 3,
    angle: Math.PI,
    displacement: [0, 10],
    fill: new Fill({
      color: "rgba(0, 0, 0, 0.7)",
    }),
  }),
});

const tipStyle = new Style({
  text: new Text({
    font: "12px Calibri,sans-serif",
    fill: new Fill({
      color: "rgba(255, 255, 255, 1)",
    }),
    backgroundFill: new Fill({
      color: "rgba(0, 0, 0, 0.4)",
    }),
    padding: [2, 2, 2, 2],
    textAlign: "left",
    offsetX: 15,
  }),
});

const modifyStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: "rgba(0, 0, 0, 0.7)",
    }),
    fill: new Fill({
      color: "rgba(0, 0, 0, 0.4)",
    }),
  }),
  text: new Text({
    text: "Drag to modify",
    font: "12px Calibri,sans-serif",
    fill: new Fill({
      color: "rgba(255, 255, 255, 1)",
    }),
    backgroundFill: new Fill({
      color: "rgba(0, 0, 0, 0.7)",
    }),
    padding: [2, 2, 2, 2],
    textAlign: "left",
    offsetX: 15,
  }),
});

const segmentStyle = new Style({
  text: new Text({
    font: "12px Calibri,sans-serif",
    fill: new Fill({
      color: "rgba(255, 255, 255, 1)",
    }),
    backgroundFill: new Fill({
      color: "rgba(0, 0, 0, 0.4)",
    }),
    padding: [2, 2, 2, 2],
    textBaseline: "bottom",
    offsetY: -12,
  }),
  image: new RegularShape({
    radius: 6,
    points: 3,
    angle: Math.PI,
    displacement: [0, 8],
    fill: new Fill({
      color: "rgba(0, 0, 0, 0.4)",
    }),
  }),
});

const formatLength = function (line) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + " km";
  } else {
    output = Math.round(length * 100) / 100 + " m";
  }
  return output;
};

const formatArea = function (polygon) {
  const area = getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + " km\xB2";
  } else {
    output = Math.round(area * 100) / 100 + " m\xB2";
  }
  return output;
};

const source = new VectorSource();

const modify = new Modify({ source: source, style: modifyStyle });

let tipPoint;

const MapComponent = () => {
  const segmentStyles = [segmentStyle];

  function styleFunction(feature, segments, drawType, tip) {
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
  }

  const vector = new VectorLayer({
    source: source,
    style: function (feature) {
      return styleFunction(feature, true);
    },
  });

  // measuring tools
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
        vector,
      ],
      view: new View({
        center: fromLonLat([-74.006, 40.712]), // Coordinates of New York
        zoom: 7, //Initial Zoom Level
      }),
    });

    //interaction
    _map.addInteraction(modify);
    let draw; // global so we can remove it later

    function addInteraction() {
      //   const drawType = typeSelect.value;
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
        if (false) {
          // if (false) {
          source.clear();
        }
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
    }
    // typeSelect.onchange = function () {
    //   map.removeInteraction(draw);
    //   addInteraction();
    // };

    addInteraction();

    // showSegments.onchange = function () {
    //   vector.changed();
    //   draw.getOverlay().changed();
    // };

    //overlay
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
        "Access-Control-Allow-Origin": "*",
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
        console.log(response);
        data_set = response;
      })
      .catch(function (err) {
        console.log("Fetch Error: ", err);
      });

    //todo: fix cors errors
    const correctData =
      '{"FA-AA-AAAM":{"1":{"1":[174.862945,174.862925,174.862458333333,174.862073333333,174.8619,174.862726666667,174.862365,174.862196666667,174.86245,174.862056666667,174.862043333333,174.862453333333,174.86347,174.862081666667,174.8622,174.862575,174.86227,174.862346666667,174.86217,174.862975,174.862645,174.862341666667,174.862025,174.862338333333,174.86188,174.861815,174.862056666667,174.861796666667,174.862303333333,174.864506666667,174.866563333333,174.868991666667,174.873278333333,174.875115,174.875236666667,174.87591,174.876406666667,174.876581666667,174.87645,174.87606,174.873653333333,174.87264,174.87168,174.868183333333,174.863378333333,174.863045,174.860818333333,174.858888333333,174.858358333333,174.857853333333,174.858688333333,174.861861666667,174.867185,174.868421666667,174.868858333333,174.870791666667,174.872033333333,174.8724,174.872706666667,174.872616666667,174.87088,174.869405,174.866485,174.861631666667,174.861426666667,174.85999,174.859113333333,174.858751666667,174.857895,174.858008333333,174.860416666667,174.861108333333,174.863116666667,174.864575,174.86507,174.866305,174.871365,174.872048333333,174.872705,174.871758333333,174.870176666667,174.868721666667,174.867323333333,174.86641,174.861451666667,174.859546666667,174.85814,174.85791,174.856886666667,174.854421666667,174.854643333333,174.855085,174.855968333333,174.85639,174.858053333333,174.858368333333,174.858801666667,174.860583333333,174.861808333333,174.86177,174.861916666667,174.861638333333,174.861595,174.86256,174.862675,174.862273333333,174.861795,174.862693333333,174.862678333333,174.863543333333,174.863741666667,174.863718333333,174.863061666667,174.862658333333],"2":[-36.82376,-36.8233866666667,-36.8246116666667,-36.8247766666667,-36.8246433333333,-36.82404,-36.8240566666667,-36.8245133333333,-36.8243766666667,-36.8242433333333,-36.8243883333333,-36.8240083333333,-36.8234733333333,-36.82419,-36.8249366666667,-36.8252166666667,-36.8253433333333,-36.82591,-36.8242733333333,-36.82385,-36.82378,-36.82394,-36.8244283333333,-36.824955,-36.8249633333333,-36.82486,-36.8246683333333,-36.824545,-36.82407,-36.8232733333333,-36.822015,-36.82079,-36.8192933333333,-36.8236083333333,-36.8237483333333,-36.8235766666667,-36.824915,-36.8247183333333,-36.8236533333333,-36.8228816666667,-36.819265,-36.8184666666667,-36.8185,-36.8191983333333,-36.8187466666667,-36.8186916666667,-36.8173766666667,-36.8174616666667,-36.8169,-36.8167033333333,-36.8178116666667,-36.8165833333333,-36.81486,-36.817105,-36.8183783333333,-36.817665,-36.8173933333333,-36.8186716666667,-36.818645,-36.8185233333333,-36.81871,-36.8186483333333,-36.8189216666667,-36.8188566666667,-36.8188033333333,-36.81748,-36.81692,-36.8167383333333,-36.8166633333333,-36.8169316666667,-36.8162566666667,-36.818055,-36.817415,-36.8201733333333,-36.8208216666667,-36.8201183333333,-36.8179783333333,-36.8189566666667,-36.8185883333333,-36.8188516666667,-36.81901,-36.8182483333333,-36.8178716666667,-36.8181383333333,-36.8184816666667,-36.817355,-36.816685,-36.8166916666667,-36.8189466666667,-36.823095,-36.823315,-36.823005,-36.8239016666667,-36.8245533333333,-36.8235,-36.8237733333333,-36.8234933333333,-36.8259383333333,-36.82715,-36.82659,-36.8263416666667,-36.8265033333333,-36.8263916666667,-36.8257966666667,-36.8255966666667,-36.82489,-36.8245783333333,-36.8242183333333,-36.82404,-36.8232683333333,-36.82295,-36.822655,-36.823045,-36.8236583333333],"t":[1328480640000,1328480659500,1328480722500,1328480737000,1328480747500,1328480823000,1328480836500,1328480860500,1328480887500,1328480912000,1328480920000,1328481001000,1328481051000,1328481109000,1328481147000,1328481183500,1328481196500,1328481267000,1328481347500,1328481379000,1328481392000,1328481402500,1328481428000,1328481470000,1328481486500,1328481492500,1328481539500,1328481556000,1328481661000,1328481744500,1328481830000,1328481918000,1328482076500,1328482247000,1328482254000,1328482278000,1328482332500,1328482345000,1328482376500,1328482406500,1328482532500,1328482569000,1328482590000,1328482679000,1328482804500,1328482813500,1328482890000,1328482942000,1328482968000,1328482988500,1328483037500,1328483144500,1328483308000,1328483389500,1328483433000,1328483494500,1328483532000,1328483577500,1328483589500,1328483595000,1328483643000,1328483680000,1328483757000,1328483885000,1328483891500,1328483956500,1328483983500,1328483994500,1328484018500,1328484033000,1328484110500,1328484178500,1328484246000,1328484348000,1328484373500,1328484416000,1328484582500,1328484622500,1328484649500,1328484684000,1328484731000,1328484785500,1328484828000,1328484858000,1328484993500,1328485063500,1328485111500,1328485119000,1328485181500,1328485286000,1328485298500,1328485320000,1328485365500,1328485393000,1328485460000,1328485476000,1328485495500,1328485617000,1328485733500,1328485763000,1328485810500,1328485835000,1328485873500,1328486053000,1328486064000,1328486100500,1328486130500,1328486217000,1328486229000,1328486405500,1328486429500,1328486444500,1328486474000,1328486508000]}}}';
    data_set = JSON.parse(correctData);

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
      <div className="measuring-tool">
        <form class="form-inline">
          <label for="type">Measurement type &nbsp;</label>
          <select id="type">
            <option value="LineString">Length (LineString)</option>
            <option value="Polygon">Area (Polygon)</option>
          </select>
          &nbsp;&nbsp;&nbsp;&nbsp;
          <label for="segments">Show segment lengths:&nbsp;</label>
          <input type="checkbox" id="segments" checked />
          &nbsp;&nbsp;&nbsp;&nbsp;
          <label for="clear">Clear previous measure:&nbsp;</label>
          <input type="checkbox" id="clear" checked />
        </form>
      </div>
    </>
  );
};

export default MapComponent;

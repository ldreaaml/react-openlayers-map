import logo from "./logo.svg";
import "./App.css";
import MapComponent from "./map/MapComponent";
import "ol/ol.css";

function App() {
  return (
    <div className="App">
      <div className="main">
        <MapComponent />
      </div>
    </div>
  );
}

export default App;

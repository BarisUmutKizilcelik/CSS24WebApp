/* 
TODO: request permission on iphone (https://stackoverflow.com/a/58685549)
TODO: add more sensor using SensorAPI https://developer.mozilla.org/en-US/docs/Web/API/Sensor_APIs
TODO: add audio or video features?
*/
import "./styles.css";
import { Predictor } from "./predict";
import edgeML from "edge-ml";
import MobileDetect from "mobile-detect";
let recording;

// Generator function to evaluate property path separated by "."
function* getValuesBySelectors(obj, selectors) {
  for (const selector of selectors) {
    const properties = selector.split(".");
    let value = obj;

    for (const property of properties) {
      if (typeof value === "object" && property in value) {
        value = value[property];
      } else {
        // Property not found, yield null
        value = null;
        break;
      }
    }

    yield [selector, value];
  }
}

// Initializing default tags
const defaultTags = {};

// Detect mobile device and user agent
const mobile = new MobileDetect(window.navigator.userAgent);

if (mobile.mobile()) {
  defaultTags.mobile = mobile.mobile();
}

if (mobile.userAgent()) {
  defaultTags.browser = mobile.userAgent();
}

// Predictor initialization with acceleration and rotation rate keys
const predictorKeys = [
  "acceleration.x",
  "acceleration.y",
  "acceleration.z",
  "accelerationIncludingGravity.x",
  "accelerationIncludingGravity.y",
  "accelerationIncludingGravity.z",
  "rotationRate.alpha",
  "rotationRate.beta",
  "rotationRate.gamma",
];

const p = new Predictor(
  (input) => window.score(input),
  predictorKeys,
  -500,
  ["sitting", "walking", "standing"],
  {
    scale: [
      13.282514040850428, 6.640000194311142, 0.5166666691191495,
      9.879966431120826, 7.599999807775021, 4.910000018775463,
      0.3799999915063381, 10.097212902749611, 7.089999809861183,
      4.696072328347439, 9.713235341674151, 3.8399999141693115,
      12.149999808520079, 4.099999904632568, 11.5433333431681,
      7.125925897931701, 15.25, 6.6000001430511475, 10.950000047683716,
      9.318905447200361, 10.107563270336582, 16.59999990463257,
      6.900000095367432, 8.494999706745148, 2.6895065020228346,
      4725.271130393376, 144.10000610351562, 120.79999697208405,
      3.396516480787347, 4353.668675814631, 138.59999704360962,
      3.7500000596046448, 4.403333245466153, 3471.039576654661,
      125.00000303983688, 99.60000151395798,
    ],
    center: [
      0.3494844701338975, -1.2000000476837158, -0.056399999521672725,
      0.34312441785943015, -1.3600000143051147, 0.9800000190734863,
      -0.009999999776482582, 0.41430509470378224, 1.399999976158142,
      0.05766355100079117, 0.45476184709153145, -1.399999976158142,
      2.200000047683716, 0.05999999865889549, -0.09090000031515956,
      0.3304376926235321, -2.299999952316284, 0.07000000029802322,
      -0.09000000357627869, 3.9294874498231813, 0.5179073506876783, 3.5,
      9.850000381469727, 3.940000057220459, 0.053838964142266854,
      192.6138074613262, -26.994999885559082, 24.75, -0.003499999940395355,
      242.77008199922057, 31.015000343322754, -0.009999999776482582,
      -0.018691588528280227, 181.23013322910032, -22.0, 22.600000381469727,
    ],
    name: "RobustScaler",
  },
);

// Sensors configuration for devicemotion event
const sensors = {
  devicemotion: {
    keys: predictorKeys,
    listener: (evt) => {
      const data = Object.fromEntries(
        getValuesBySelectors(evt, sensors[evt.type].keys),
      );
      score(evt.type, data, evt.timeStamp + performance.timeOrigin);
    },
  },
};

async function startRecording() {
  recording = [];
  for (var [sensor, fun] of Object.entries(sensors)) {
    window.addEventListener(sensor, fun.listener, true);
  }
}

async function stopRecording() {
  console.log(recording);
  downloadObjectAsJson(recording, "recording.json");
  for (const [sensor, fun] of Object.entries(sensors)) {
    window.removeEventListener(sensor, fun.listener, true);
    await fun.collector.onComplete();
  }
}

function score(eventtype, fields, eventtime) {
  recording.push(fields);
  // time at which the event happend
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) {
      p.addDatapoint(key, value);
    }
  }
}

function toggleRecording() {
  const statusText = document.getElementById("recording-status");
  const debugText = document.getElementById("debug");
  const recordCheckbox = document.getElementById("record");
  if (recordCheckbox.checked) {
    startRecording();
    statusText.textContent = "Recording";
    statusText.className = "status-recording";
    debugText.textContent = "Recording...";
  } else {
    stopRecording();
    statusText.textContent = "Not Recording";
    statusText.className = "status-not-recording";
    debugText.textContent = "Not Recording...";
  }
}

const predict = async () => {
  console.log("GG");
  document.getElementById("debug").innerHTML = JSON.stringify(
    await p.predict(),
    null,
    2,
  );
};

function callFunction() {
  predict();
}

function downloadObjectAsJson(exportObj, exportName) {
  var dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("record").addEventListener("change", toggleRecording);
  document
    .getElementById("call-function-button")
    .addEventListener("click", callFunction);
});

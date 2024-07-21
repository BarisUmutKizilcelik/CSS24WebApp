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

const p = new Predictor((input) => window.score(input), predictorKeys, -1000, [
  "sitting",
  "walking",
  "standing",
]);

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

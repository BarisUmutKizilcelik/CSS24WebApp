import "./styles.css"; // Import the stylesheet
import { Predictor } from "./predict"; // Import the Predictor class from predict.js
import edgeML from "edge-ml"; // Import the edge-ml library
import MobileDetect from "mobile-detect"; // Import the MobileDetect library
let recording; // Declare a variable for recording

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

// Initialize the Predictor instance
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

// Start recording function
async function startRecording() {
  recording = [];
  for (var [sensor, fun] of Object.entries(sensors)) {
    window.addEventListener(sensor, fun.listener, true);
  }
}

// Stop recording function
async function stopRecording() {
  console.log(recording);
  //downloadObjectAsJson(recording, "recording.json");
  for (const [sensor, fun] of Object.entries(sensors)) {
    window.removeEventListener(sensor, fun.listener, true);
    await fun.collector.onComplete();
  }
}

// Function to score the recorded data
function score(eventtype, fields, eventtime) {
  recording.push(fields);
  // time at which the event happened
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) {
      p.addDatapoint(key, value);
    }
  }
}

// Function to toggle recording on and off
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

// Function to predict based on recorded data
const predict = async () => {
  console.log("GG");
  document.getElementById("debug").innerHTML = JSON.stringify(
    await p.predict(),
    null,
    2,
  );
};

// Function to call the predict function
function callFunction() {
  predict();
}

// Function to download the recorded data as a JSON file
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

// Add event listeners after the DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("record").addEventListener("change", toggleRecording);
  document
    .getElementById("call-function-button")
    .addEventListener("click", callFunction);
});

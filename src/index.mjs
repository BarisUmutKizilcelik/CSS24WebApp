/* 
TODO: request permission on iphone (https://stackoverflow.com/a/58685549)
TODO: add more sensor using SensorAPI https://developer.mozilla.org/en-US/docs/Web/API/Sensor_APIs
TODO: add audio or video features?
*/
import "./styles.css";
import { Predictor } from "./predict";
import edgeML from "edge-ml";
import MobileDetect from "mobile-detect";

/* evalutate property path separated by "." */
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

var defaultTags = {};

const mobile = new MobileDetect(window.navigator.userAgent);

if (mobile.mobile()) {
  defaultTags.mobile = mobile.mobile();
}

if (mobile.userAgent()) {
  defaultTags.browser = mobile.userAgent();
}

const p = new Predictor(
  (input) => window.score(input),
  [
    "acceleration.x",
    "acceleration.y",
    "acceleration.z",
    "accelerationIncludingGravity.x",
    "accelerationIncludingGravity.y",
    "accelerationIncludingGravity.z",
    "rotationRate.alpha",
    "rotationRate.beta",
    "rotationRate.gamma",
  ],
  -1000,
  ["sitting", "walking", "standing"],
);

var sensors = {
  devicemotion: {
    keys: [
      "acceleration.x",
      "acceleration.y",
      "acceleration.z",
      "accelerationIncludingGravity.x",
      "accelerationIncludingGravity.y",
      "accelerationIncludingGravity.z",
      "rotationRate.alpha",
      "rotationRate.beta",
      "rotationRate.gamma",
    ],
    listener: function (/** @type {DeviceMotionEvent} */ evt) {
      score(
        evt.type,
        Object.fromEntries(getValuesBySelectors(evt, sensors[evt.type].keys)),
        evt.timeStamp + performance.timeOrigin,
      );
    },
  },
};

async function start_recording() {
  for (var [sensor, fun] of Object.entries(sensors)) {
    defaultTags;

    window.addEventListener(sensor, fun.listener, true);
  }
}

async function stop_recording() {
  for (const [sensor, fun] of Object.entries(sensors)) {
    window.removeEventListener(sensor, fun.listener, true);
    await fun.collector.onComplete();
  }
}

function score(eventtype, fields, eventtime) {
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
    start_recording();
    statusText.textContent = "Recording";
    statusText.className = "status-recording";
    debugText.textContent = "Recording...";
  } else {
    stop_recording();
    statusText.textContent = "Not recording";
    statusText.className = "status-not-recording";
    debugText.textContent = "Not recording...";
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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("record").addEventListener("change", toggleRecording);
  document
    .getElementById("call-function-button")
    .addEventListener("click", callFunction);
});

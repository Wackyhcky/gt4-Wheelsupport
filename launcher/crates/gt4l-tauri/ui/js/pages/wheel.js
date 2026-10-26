/*

 * Racing Wheel Configurator (TASK-018)

 *

 * Uses the same 2-column hero stage + scrollable side panel layout (.cx-body, .cx-stage, .cx-pad, .cx-panel)

 * as the DualShock 2 Controller tab (js/pages/controls.js & js/controller-svg.js).

 *

 * Left stage:

 *   - Interactive SVG Racing Wheel (rotates live with physical steering input) + Paddles + D-pad + Face buttons

 *     with leader lines and clickable callout chips around the wheel.

 *   - Interactive SVG 3-Pedal Floor Base (Clutch, Brake, Throttle) + Handbrake module below the wheel with live

 *     pressure fill gauges and clickable callout chips.

 * Right side panel:

 *   - Selected Control / Axis card (.cx-card) with Rebind, Default, Unbind, and context-sensitive calibration

 *     (Steering Lock 180°–1080°, Deadzone, Linearity; or Pedal Polarity Mode, Deadzone, Saturation, Curve).

 *   - Wheel Profile, Live Analog Meters (.cx-meter), and Force Feedback settings (.cx-analog).

 */

(function (root) {

  "use strict";

  var GT4 = (root.GT4 = root.GT4 || {});

  var h = GT4.ui.h;

  var NS = "http://www.w3.org/2000/svg";



  function call(command, args) {

    return GT4.backend.call(command, args);

  }



  function svgEl(tag, attrs, parent) {

    var node = document.createElementNS(NS, tag);

    Object.keys(attrs || {}).forEach(function (key) {

      node.setAttribute(key, String(attrs[key]));

    });

    if (parent) {

      parent.appendChild(node);

    }

    return node;

  }



  function svgText(parent, x, y, value, cls) {

    var node = svgEl("text", { x: x, y: y, class: cls || "" }, parent);

    node.textContent = value;

    return node;

  }



  function gradient(parent, tag, id, attrs, stops) {

    var node = svgEl(tag, Object.assign({ id: id }, attrs), parent);

    stops.forEach(function (stop) {

      svgEl(

        "stop",

        {

          offset: stop[0],

          "stop-color": stop[1],

          "stop-opacity": stop[2] === undefined ? 1 : stop[2]

        },

        node

      );

    });

    return node;

  }



  var PRESET_LABELS = {

    generic: "Universal USB / DirectInput Wheel (900°)",

    hori: "HORI Racing Wheel Apex / Overdrive / XInput (270°)",

    logitech_g29: "Logitech G25 / G27 / G29 / G920 / G923 (900°)",

    logitech_dfgt: "Logitech Driving Force GT / Pro (900°)",

    thrustmaster: "Thrustmaster T150 / T248 / T300 / TX / T-GT (900°)",

    fanatec_moza: "Fanatec / Moza / Direct Drive (900°)",

    combined_pedals: "Combined Single-Axis Pedals (270°)",

    custom: "Custom User Profile"

  };



  var PEDAL_MAP_LABELS = {

    cross_square: "Default GT4 (Cross = Gas, Square = Brake, Paddles = L2/R2)",

    both: "Dual (Cross + R2 Gas, Square + L2 Brake)",

    l2_r2: "Triggers Only (R2 Gas, L2 Brake)",

    rstick_y: "Right Stick Y Axis (Proportional Gas/Brake)"

  };



  var AXIS_MODE_LABELS = {

    inverted: "Inverted (+32767 rest → -32768 full)",

    normal: "Normal (-32768 rest → +32767 full)",

    positive: "Positive Half (0 rest → +32767 full)",

    combined_positive: "Combined Axis Positive (0 → +32767)",

    combined_negative: "Combined Axis Negative (0 → -32768)"

  };



  var CURVE_LABELS = {

    linear: "Linear (1:1 Direct)",

    quadratic: "Quadratic (Smooth Center)",

    cubic: "Cubic (Fine Center Control)"

  };



  // All interactive controls on the Racing Wheel + Pedals diagram:

  // cx, cy = position of the control on the SVG; badge = [bx, by] chip position; lead = [lx, ly] leader start.

  var WHEEL_ITEMS = {
    steering: {
      id: "steering",
      name: "Steering Wheel / Axis",
      kind: "steering",
      x: 500,
      y: 54,
      badge: [150, 50],
      lead: [417, 46]
    },
    l2: {
      id: "l2",
      name: "Shift Down (L2 / Left Paddle)",
      kind: "button",
      x: 318,
      y: 212,
      badge: [118, 118],
      lead: [295, 186]
    },
    r2: {
      id: "r2",
      name: "Shift Up (R2 / Right Paddle)",
      kind: "button",
      x: 682,
      y: 212,
      badge: [882, 118],
      lead: [705, 186]
    },
    l1: {
      id: "l1",
      name: "Look Back (L1)",
      kind: "button",
      x: 401,
      y: 181,
      badge: [118, 168],
      lead: [389, 179]
    },
    r1: {
      id: "r1",
      name: "Nitro / Boost (R1)",
      kind: "button",
      x: 599,
      y: 181,
      badge: [882, 168],
      lead: [611, 179]
    },
    dpad_up: {
      id: "dpad_up",
      name: "D-pad Up",
      kind: "button",
      x: 373,
      y: 216,
      badge: [118, 218],
      lead: [373, 202]
    },
    dpad_left: {
      id: "dpad_left",
      name: "D-pad Left",
      kind: "button",
      x: 349,
      y: 240,
      badge: [118, 264],
      lead: [332, 240]
    },
    dpad_right: {
      id: "dpad_right",
      name: "D-pad Right",
      kind: "button",
      x: 396,
      y: 240,
      badge: [118, 310],
      lead: [413, 240]
    },
    dpad_down: {
      id: "dpad_down",
      name: "D-pad Down",
      kind: "button",
      x: 373,
      y: 264,
      badge: [118, 356],
      lead: [373, 278]
    },
    triangle: {
      id: "triangle",
      name: "Triangle (Reverse / Alternate View)",
      kind: "button",
      x: 627,
      y: 216,
      badge: [882, 218],
      lead: [627, 202]
    },
    square: {
      id: "square",
      name: "Square (Brake / Cancel)",
      kind: "button",
      x: 604,
      y: 240,
      badge: [882, 264],
      lead: [587, 240]
    },
    circle: {
      id: "circle",
      name: "Circle (Handbrake / Back)",
      kind: "button",
      x: 651,
      y: 240,
      badge: [882, 310],
      lead: [668, 240]
    },
    cross: {
      id: "cross",
      name: "Cross (Accelerate / Confirm)",
      kind: "button",
      x: 627,
      y: 264,
      badge: [882, 356],
      lead: [627, 278]
    },
    l3: {
      id: "l3",
      name: "L3 (Horn / High Beam)",
      kind: "button",
      x: 427,
      y: 308,
      badge: [148, 404],
      lead: [417, 313]
    },
    r3: {
      id: "r3",
      name: "R3 (Rear Camera)",
      kind: "button",
      x: 573,
      y: 308,
      badge: [852, 404],
      lead: [583, 313]
    },
    select: {
      id: "select",
      name: "Select (Change Camera)",
      kind: "button",
      x: 462,
      y: 356,
      badge: [264, 434],
      lead: [458, 367]
    },
    start: {
      id: "start",
      name: "Start (Pause)",
      kind: "button",
      x: 538,
      y: 356,
      badge: [736, 434],
      lead: [542, 367]
    },
    throttle: {
      id: "throttle",
      name: "Throttle Pedal (Cross)",
      kind: "pedal",
      x: 582,
      y: 548,
      badge: [582, 646],
      lead: [582, 610]
    },
    brake: {
      id: "brake",
      name: "Brake Pedal (Square)",
      kind: "pedal",
      x: 446,
      y: 548,
      badge: [446, 646],
      lead: [446, 610]
    },
    clutch: {
      id: "clutch",
      name: "Clutch (Display Only)",
      kind: "pedal",
      x: 310,
      y: 548,
      badge: [310, 646],
      lead: [310, 610]
    },
    handbrake: {
      id: "handbrake",
      name: "Handbrake (Axis / Lever)",
      kind: "pedal",
      x: 726,
      y: 548,
      badge: [726, 646],
      lead: [726, 610]
    }
  };



  var ITEM_ORDER = [
    "steering",
    "throttle",
    "brake",
    "r1",
    "r2",
    "l2",
    "cross",
    "square",
    "circle",
    "triangle",
    "l1",
    "handbrake",
    "clutch",
    "select",
    "start",
    "dpad_up",
    "dpad_down",
    "dpad_left",
    "dpad_right",
    "l3",
    "r3"
  ];



  function shortSourceText(src) {

    if (!src) {

      return "—";

    }

    var tail = src;

    var devPrefix = "";

    if (src.indexOf("dev:") === 0) {

      var parts = src.split(":");

      devPrefix = "D2·";

      tail = parts.slice(2).join(":");

    }

    if (tail.indexOf("axis:") === 0) {

      return devPrefix + "AX " + tail.slice(5);

    }

    if (tail.indexOf("button:") === 0) {

      return devPrefix + "B" + (parseInt(tail.slice(7), 10) + 1);

    }

    if (tail.indexOf("hat:") === 0) {

      var hp = tail.split(":");

      return devPrefix + "HAT " + (hp[2] || "").toUpperCase().slice(0, 1);

    }

    return src;

  }



  function longSourceText(src) {

    if (!src) {

      return "Unbound";

    }

    var tail = src;

    var devNote = "";

    if (src.indexOf("dev:") === 0) {

      var parts = src.split(":");

      devNote = "USB Device (" + (parts[1] || "").slice(0, 6) + ") · ";

      tail = parts.slice(2).join(":");

    }

    if (tail.indexOf("axis:") === 0) {

      return devNote + "Axis " + tail.slice(5);

    }

    if (tail.indexOf("button:") === 0) {

      return devNote + "Button " + (parseInt(tail.slice(7), 10) + 1);

    }

    if (tail.indexOf("hat:") === 0) {

      var hp = tail.split(":");

      return devNote + "D-Pad Hat " + hp[1] + " " + (hp[2] || "").toUpperCase();

    }

    return src;

  }



  function evalSteeringNorm(cfg, raw) {

    if (!cfg) {

      return 0;

    }

    var signed = raw < 0 ? raw / 32768 : raw / 32767;

    if (cfg.invert) {

      signed = -signed;

    }

    var sign = signed < 0 ? -1 : 1;

    var mag = Math.abs(signed);

    var phys = Math.max(180, Math.min(1080, cfg.rotation_degrees || 900));

    var eff = Math.max(180, Math.min(phys, cfg.effective_degrees || phys));

    var ratio = eff / phys;

    if (ratio > 0) {

      mag /= ratio;

    }

    var dz = Math.max(0, Math.min(0.45, cfg.deadzone || 0));

    if (mag <= dz) {

      return 0;

    }

    var norm = Math.max(0, Math.min(1, (mag - dz) / (1 - dz)));

    if (cfg.linearity === "quadratic") {

      norm = norm * norm;

    } else if (cfg.linearity === "cubic") {

      norm = norm * norm * norm;

    }

    var scaled = Math.max(0, Math.min(1, norm * (cfg.sensitivity || 1)));

    return sign * scaled;

  }



  function evalPedalNorm(cfg, raw) {
    if (raw === null || raw === undefined || !Number.isFinite(raw)) return {raw:0, out:0};

    var travel = 0;

    var mode = (cfg && cfg.mode) || "inverted";

    if (mode === "inverted") {

      travel = (32767 - raw) / 65535;

    } else if (mode === "normal") {

      travel = (raw + 32768) / 65535;

    } else if (mode === "positive" || mode === "combined_positive") {

      travel = raw <= 0 ? 0 : raw / 32767;

    } else if (mode === "combined_negative") {

      travel = raw >= 0 ? 0 : -raw / 32768;

    }

    travel = Math.max(0, Math.min(1, travel));

    var dz = Math.max(0, Math.min(0.45, (cfg && cfg.deadzone) || 0));

    var sat = Math.max(dz + 0.05, Math.min(1, (cfg && cfg.saturation) || 0.98));

    if (travel <= dz) {

      return { raw: travel, out: 0 };

    }

    var norm = Math.max(0, Math.min(1, (travel - dz) / (sat - dz)));

    if (cfg && cfg.curve === "quadratic") {

      norm = norm * norm;

    } else if (cfg && cfg.curve === "cubic") {

      norm = norm * norm * norm;

    }

    return { raw: travel, out: Math.max(0, Math.min(1, norm)) };

  }



  // Resolve a physical source exactly; a missing or ambiguous GUID is neutral.
  function resolveLiveDevice(src, devices, primaryGuid) {
    var explicit = String(src || "").indexOf("dev:") === 0;
    var guid = explicit ? String(src).split(":")[1] : primaryGuid;
    if (guid) {
      var matches = devices.filter(function (d) { return (d.guid || "").toLowerCase() === guid.toLowerCase(); });
      return matches.length === 1 ? matches[0] : null;
    }
    var candidate = devices.filter(function (d) { return d.is_wheel; })[0];
    if (!candidate) return null;
    return devices.filter(function (d) { return d.guid === candidate.guid; }).length === 1 ? candidate : null;
  }

  function readSourceAxis(src, devices, primaryGuid) {
    var dev = resolveLiveDevice(src, devices, primaryGuid);
    var tail = String(src || "").replace(/^dev:[^:]+:/, "");
    var match = /^axis:(\d+)$/.exec(tail);
    if (!dev || !match) return null;
    var value = (dev.axes || [])[Number(match[1])];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function sourcePressed(src, devices, primaryGuid) {
    var dev = resolveLiveDevice(src, devices, primaryGuid);
    if (!dev) return false;
    var tail = String(src || "").replace(/^dev:[^:]+:/, "");
    var button = /^btn:(\d+)$/.exec(tail);
    if (button) return !!(dev.buttons || [])[Number(button[1])];
    var hat = /^hat:(\d+):(up|right|down|left)$/.exec(tail);
    if (hat) return !!(((dev.hats || [])[Number(hat[1])] || 0) & {up:1,right:2,down:4,left:8}[hat[2]]);
    var axis = /^axis:(\d+)([+-]?)$/.exec(tail);
    if (!axis) return false;
    var raw = (dev.axes || [])[Number(axis[1])];
    if (typeof raw !== "number") return false;
    return axis[2] === "+" ? raw > 16384 : axis[2] === "-" ? raw < -16384 : raw > 0 || Math.abs(raw) > 20000;
  }

  function readPedal(config, devices, primaryGuid) {
    if (!config || !config.source) return {raw:0,out:0};
    var source = config.source.replace(/^dev:[^:]+:/, "");
    if (/^axis:\d+$/.test(source)) return evalPedalNorm(config, readSourceAxis(config.source, devices, primaryGuid));
    var pressed = sourcePressed(config.source, devices, primaryGuid) ? 1 : 0;
    return {raw:pressed,out:pressed};
  }
  GT4.wheelModel = { readSourceAxis: readSourceAxis, sourcePressed: sourcePressed, pedal: evalPedalNorm, readPedal:readPedal };

  // Builds the small standalone <svg> icon for the selected control card in the side panel

  function buildItemGlyph(id) {

    var item = WHEEL_ITEMS[id] || WHEEL_ITEMS.steering;

    if (item.kind === "button" && GT4.controllerSvg && GT4.controllerSvg.glyph) {

      return GT4.controllerSvg.glyph(id);

    }

    var svg = svgEl("svg", { viewBox: "0 0 52 52", class: "ds-glyph", "aria-hidden": "true" });

    if (item.kind === "steering") {

      svgEl("circle", { class: "gl-cap", cx: 26, cy: 26, r: 22 }, svg);

      svgEl("circle", { class: "gl-ring", cx: 26, cy: 26, r: 15 }, svg);

      svgEl("path", { class: "glyph g-cross", d: "M11 24 H41 M26 26 V41" }, svg);

      svgEl("rect", { class: "gl-on", x: 24, y: 3, width: 4, height: 6, rx: 1 }, svg);

      svgEl("circle", { class: "gl-cap", cx: 26, cy: 26, r: 5 }, svg);

    } else {

      svgEl("rect", { class: "gl-cap", x: 14, y: 6, width: 24, height: 40, rx: 5 }, svg);

      svgEl("rect", { class: "gl-on", x: 18, y: 22, width: 16, height: 20, rx: 3 }, svg);

      svgText(svg, 26, 20, id === "handbrake" ? "HB" : id.slice(0, 1).toUpperCase(), "gl-text");

    }

    return svg;

  }



  // Builds the interactive Racing Wheel + 3-Pedals + Handbrake SVG stage

  function buildWheelStageSvg(onPick) {

    var svg = svgEl("svg", {

      viewBox: "24 20 952 652",

      class: "pad-svg wheel-stage-svg",

      "aria-label": "Interactive racing wheel and pedals diagram"

    });



    // Shared gradients & filters matching controller-svg.js

    var d = svgEl("defs", {}, svg);

    var down = { x1: 0, y1: 0, x2: 0, y2: 1 };

    gradient(d, "linearGradient", "wh-body", down, [

      [0, "#383e48"],

      [0.5, "#23272e"],

      [1, "#121418"]

    ]);

    gradient(d, "linearGradient", "wh-rim", down, [

      [0, "#464d59"],

      [0.35, "#2b3038"],

      [1, "#15181d"]

    ]);

    gradient(d, "linearGradient", "wh-spoke", down, [

      [0, "#525a67"],

      [0.5, "#2e333b"],

      [1, "#1b1e24"]

    ]);

    gradient(d, "linearGradient", "wh-paddle", down, [

      [0, "#687282"],

      [0.5, "#3f4652"],

      [1, "#252930"]

    ]);

    gradient(d, "linearGradient", "wh-paddle-on", down, [

      [0, "#86acff"],

      [1, "#2d56b8"]

    ]);

    gradient(d, "linearGradient", "wh-fill-throttle", { x1: 0, y1: 1, x2: 0, y2: 0 }, [

      [0, "#1f7a4c"],

      [1, "#5ce096"]

    ]);

    gradient(d, "linearGradient", "wh-fill-brake", { x1: 0, y1: 1, x2: 0, y2: 0 }, [

      [0, "#a82828"],

      [1, "#ff6b6b"]

    ]);

    gradient(d, "linearGradient", "wh-fill-clutch", { x1: 0, y1: 1, x2: 0, y2: 0 }, [

      [0, "#245bc4"],

      [1, "#85b2ff"]

    ]);

    gradient(d, "linearGradient", "wh-fill-hb", { x1: 0, y1: 1, x2: 0, y2: 0 }, [

      [0, "#9e6a14"],

      [1, "#f2b84b"]

    ]);



    var groups = {};

    var badges = {};

    var pedalFills = {};

    var pedalTexts = {};



    // 1. Servo Wheelbase Housing (stationary behind the rotating wheel)

    var wheelScaler = svgEl("g", { id: "wh-wheel-scaler", transform: "translate(500, 240) scale(1.18) translate(-500, -246)" }, svg);
    var baseGroup = svgEl("g", { class: "wh-servo-base" }, wheelScaler);

    svgEl(

      "rect",

      {

        x: 364,

        y: 122,

        width: 272,

        height: 256,

        rx: 38,

        fill: "url(#wh-body)",

        stroke: "#0b0d10",

        "stroke-width": 2.5

      },

      baseGroup

    );

    svgEl(

      "rect",

      {

        x: 382,

        y: 138,

        width: 236,

        height: 224,

        rx: 28,

        fill: "none",

        stroke: "rgba(255,255,255,0.07)",

        "stroke-width": 1.5

      },

      baseGroup

    );

    svgEl("circle", { cx: 500, cy: 246, r: 96, fill: "#111318", stroke: "rgba(255,255,255,0.08)", "stroke-width": 1.5 }, baseGroup);



    // 2. Rotating Steering Wheel Group (centered at 500, 246)

    var rotatingGroup = svgEl("g", { class: "wh-rotating-rim" }, wheelScaler);



    // Left & Right Paddle Shifters (L1 / R1)

    function makePaddle(id, dPath, labelX, labelY, textVal, haloRect) {

      var g = svgEl("g", { class: "pad-ctl", "data-control": id, "data-focusable": "", tabindex: "0", role: "button", "aria-label": WHEEL_ITEMS[id].name }, rotatingGroup);

      svgEl("rect", { class: "halo", x: haloRect[0], y: haloRect[1], width: haloRect[2], height: haloRect[3], rx: 12 }, g);

      var press = svgEl("g", { class: "press" }, g);

      svgEl("path", { class: "cap shoulder", d: dPath, fill: "url(#wh-paddle)", stroke: "#0c0e12", "stroke-width": 2 }, press);

      svgText(press, labelX, labelY, textVal, "label");

      groups[id] = g;

    }

    makePaddle(
      "l2",
      "M 358 158 L 328 172 C 320 198 320 248 328 274 L 358 286 L 366 266 C 358 242 358 202 366 178 Z",
      343,
      228,
      "L2",
      [316, 152, 56, 140]
    );
    makePaddle(
      "r2",
      "M 642 158 L 672 172 C 680 198 680 248 672 274 L 642 286 L 634 266 C 642 242 642 202 634 178 Z",
      657,
      228,
      "R2",
      [628, 152, 56, 140]
    );



    // Outer Steering Rim (clickable as "steering")

    var steerGroup = svgEl(

      "g",

      { class: "pad-ctl", "data-control": "steering", "data-focusable": "", tabindex: "0", role: "button", "aria-label": "Steering Axis" },

      rotatingGroup

    );

    svgEl("circle", { class: "halo", cx: 500, cy: 246, r: 184 }, steerGroup);

    // Outer leather torus (r=174 outer, r=138 inner -> stroke-width 36 at r=156)

    svgEl(

      "circle",

      {

        cx: 500,

        cy: 246,

        r: 156,

        fill: "none",

        stroke: "url(#wh-rim)",

        "stroke-width": 36

      },

      steerGroup

    );

    svgEl(

      "circle",

      {

        cx: 500,

        cy: 246,

        r: 174,

        fill: "none",

        stroke: "rgba(255,255,255,0.18)",

        "stroke-width": 2

      },

      steerGroup

    );

    svgEl(

      "circle",

      {

        cx: 500,

        cy: 246,

        r: 138,

        fill: "none",

        stroke: "#0d0f13",

        "stroke-width": 2.5

      },

      steerGroup

    );



    // Metallic 3-Spoke Center Plate

    svgEl(

      "path",

      {

        d: "M 358 214 L 444 210 C 464 192 536 192 556 210 L 642 214 L 642 274 L 552 286 L 526 384 L 474 384 L 448 286 L 358 274 Z",

        fill: "url(#wh-spoke)",

        stroke: "#101216",

        "stroke-width": 2

      },

      steerGroup

    );



    // Top 12-o'clock Center Stripe

    svgEl(

      "rect",

      {

        x: 492,

        y: 72,

        width: 16,

        height: 36,

        rx: 4,

        fill: "#e34c42",

        stroke: "#ffffff",

        "stroke-width": 1

      },

      steerGroup

    );



    // Center GT Hub Emblem & RPM LED Strip

    svgEl("rect", { x: 456, y: 204, width: 88, height: 8, rx: 4, fill: "#121418", stroke: "rgba(255,255,255,0.12)" }, steerGroup);

    for (var led = 0; led < 7; led++) {

      var ledColor = led < 3 ? "#3fb950" : led < 5 ? "#d29922" : "#f85149";

      svgEl("circle", { cx: 468 + led * 10.6, cy: 208, r: 2.5, fill: ledColor }, steerGroup);

    }

    svgEl("circle", { cx: 500, cy: 252, r: 32, fill: "#16191f", stroke: "rgba(255,255,255,0.16)", "stroke-width": 2 }, steerGroup);

    svgEl("circle", { cx: 500, cy: 252, r: 24, fill: "none", stroke: "rgba(120,165,255,0.35)", "stroke-width": 1.5 }, steerGroup);

    svgText(steerGroup, 500, 257, "GT", "print");

    groups.steering = steerGroup;



    // Small Round / Pill Wheel Buttons on the Spokes

    function makeSpokeButton(id, cx, cy, r, labelText, glyphKind) {

      var g = svgEl(

        "g",

        { class: "pad-ctl", "data-control": id, "data-focusable": "", tabindex: "0", role: "button", "aria-label": WHEEL_ITEMS[id].name },

        rotatingGroup

      );

      svgEl("circle", { class: "halo", cx: cx, cy: cy, r: r + 5 }, g);

      var press = svgEl("g", { class: "press" }, g);

      svgEl("circle", { class: "cap face", cx: cx, cy: cy, r: r, fill: "#252932", stroke: "#0d0f14", "stroke-width": 1.5 }, press);

      if (glyphKind === "triangle") {

        svgEl("polygon", { class: "glyph g-triangle", points: cx + "," + (cy - 6) + " " + (cx - 6) + "," + (cy + 5) + " " + (cx + 6) + "," + (cy + 5) }, press);

      } else if (glyphKind === "circle") {

        svgEl("circle", { class: "glyph g-circle", cx: cx, cy: cy, r: 5.5 }, press);

      } else if (glyphKind === "cross") {

        svgEl("path", { class: "glyph g-cross", d: "M" + (cx - 5) + " " + (cy - 5) + " L" + (cx + 5) + " " + (cy + 5) + " M" + (cx + 5) + " " + (cy - 5) + " L" + (cx - 5) + " " + (cy + 5) }, press);

      } else if (glyphKind === "square") {

        svgEl("rect", { class: "glyph g-square", x: cx - 5, y: cy - 5, width: 10, height: 10, rx: 1 }, press);

      } else if (labelText) {

        var t = svgText(press, cx, cy + 4, labelText, "stick-label");

        t.setAttribute("text-anchor", "middle");

        t.setAttribute("fill", "#d0d6e0");

      }

      groups[id] = g;

    }



    // D-Pad buttons on left spoke (center 392, 246)

    makeSpokeButton("dpad_up", 392, 226, 10, "▲", null);

    makeSpokeButton("dpad_left", 372, 246, 10, "◀", null);

    makeSpokeButton("dpad_right", 412, 246, 10, "▶", null);

    makeSpokeButton("dpad_down", 392, 266, 10, "▼", null);



    // Face buttons on right spoke (center 608, 246)

    makeSpokeButton("triangle", 608, 226, 11, null, "triangle");

    makeSpokeButton("square", 588, 246, 11, null, "square");

    makeSpokeButton("circle", 628, 246, 11, null, "circle");

    makeSpokeButton("cross", 608, 266, 11, null, "cross");



    // L2 / R2 / L3 / R3 / Select / Start on the wheel spokes

    makeSpokeButton("l1", 416, 196, 10, "L1", null);
    makeSpokeButton("r1", 584, 196, 10, "R1", null);

    makeSpokeButton("l3", 438, 304, 10, "L3", null);

    makeSpokeButton("r3", 562, 304, 10, "R3", null);

    makeSpokeButton("select", 468, 344, 11, "SEL", null);

    makeSpokeButton("start", 532, 344, 11, "STA", null);



    // 3. Pedal Base & Handbrake Module at Bottom of Stage (y = 468..616)

    var pedalBase = svgEl("g", { class: "wh-pedal-base" }, svg);

    svgEl(

      "rect",

      {

        x: 238,

        y: 472,

        width: 556,

        height: 142,

        rx: 18,

        fill: "url(#wh-body)",

        stroke: "#0b0d10",

        "stroke-width": 2

      },

      pedalBase

    );

    svgEl(

      "rect",

      {

        x: 248,

        y: 480,

        width: 536,

        height: 126,

        rx: 13,

        fill: "none",

        stroke: "rgba(255,255,255,0.06)",

        "stroke-width": 1.5

      },

      pedalBase

    );



    function makePedalControl(id, x, title, fillId) {

      var g = svgEl(

        "g",

        { class: "pad-ctl", "data-control": id, "data-focusable": "", tabindex: "0", role: "button", "aria-label": WHEEL_ITEMS[id].name },

        svg

      );

      svgEl("rect", { class: "halo", x: x - 44, y: 482, width: 88, height: 124, rx: 12 }, g);

      // Pedal title at top

      var lbl = svgText(g, x, 498, title, "print");

      lbl.setAttribute("font-size", "11");

      // Pedal slot track (x-24..x+24, y=506..584, height=78)

      svgEl("rect", { x: x - 24, y: 506, width: 48, height: 78, rx: 8, fill: "#111318", stroke: "rgba(255,255,255,0.16)", "stroke-width": 1.5 }, g);

      // Live fill rect growing from bottom (y=584) upwards

      var fillRect = svgEl("rect", { x: x - 22, y: 584, width: 44, height: 0, rx: 6, fill: "url(#" + fillId + ")" }, g);

      // Brushed metal pedal plate lines

      svgEl("line", { x1: x - 14, y1: 522, x2: x + 14, y2: 522, stroke: "rgba(255,255,255,0.18)", "stroke-width": 2 }, g);

      svgEl("line", { x1: x - 14, y1: 545, x2: x + 14, y2: 545, stroke: "rgba(255,255,255,0.18)", "stroke-width": 2 }, g);

      svgEl("line", { x1: x - 14, y1: 568, x2: x + 14, y2: 568, stroke: "rgba(255,255,255,0.18)", "stroke-width": 2 }, g);

      // Percentage readout

      var pct = svgText(g, x, 601, "0%", "stick-label");

      pct.setAttribute("text-anchor", "middle");

      pct.setAttribute("fill", "#9aa2af");

      pedalFills[id] = fillRect;

      pedalTexts[id] = pct;

      groups[id] = g;

    }



    makePedalControl("clutch", 310, "CLUTCH", "wh-fill-clutch");

    makePedalControl("brake", 446, "BRAKE", "wh-fill-brake");

    makePedalControl("throttle", 582, "THROTTLE", "wh-fill-throttle");

    makePedalControl("handbrake", 726, "HANDBRAKE", "wh-fill-hb");



    // 4. Callout Badges & Leader Lines for every control

    var badgeLayer = svgEl("g", { class: "badges" }, svg);

    ITEM_ORDER.forEach(function (id) {

      var info = WHEEL_ITEMS[id];

      var bGroup = svgEl("g", { class: "badge", "data-badge": id }, badgeLayer);

      svgEl(

        "line",

        {

          class: "leader",

          x1: info.lead[0],

          y1: info.lead[1],

          x2: info.badge[0],

          y2: info.badge[1]

        },

        bGroup

      );

      var chip = svgEl("g", { class: "chip" }, bGroup);

      var w = id === "steering" ? 116 : 96;

      var hBox = 28;

      var bg = svgEl(

        "rect",

        {

          class: "chip-bg",

          x: info.badge[0] - w / 2,

          y: info.badge[1] - hBox / 2,

          width: w,

          height: hBox,

          rx: 14

        },

        chip

      );

      var txt = svgText(chip, info.badge[0], info.badge[1] + 5, "—", "chip-text is-small");

      badges[id] = { group: bGroup, bg: bg, text: txt, w: w };

    });



    // Nearest-item click handler on the SVG (matches controller-svg.js)

    svg.addEventListener("click", function (ev) {

      var pt = svg.createSVGPoint();

      pt.x = ev.clientX;

      pt.y = ev.clientY;

      var ctm = svg.getScreenCTM();

      if (!ctm) {

        return;

      }

      var loc = pt.matrixTransform(ctm.inverse());

      var bestId = null;

      var bestDist = 135;

      ITEM_ORDER.forEach(function (id) {

        var item = WHEEL_ITEMS[id];

        var d1 = Math.hypot(loc.x - item.x, loc.y - item.y);

        var d2 = Math.hypot(loc.x - item.badge[0], loc.y - item.badge[1]);

        var dMin = Math.min(d1, d2);

        if (dMin < bestDist) {

          bestDist = dMin;

          bestId = id;

        }

      });

      if (bestId && onPick) {

        onPick(bestId, "pointer");

      }

    });



    Object.keys(groups).forEach(function (id) {

      groups[id].addEventListener("keydown", function (ev) {

        if (ev.key === "Enter" || ev.key === " ") {

          ev.preventDefault();

          if (onPick) {

            onPick(id, "activate");

          }

        }

      });

      groups[id].addEventListener("focus", function () {

        if (onPick) {

          onPick(id, "focus");

        }

      });

    });



    return {

      svg: svg,

      groups: groups,

      badges: badges,

      rotatingGroup: rotatingGroup,

      pedalFills: pedalFills,

      pedalTexts: pedalTexts,

      setSelected: function (selectedId) {

        ITEM_ORDER.forEach(function (id) {

          if (groups[id]) {

            groups[id].classList.toggle("is-selected", id === selectedId);

          }

          if (badges[id]) {

            badges[id].group.classList.toggle("is-selected", id === selectedId);

          }

        });

      },

      setCapturing: function (capturingId) {

        ITEM_ORDER.forEach(function (id) {

          if (groups[id]) {

            groups[id].classList.toggle("is-capturing", id === capturingId);

          }

        });

      },

      updateBadges: function (config) {

        if (!config) {

          return;

        }

        ITEM_ORDER.forEach(function (id) {

          var badge = badges[id];

          if (!badge) {

            return;

          }

          var src = "";

          if (id === "steering") {

            src = (config.steering && config.steering.source) || "";

          } else if (id === "throttle" || id === "brake" || id === "clutch" || id === "handbrake") {

            src = (config[id] && config[id].source) || "";

          } else {

            var list = (config.buttons && config.buttons[id]) || [];

            src = list[0] || "";

          }

          var label = shortSourceText(src);

          if (id === "steering" && src) {

            label = label + " · " + ((config.steering && config.steering.effective_degrees) || 900) + "°";

          }

          badge.text.textContent = label;

          badge.group.classList.toggle("is-unbound", !src);

        });

      },

      updateLive: function (steerDeg, pedalValues, activeButtons) {

        var clampedVisualDeg = Math.max(-180, Math.min(180, steerDeg));

        rotatingGroup.setAttribute("transform", "rotate(" + clampedVisualDeg.toFixed(1) + " 500 246)");

        ["clutch", "brake", "throttle", "handbrake"].forEach(function (pid) {

          var v = (pedalValues && pedalValues[pid]) || 0;

          var pct = Math.round(v * 100);

          var hPx = Math.round(v * 74);

          if (pedalFills[pid]) {

            pedalFills[pid].setAttribute("y", String(582 - hPx));

            pedalFills[pid].setAttribute("height", String(hPx));

          }

          if (pedalTexts[pid]) {

            pedalTexts[pid].textContent = pct + "%";

          }

        });

        ITEM_ORDER.forEach(function (id) {

          var down = !!(activeButtons && activeButtons[id]);

          if (groups[id]) {

            groups[id].classList.toggle("is-down", down);

          }

          if (badges[id]) {

            badges[id].group.classList.toggle("is-live", down);

          }

        });

      }

    };

  }



  GT4.mountWheelConfigurator = function (container) {

    GT4.ui.clear(container);

    container.classList.add("cx-body");



    var state = {

      config: null,

      buttonSlots: [],

      devices: [],

      liveDevices: [],

      selected: "steering",

      capturing: null

    };



    function onPick(id, how) {

      if (how === "pointer" && state.selected === id) {

        startCapture(id);

        return;

      }

      state.selected = id;
      paintButtonList();

      diagram.setSelected(id);

      paintSelectedCard();

      if (how === "activate") {

        startCapture(id);

      }

    }



    var diagram = buildWheelStageSvg(onPick);



    // Bottom legend bar under the wheel diagram (.cx-under)

    var liveSummaryAngle = h("span", { class: "cx-legend-t", text: "Steering: 0.0° (center)" });

    var liveSummaryDevices = h("span", { class: "cx-legend-t", text: "No USB wheel detected yet" });

    var legend = h("div", { class: "cx-legend" }, [

      h("span", { class: "cx-legend-item" }, [

        h("span", { class: "xchip kind-trigger", text: "AXIS" }),

        liveSummaryAngle

      ]),

      h("span", { class: "cx-legend-item" }, [

        h("span", { class: "xchip kind-key", text: "USB" }),

        liveSummaryDevices

      ]),

      h("span", {

        class: "cx-legend-note",

        text: "Click any wheel spoke, paddle, button, or pedal on the diagram to inspect or rebind."

      })

    ]);



    var stage = h("div", { class: "cx-stage" }, [

      h("div", { class: "cx-pad" }, [diagram.svg]),

      h("div", { class: "cx-under" }, [legend])

    ]);



    // ---- Right Side Panel (.cx-panel) ----

    var cardGlyph = h("span", { class: "cx-glyph" });

    var cardName = h("div", { class: "cx-name" });

    var cardState = h("div", { class: "cx-state" });

    var sourceChipSlot = h("span", { class: "cx-src-v" });

    var rebindBtn = h(

      "button",

      {

        class: "btn primary small",

        type: "button",

        on: {

          click: function () {

            startCapture(state.selected);

          }

        }

      },

      "Rebind"

    );

    var defaultBtn = h(

      "button",

      {

        class: "btn small",

        type: "button",

        on: {

          click: function () {

            call("reset_wheel_binding", { target: state.selected, clear: false }).then(applyView);

          }

        }

      },

      "Default"

    );

    var unbindBtn = h(

      "button",

      {

        class: "btn small",

        type: "button",

        on: {

          click: function () {

            call("reset_wheel_binding", { target: state.selected, clear: true }).then(applyView);

          }

        }

      },

      "Unbind"

    );

    var selectedTuningBox = h("div", { class: "cx-rows" });

    var cardHint = h("p", { class: "cx-hint", text: "Click a control on the wheel diagram or click Rebind." });



    var selectedCard = h("section", { class: "cx-card" }, [

      h("div", { class: "cx-card-head" }, [cardGlyph, h("div", { class: "cx-card-title" }, [cardName, cardState])]),

      h("div", { class: "cx-src" }, [h("span", { class: "cx-src-k", text: "Wheel Input" }), sourceChipSlot]),

      h("div", { class: "cx-actions" }, [rebindBtn, defaultBtn, unbindBtn]),

      selectedTuningBox,

      cardHint

    ]);



    // Live meters in the side panel for Steering + 4 Pedals

    var meters = {};

    function makeMeterBlock(id, title) {

      var raw = h("i", { class: "raw" });

      var out = h("i", { class: "out" });

      var dz = h("b", { class: "dz" });

      var value = h("span", { class: "cx-meter-v", text: "0%" });

      meters[id] = { raw: raw, out: out, dz: dz, value: value };

      return h(

        "div",

        {

          class: "cx-block wh-clickable-block",

          on: {

            click: function () {

              onPick(id, "focus");

            }

          }

        },

        [

          h("div", { class: "cx-block-head" }, [

            h("span", { class: "cx-block-name", text: title }),

            h("span", { class: "cx-meter", "aria-hidden": "true" }, [dz, raw, out]),

            value

          ])

        ]

      );

    }



    var profileBox = h("div", { class: "cx-rows" });

    var ffbBox = h("div", { class: "cx-rows" });



    var testFfbBtn = h(

      "button",

      {

        class: "btn small",

        type: "button",

        on: {

          click: function () {

            var cfg = state.config || {};

            call("test_wheel_ffb", {

              guid: cfg.device_guid || null,

              strength: cfg.ffb && typeof cfg.ffb.strength === "number" ? cfg.ffb.strength : 1.0

            }).then(

              function (msg) {

                GT4.ui.toast(msg || "Force feedback test pulse sent.");

              },

              function (err) {

                GT4.ui.toast(GT4.errorText(err), true);

              }

            );

          }

        }

      },

      "Test Force Feedback"

    );



    var resetAllBtn = h(

      "button",

      {

        class: "btn danger small cx-reset-all",

        type: "button",

        on: {

          click: function () {

            call("reset_wheel_config").then(function (view) {

              applyView(view);

              GT4.ui.toast("All racing wheel settings reset to defaults.");

            });

          }

        }

      },

      "Reset all wheel settings"

    );



    var remapList = h("div", { class: "cx-remap-list" });
    var buttonMappingSection = h("section", { class: "cx-remap-section" }, [
      h("h2", {text:"Buttons and pedals"}),
      h("p", {class:"note",text:"Click a control to rebind it."}),
      remapList
    ]);

    var panel = h("aside", { class: "cx-panel", "aria-label": "Selected wheel control and settings" }, [

      selectedCard,
      buttonMappingSection,

      h("section", { class: "cx-analog" }, [

        h("h2", null, ["Wheel Profile & Device", h("small", { text: "Universal SDL3" })]),

        profileBox,

        h("h2", null, ["Live Pedals & Axes", h("small", { text: "Click to tune" })]),

        makeMeterBlock("throttle", "Throttle"),

        makeMeterBlock("brake", "Brake"),

        makeMeterBlock("clutch", "Clutch"),

        makeMeterBlock("handbrake", "Handbrake"),

        h("h2", null, ["Force Feedback", h("small", { text: "Haptics" })]),

        ffbBox,

        h("div", { class: "cx-actions" }, [testFfbBtn])

      ]),

      resetAllBtn

    ]);



    container.appendChild(stage);

    container.appendChild(panel);



    // Helper controls matching settingsRows look inside .cx-panel

    function makeToggleRow(label, current, onChange) {

      var btn = h(

        "button",

        {

          class: "btn small" + (current ? " primary" : ""),

          type: "button",

          "aria-pressed": String(!!current),

          on: {

            click: function () {

              onChange(!current);

            }

          }

        },

        current ? "On" : "Off"

      );

      return h("div", { class: "row" }, [

        h("div", { class: "k", text: label }),

        h("div", { class: "ctl" }, [btn])

      ]);

    }



    function makeSelectRow(label, options, current, onChange) {

      var sel = h(

        "select",

        {

          class: "select",

          on: {

            change: function () {

              onChange(sel.value);

            }

          }

        },

        options.map(function (opt) {

          return h("option", { value: opt.value, selected: opt.value === current ? "selected" : null, text: opt.label });

        })

      );

      return h("div", { class: "row" }, [

        h("div", { class: "k", text: label }),

        h("div", { class: "ctl" }, [sel])

      ]);

    }



    function makeSliderRow(label, min, max, step, value, unit, onChange) {

      var valSpan = h("span", { class: "val", text: value + (unit || "") });

      var input = h("input", {

        class: "slider",

        type: "range",

        min: String(min),

        max: String(max),

        step: String(step),

        value: String(value),

        on: {

          input: function () {

            valSpan.textContent = input.value + (unit || "");

          },

          change: function () {

            onChange(Number(input.value));

          }

        }

      });

      return h("div", { class: "row" }, [

        h("div", { class: "k", text: label }),

        h("div", { class: "ctl" }, [input, valSpan])

      ]);

    }



    function updateSetting(key, value) {

      return call("set_wheel_setting", { key: key, value: value }).then(applyView, function (err) {

        GT4.ui.toast(GT4.errorText(err), true);

      });

    }



    function paintSelectedCard() {

      var cfg = state.config;

      if (!cfg) {

        return;

      }

      var id = state.selected;

      var item = WHEEL_ITEMS[id] || WHEEL_ITEMS.steering;

      GT4.ui.clear(cardGlyph);

      cardGlyph.appendChild(buildItemGlyph(id));

      cardName.textContent = item.name;



      var src = "";

      if (id === "steering") {

        src = (cfg.steering && cfg.steering.source) || "";

      } else if (item.kind === "pedal") {

        src = (cfg[id] && cfg[id].source) || "";

      } else {

        var list = (cfg.buttons && cfg.buttons[id]) || [];

        src = list.join(", ");

      }



      cardState.textContent = src ? "Bound" : "Unbound";

      cardState.classList.toggle("is-changed", !!src);



      GT4.ui.clear(sourceChipSlot);

      sourceChipSlot.appendChild(

        h("span", { class: "xchip " + (src ? "kind-trigger" : "kind-none") }, shortSourceText(src.split(",")[0] || ""))

      );

      sourceChipSlot.appendChild(h("span", { class: "cx-src-t", text: longSourceText(src.split(",")[0] || "") }));



      GT4.ui.clear(selectedTuningBox);
      rebindBtn.disabled = defaultBtn.disabled = unbindBtn.disabled = id === "clutch";
      if (id === "clutch") {
        selectedTuningBox.appendChild(h("p", {class:"note", text:"GT4 has no manual clutch input. This pedal is display-only and is not sent to the game."}));
        return;
      }


      if (id === "steering" && cfg.steering) {

        var st = cfg.steering;

        // Quick rotation lock pills (270 / 360 / 540 / 720 / 900 / 1080)

        var quickRow = h(

          "div",

          { class: "cx-actions", style:"flex-wrap:wrap" },

          [270, 360, 540, 720, 900, 1080].map(function (deg) {

            var active = st.effective_degrees === deg;

            return h(

              "button",

              {

                class: "btn small" + (active ? " primary" : ""),

                type: "button",

                on: {

                  click: function () {

                    updateSetting("steering.rotation_degrees", Math.max(st.rotation_degrees, deg)).then(function () {

                      updateSetting("steering.effective_degrees", deg);

                    });

                  }

                }

              },

              deg + "°"

            );

          })

        );

        selectedTuningBox.appendChild(quickRow);

        selectedTuningBox.appendChild(

          makeSliderRow("Physical Rotation", 180, 1080, 10, st.rotation_degrees, "°", function (v) {

            updateSetting("steering.rotation_degrees", v);

          })

        );

        selectedTuningBox.appendChild(

          makeSliderRow("In-Game Lock", 180, st.rotation_degrees, 10, st.effective_degrees, "°", function (v) {

            updateSetting("steering.effective_degrees", v);

          })

        );

        selectedTuningBox.appendChild(

          makeSliderRow("Center Deadzone", 0, 25, 1, Math.round((st.deadzone || 0) * 100), "%", function (v) {

            updateSetting("steering.deadzone", v / 100);

          })

        );

        selectedTuningBox.appendChild(

          makeSelectRow(

            "Linearity",

            Object.keys(CURVE_LABELS).map(function (k) {

              return { value: k, label: CURVE_LABELS[k] };

            }),

            st.linearity || "linear",

            function (v) {

              updateSetting("steering.linearity", v);

            }

          )

        );

        selectedTuningBox.appendChild(

          makeToggleRow("Invert Steering", !!st.invert, function (v) {

            updateSetting("steering.invert", v);

          })

        );

      } else if (item.kind === "pedal" && cfg[id]) {

        var p = cfg[id];

        selectedTuningBox.appendChild(

          makeSelectRow(

            "Axis Polarity",

            Object.keys(AXIS_MODE_LABELS).map(function (k) {

              return { value: k, label: AXIS_MODE_LABELS[k] };

            }),

            p.mode || "inverted",

            function (v) {

              updateSetting(id + ".mode", v);

            }

          )

        );

        selectedTuningBox.appendChild(

          makeSliderRow("Deadzone", 0, 45, 1, Math.round((p.deadzone || 0) * 100), "%", function (v) {

            updateSetting(id + ".deadzone", v / 100);

          })

        );

        selectedTuningBox.appendChild(

          makeSliderRow("Saturation", 25, 100, 1, Math.round((p.saturation || 0.98) * 100), "%", function (v) {

            updateSetting(id + ".saturation", v / 100);

          })

        );

        selectedTuningBox.appendChild(

          makeSelectRow(

            "Curve",

            Object.keys(CURVE_LABELS).map(function (k) {

              return { value: k, label: CURVE_LABELS[k] };

            }),

            p.curve || "linear",

            function (v) {

              updateSetting(id + ".curve", v);

            }

          )

        );

      }

    }



    function paintProfileAndFfb() {

      var cfg = state.config;

      if (!cfg) {

        return;

      }

      GT4.ui.clear(profileBox);

      profileBox.appendChild(

        makeToggleRow("Enable Wheel Input", !!cfg.enabled, function (v) {

          updateSetting("wheel.enabled", v);

        })

      );



      var deviceOpts = [{ value: "", label: "Auto-detect Primary Wheel" }];

      state.devices.forEach(function (dev) {

        deviceOpts.push({

          value: dev.guid,

          label: dev.name + (dev.is_wheel ? " (Wheel)" : "")

        });

      });

      profileBox.appendChild(

        makeSelectRow("Primary Device", deviceOpts, cfg.device_guid || "", function (guid) {

          var chosen = state.devices.filter(function (d) {

            return d.guid === guid;

          })[0];

          updateSetting("wheel.device_guid", guid).then(function () {

            if (chosen) {

              updateSetting("wheel.device_name", chosen.name);

            }

          });

        })

      );



      var presetOpts = Object.keys(PRESET_LABELS).map(function (k) {

        return { value: k, label: PRESET_LABELS[k] };

      });

      profileBox.appendChild(

        makeSelectRow("Hardware Preset", presetOpts, cfg.preset || "generic", function (preset) {

          if (preset === "custom") {

            return;

          }

          call("apply_wheel_preset", { preset: preset }).then(applyView);

        })

      );



      var mapOpts = Object.keys(PEDAL_MAP_LABELS).map(function (k) {

        return { value: k, label: PEDAL_MAP_LABELS[k] };

      });

      profileBox.appendChild(

        makeSelectRow("Pedal Mapping", mapOpts, cfg.pedal_map_mode || "triggers", function (mode) {

          updateSetting("wheel.pedal_map_mode", mode);

        })

      );



      GT4.ui.clear(ffbBox);

      var ffb = cfg.ffb || {};

      ffbBox.appendChild(

        makeToggleRow("Force Feedback", !!ffb.enabled, function (v) {

          updateSetting("ffb.enabled", v);

        })

      );

      ffbBox.appendChild(

        makeSliderRow("Overall Strength", 0, 100, 5, Math.round((typeof ffb.strength === "number" ? ffb.strength : 1) * 100), "%", function (v) {

          updateSetting("ffb.strength", v / 100);

        })

      );

      ffbBox.appendChild(

        makeSliderRow("Centering Spring", 0, 100, 5, Math.round((typeof ffb.centering_spring === "number" ? ffb.centering_spring : 0.25) * 100), "%", function (v) {

          updateSetting("ffb.centering_spring", v / 100);

        })

      );

      ffbBox.appendChild(

        makeSliderRow("Damper", 0, 100, 5, Math.round((typeof ffb.damper === "number" ? ffb.damper : 0.15) * 100), "%", function (v) {

          updateSetting("ffb.damper", v / 100);

        })

      );

      ffbBox.appendChild(h("p", {class:"note", text:"Feedback uses gamepad rumble plus a centering spring and damper. Wheels with native spring/damper effects (Moza, Fanatec and other direct-drive bases) use them proportionally; others fall back to the driver's autocenter and ignore the damper. Force inversion is a reserved setting and is not active."}));
    }
    function paintButtonList() {
      var cfg = state.config;
      if (!cfg) return;
      GT4.ui.clear(remapList);

      var order = [
        "throttle", "brake", "r1", "r2", "l2", "cross", "square", "circle", "triangle",
        "l1", "handbrake", "clutch", "steering", "select", "start",
        "dpad_up", "dpad_down", "dpad_left", "dpad_right", "l3", "r3"
      ];

      order.forEach(function (id) {
        var item = WHEEL_ITEMS[id] || { name: id, kind: "button" };
        var src = "";
        if (id === "steering") {
          src = (cfg.steering && cfg.steering.source) || "";
        } else if (["throttle", "brake", "handbrake", "clutch"].indexOf(id) >= 0) {
          src = (cfg[id] && cfg[id].source) || "";
        } else {
          var list = (cfg.buttons && cfg.buttons[id]) || [];
          src = list.join(", ");
        }

        var isSel = state.selected === id;
        var row = h("div", {
          class: "cx-remap-row" + (isSel ? " is-selected" : ""),
          on: {
            click: function (ev) {
              if (ev.target.tagName !== "BUTTON") {
                onPick(id, "click");
              }
            }
          }
        });

        var left = h("div", { class: "cx-remap-left" }, [
          h("span", { class: "cx-remap-glyph" }, [buildItemGlyph(id)]),
          h("div", { class: "cx-remap-info" }, [
            h("div", { class: "cx-remap-name", text: item.name }),
            h("div", { class: "cx-remap-role", text: longSourceText(src.split(",")[0] || "") })
          ])
        ]);

        var chip = h("span", { class: "xchip " + (src ? "kind-trigger" : "kind-none") }, shortSourceText(src.split(",")[0] || ""));

        var rebind = h("button", {
          class: "btn primary small",
          type: "button",
          on: {
            click: function (ev) {
              ev.stopPropagation();
              onPick(id, "click");
              startCapture(id);
            }
          }
        }, "Rebind");

        var clear = h("button", {
          class: "btn small",
          type: "button",
          title: "Clear",
          on: {
            click: function (ev) {
              ev.stopPropagation();
              call("reset_wheel_binding", { target: id, clear: true }).then(applyView);
            }
          }
        }, "Clear");

        rebind.disabled = clear.disabled = id === "clutch";
        var actions = h("div", { class: "cx-remap-actions" }, [chip, rebind, clear]);
        row.appendChild(left);
        row.appendChild(actions);
        remapList.appendChild(row);
      });
    }




    function applyView(view) {

      if (!view || !view.config) {

        return;

      }

      state.config = view.config;

      state.buttonSlots = view.button_slots || [];

      if (view.wheel_status && Array.isArray(view.wheel_status.devices)) {

        state.devices = view.wheel_status.devices;

      }

      diagram.updateBadges(state.config);

      diagram.setSelected(state.selected);

      paintSelectedCard();
      paintButtonList();

      paintProfileAndFfb();

      updateLiveTelemetry();

    }



    function startCapture(targetId) {
      if (targetId === "clutch") return;

      if (state.capturing) {

        return;

      }

      var item = WHEEL_ITEMS[targetId] || WHEEL_ITEMS.steering;

      state.capturing = targetId;

      diagram.setCapturing(targetId);



      var promptText =

        item.kind === "steering"

          ? "Turn your steering wheel left or right past 30% travel…"

          : item.kind === "pedal"

          ? "Press and release the " + item.name + " all the way down…"

          : "Press any wheel button, paddle, H-shifter gear, or D-pad direction for " + item.name + "…";



      var done = false;

      var dialog = null;



      function finish(reason, payload) {

        if (done) {

          return;

        }

        done = true;

        state.capturing = null;

        diagram.setCapturing(null);

        GT4.capturing = false;

        GT4.cancelCapture = null;

        call("cancel_wheel_capture").catch(function () {});

        if (dialog) {

          dialog.close();

        }

        if (reason === "captured" && payload && payload.source) {

          call("assign_wheel_binding", {

            target: targetId,

            source: payload.source,

            pedalMode: payload.detected_pedal_mode || null

          }).then(

            function (view) {

              applyView(view);

              GT4.ui.toast("Bound " + item.name + " to " + longSourceText(payload.source));

            },

            function (err) {

              GT4.ui.toast(GT4.errorText(err), true);

            }

          );

        } else if (reason === "error" && payload) {

          GT4.ui.toast(GT4.errorText(payload), true);

        }

      }



      GT4.capturing = true;

      GT4.cancelCapture = function () {

        finish("cancel");

      };



      var body = h("div", { class: "cx-capture" }, [

        h("div", { class: "cx-capture-art" }, [

          h("div", { class: "cx-capture-glyph" }, [buildItemGlyph(targetId)])

        ]),

        h("div", { class: "cx-capture-text" }, [

          h("p", { class: "modal-text", text: promptText }),

          h("p", {

            class: "cx-capture-foot",

            text: "Standalone USB pedals, handbrakes, and shifters are detected automatically."

          })

        ])

      ]);



      dialog = GT4.ui.openModal({

        title: "Rebind " + item.name,

        className: "is-capture",

        body: body,

        actions: [

          {

            label: "Cancel",

            cancel: true,

            run: function () {

              finish("cancel");

            }

          }

        ],

        onClose: function () {

          finish("cancel");

        }

      });



      call("capture_wheel_binding", { target: targetId }).then(

        function (res) {

          finish("captured", res);

        },

        function (err) {

          var msg = GT4.errorText(err);

          if (msg.indexOf("cancelled") < 0) {

            finish("error", err);

          } else {

            finish("cancel");

          }

        }

      );

    }



    function updateLiveTelemetry() {

      var cfg = state.config;

      if (!cfg) {

        return;

      }

      var devices = state.liveDevices || [];

      var primaryGuid = cfg.device_guid || "";



      liveSummaryDevices.textContent = devices.length

        ? devices.length + " USB device(s) active · " + (devices[0].name || "Racing Wheel")

        : "Connect any USB wheel, pedals, or shifter";



      var rawSteer = readSourceAxis(cfg.steering && cfg.steering.source, devices, primaryGuid);

      var steerNorm = rawSteer !== null ? evalSteeringNorm(cfg.steering, rawSteer) : 0;

      var effDeg = (cfg.steering && cfg.steering.effective_degrees) || 900;

      var currentDeg = steerNorm * (effDeg * 0.5);

      liveSummaryAngle.textContent =

        "Steering: " + (currentDeg >= 0 ? "+" : "") + currentDeg.toFixed(1) + "° (" + Math.round(steerNorm * 100) + "%)";



      var pedalVals = {};

      ["throttle", "brake", "clutch", "handbrake"].forEach(function (pid) {

        var pCfg = cfg[pid] || {};

        var evalP = readPedal(pCfg, devices, primaryGuid);

        pedalVals[pid] = evalP.out;

        var m = meters[pid];

        if (m) {

          m.dz.style.setProperty("--w", Math.round((pCfg.deadzone || 0) * 100) + "%");

          m.raw.style.setProperty("--w", Math.round(evalP.raw * 100) + "%");

          m.out.style.setProperty("--w", Math.round(evalP.out * 100) + "%");

          m.value.textContent = Math.round(evalP.out * 100) + "%";

        }

      });



      var activeButtons = {};
      Object.keys(cfg.buttons || {}).forEach(function (slotId) {
        if (cfg.buttons[slotId].some(function (src) { return sourcePressed(src, devices, primaryGuid); })) activeButtons[slotId] = true;
      });

      diagram.updateLive(currentDeg, pedalVals, activeButtons);

    }



    GT4.backend.listen("wheel-status", function (payload) {

      if (payload && Array.isArray(payload.devices)) {

        state.devices = payload.devices;
        if (!state.devices.length) { state.liveDevices = []; updateLiveTelemetry(); }

        paintProfileAndFfb();

      }

    });



    GT4.backend.listen("wheel-live", function (payload) {

      if (payload && Array.isArray(payload.devices)) {

        state.liveDevices = payload.devices;

        updateLiveTelemetry();

      }

    });



    call("get_wheel_config").then(applyView, function (err) {

      GT4.ui.toast(GT4.errorText(err), true);

    });

  };

})(window);

# Configurable racing-wheel inputs (TASK-018)

The launcher offers **Controls > Racing Wheel** for SDL3 joystick devices: steering, throttle,
brake, handbrake, paddles and existing gamepad-button actions. Input is disabled on a fresh
configuration. Enable it deliberately and select or calibrate the intended device.

## Device selection and capture

Automatic primary selection requires the SDL wheel type, a specific wheel/model name, or an exact
wheelbase USB model (vendor + product ID). A manufacturer ID, number of axes or generic HID
classification alone does not identify a wheel.

Moza bases (USB vendor 0x346E, Gudsen) report names such as `MOZA R9 Base`, which match no wheel
name. SDL 3.4 types R3/R5/R9/R12/R16/R21 product IDs 0x0000/0x0002/0x0004/0x0005/0x0006 as wheels; the
same bases on newer firmware use 0x0010/0x0012/0x0014/0x0015/0x0016 (Linux `drivers/hid/hid-ids.h`,
`USB_DEVICE_ID_MOZA_*`), which SDL does not type. Both sets are recognized by exact model. Moza pedals,
shifters and handbrakes stay auxiliary devices. Earlier builds listed Moza as vendor 0x1209, which is the
shared pid.codes vendor, not Moza.
An unknown device can be selected explicitly. Standalone pedals and shifters can provide auxiliary
bindings without becoming the primary wheel automatically.

Capture stores sources such as `axis:0`, `btn:4`, `hat:0:up` or
`dev:030000006d0400004fc2000000000000:axis:1`. The GUID-qualified form keeps a separate USB pedal
or shifter associated with its physical device, including when primary selection is automatic.
A missing or ambiguous explicit GUID is neutral. Devices sharing the same GUID cannot be uniquely
configured together with this schema; there is no serial-number identity extension yet.

When an enabled wheel owns a device, that device is excluded from the ordinary gamepad path to
prevent duplicated pedal/button input. Independent gamepads and the keyboard remain available.
If `GT4_INPUT=xinput` cannot correlate wheel ownership reliably by SDL instance identity, the
runtime logs an SDL routing fallback while wheel-owned devices exist and restores the requested
backend when ownership ends.

## Profiles and calibration

Profiles are configuration templates, not a hardware compatibility certification:
`generic`, `hori`, `logitech_g29`, `logitech_dfgt`, `thrustmaster`, `fanatec_moza`, `combined_pedals`.
Actual axes and buttons depend on the driver and device mode; inspect the live readings and capture
bindings rather than assuming a preset proves physical compatibility.

- Steering: physical and effective rotation 180..1080 degrees, center deadzone 0..0.45,
  linear/quadratic/cubic response, sensitivity 0.25..2.5 and direction inversion.
- Pedals: deadzone and saturation, linear/quadratic/cubic response, independent source selection.
- Pedal mapping: `cross_square` (default), `rstick_y`, `l2_r2`, or `both`. Select the mapping matching
  the game's controller settings; the default keeps gear changes on the configured L2/R2 buttons.
- Raw joystick pedal polarity: `inverted` (+32767 to -32768), `normal` (-32768 to +32767),
  `positive`/`combined_positive` (0 to +32767), or `combined_negative` (0 to -32768).
  These raw joystick ranges differ from SDL Gamepad's already-normalized trigger range.

The launcher writes `wheel.toml` in its user data folder and passes its explicit path in
`GT4_WHEEL_FILE`. Without that variable the native runtime does not search APPDATA or enable a
wheel implicitly. Example excerpt (the launcher writes every remaining setting):

```toml
version = 1
[wheel]
enabled = true
preset = "generic"
device_guid = ""
device_name = ""
pedal_map_mode = "cross_square"
[steering]
source = "axis:0"
rotation_degrees = 900
effective_degrees = 900
deadzone = 0.0
linearity = "linear"
sensitivity = 1.0
invert = false
[throttle]
source = "axis:1"
mode = "inverted"
deadzone = 0.02
saturation = 0.98
curve = "linear"
[ffb]
enabled = false
```

## Feedback and current limits

Feedback adapts the game's existing gamepad rumble to SDL haptic rumble/joystick rumble, plus a
centering spring and damper. When the wheel exposes SDL `SDL_HAPTIC_SPRING`/`SDL_HAPTIC_DAMPER`
condition effects (Moza, Fanatec and other direct-drive bases through DirectInput), the spring and
damper run as proportional condition effects scaled by the master strength through the device gain.
Otherwise the spring falls back to driver autocenter, which DirectInput exposes only as on/off at the
driver's own strength, and the damper has no effect. It does not implement the PS2 wheel force-feedback
protocol or derive steering torque from vehicle physics. Master strength zero produces no force.
Focus loss, disconnect and shutdown stop autocenter, gain, effects and rumble. The test pulse is a
deliberate, bounded launcher action for a connected selected device; an absent explicit device
never redirects the test to another controller.

Feedback inversion remains a reserved file field without a native effect and has no active UI
adjustment. The clutch is display-only: GT4's existing gamepad input has no manual-clutch
signal. H-pattern hardware can bind existing gamepad actions; direct gear selection is not added.

Automated acceptance uses owned virtual SDL devices and a fake haptic command sink, plus parser,
mapping, UI telemetry and actual UI-command replay fixtures. It does not establish physical USB/
Bluetooth behavior, pedal feel or force-feedback quality on the listed manufacturers. Physical
hardware acceptance remains a separate owner test.

## Integration and release scope

The reviewed contribution targets the stable **1.2.5** line after 1.2.4. It preserves the earlier
controller curves and RetroAchievements fixes. A later port is planned for **1.3.0-rc7**, preserving
frame skipping and keeping RetroAchievements disabled for Spec II. No published release asset is
replaced by the source integration.

## Native DFP direction (owner, 2026-10-26)

This document describes the existing adapted-input subset, not the intended final native wheel
system. The guest reference is **Driving Force Pro (DFP)**, not Driving Force GT (DFGT). Existing
physical-device preset names such as `logitech_dfgt` remain valid and are not renamed.
Native DFP recognition, 900-degree steering and game-generated force feedback bridged to SDL3
are planned for **1.3.1**, after research in TASK-123. 1.3.0 remains focused on Spec II/performance.
The owner holds the 1.2.5 draft from publication. The earlier forward-port wording above is not
a requirement to expose adapted wheel input in rc7; reusable components need the native plan's review.
See [research brief](tasks/TASK-123-DFP-WHEEL-RESEARCH.md).

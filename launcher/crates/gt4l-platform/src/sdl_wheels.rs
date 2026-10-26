//! Universal racing wheel and multi-USB joystick enumeration, live state reading, smart axis/button capture,
//! and SDL3 Haptic / rumble Force Feedback test trigger (TASK-018).

use gt4l_core::wheel::detect_pedal_axis_mode;

/// Summary of one connected SDL joystick or racing wheel device.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WheelDeviceInfo {
    pub id: u32,
    pub guid: String,
    pub name: String,
    pub is_wheel: bool,
    pub is_gamepad: bool,
    pub num_axes: u32,
    pub num_buttons: u32,
    pub num_hats: u32,
    pub has_ffb: bool,
}

/// Live raw state of one connected SDL joystick or racing wheel.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RawWheelDeviceState {
    pub id: u32,
    pub guid: String,
    pub name: String,
    pub is_wheel: bool,
    pub is_gamepad: bool,
    pub axes: Vec<i16>,
    pub buttons: Vec<bool>,
    pub hats: Vec<u8>,
}

/// Result of capturing a wheel axis, pedal, button, or hat switch in the Launcher UI.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CapturedWheelInput {
    pub source: String,
    pub detected_pedal_mode: Option<String>,
    pub device_name: String,
}

/// Extracts (Vendor ID, Product ID) from an SDL 32-character hex GUID string.
pub fn parse_guid_vid_pid(guid: &str) -> Option<(u16, u16)> {
    if guid.len() != 32 || !guid.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return None;
    }
    let vid_b0 = u8::from_str_radix(&guid[8..10], 16).ok()?;
    let vid_b1 = u8::from_str_radix(&guid[10..12], 16).ok()?;
    let pid_b0 = u8::from_str_radix(&guid[16..18], 16).ok()?;
    let pid_b1 = u8::from_str_radix(&guid[18..20], 16).ok()?;
    let vid = ((vid_b1 as u16) << 8) | (vid_b0 as u16);
    let pid = ((pid_b1 as u16) << 8) | (pid_b0 as u16);
    Some((vid, pid))
}

pub fn is_wheel_vendor(vid: u16) -> bool {
    matches!(
        vid,
        0x0F0D // HORI
        | 0x046D // Logitech
        | 0x044F // Thrustmaster
        | 0x0EB7 // Fanatec
        | 0x346E // Moza (Gudsen)
        | 0x3416 // Cammus
        | 0x16D0 // SimuCube
    )
}

/// Exact wheelbase models identified by USB vendor + product ID (Moza, from Linux `hid-ids.h`).
/// SDL 3.4 types only the first ID of each pair as a wheel; the second is the same base on newer firmware.
pub fn is_known_wheelbase_model(vid: u16, pid: u16) -> bool {
    vid == 0x346E
        && matches!(
            pid,
            0x0000 | 0x0010 // R16 / R21
            | 0x0002 | 0x0012 // R9
            | 0x0004 | 0x0014 // R5
            | 0x0005 | 0x0015 // R3
            | 0x0006 | 0x0016 // R12
        )
}

pub fn format_friendly_device_name(name: &str, guid: &str) -> String {
    if !is_candidate_wheel(false, false, name, guid) { return name.to_string(); }
    if let Some((vid, pid)) = parse_guid_vid_pid(guid) {
        if vid == 0x0F0D {
            if pid == 0x00A4 {
                return format!("HORI Racing Wheel Apex ({name})");
            }
            return format!("HORI Racing Wheel ({name})");
        } else if vid == 0x046D {
            return format!("Logitech Wheel ({name})");
        } else if vid == 0x044F {
            return format!("Thrustmaster Wheel ({name})");
        } else if vid == 0x0EB7 {
            return format!("Fanatec Wheel ({name})");
        } else if vid == 0x346E && !name.to_ascii_lowercase().contains("moza") {
            return format!("Moza Wheel ({name})");
        }
    }
    name.to_string()
}

/// SDL wheel types and specific model names are candidates; generic HID/gamepads need explicit selection.
pub fn is_candidate_wheel(sdl_is_wheel: bool, _sdl_is_gamepad: bool, name: &str, guid: &str) -> bool {
    if sdl_is_wheel { return true; }
    // A vendor alone does not establish wheel identity; an exact wheelbase model does.
    if parse_guid_vid_pid(guid).is_some_and(|(vid, pid)| is_known_wheelbase_model(vid, pid)) { return true; }
    let lower = name.to_ascii_lowercase();
    if ["pedal", "shifter", "handbrake"].iter().any(|word| lower.contains(word)) { return false; }
    ["wheel", "driving force", "g29", "g920", "g923", "g27", "g25", "t150", "t248", "t300", "t500", "t-gt", "apex", "overdrive", "racing base", "wheelbase"]
        .iter().any(|word| lower.contains(word))
}

/// Resolves which connected device is the active primary wheel for `device_guid`.
pub fn select_primary_wheel_device<'a>(
    device_guid: &str,
    devices: &'a [WheelDeviceInfo],
) -> Option<&'a WheelDeviceInfo> {
    if !device_guid.is_empty() {
        let target = device_guid.to_ascii_lowercase();
        let mut matches = devices.iter().filter(|d| d.guid.to_ascii_lowercase() == target);
        let first = matches.next()?;
        return if matches.next().is_none() { Some(first) } else { None };
    }
    devices
        .iter()
        .find(|d| d.is_wheel)
}

/// Add neutral starting samples for devices connected after the capture dialog opened.
pub fn extend_wheel_capture_baseline(baseline: &mut Vec<RawWheelDeviceState>, current: &[RawWheelDeviceState]) {
    for device in current {
        if !baseline.iter().any(|old| old.id == device.id) { baseline.push(device.clone()); }
    }
}

/// Compares `current` device readings against `baseline` (recorded when the user clicked "Bind")
/// and returns a `CapturedWheelInput` once a clear axis motion, pedal press, button press, or hat press occurs.
pub fn detect_wheel_capture(
    baseline: &[RawWheelDeviceState],
    current: &[RawWheelDeviceState],
    _primary_guid: &str,
    target: &str,
) -> Option<CapturedWheelInput> {
    let is_steering = target == "steering";
    let is_pedal = matches!(target, "throttle" | "brake" | "handbrake" | "clutch");

    for cur_dev in current {
        let Some(base_dev) = baseline.iter().find(|b| b.id == cur_dev.id) else { continue; };
        // Persist physical identity even with Auto detect, so auxiliary pedals cannot become primary axes.
        if cur_dev.guid.is_empty() || current.iter().filter(|d| d.guid.eq_ignore_ascii_case(&cur_dev.guid)).count() != 1 { continue; }
        let prefix = format!("dev:{}:", cur_dev.guid.to_ascii_lowercase());

        // 1. Axis motion check for steering and pedals:
        if is_steering || is_pedal {
            for (axis_idx, &cur_val) in cur_dev.axes.iter().enumerate() {
                let base_val = base_dev.axes.get(axis_idx).copied().unwrap_or(0);
                let delta = (cur_val as i32 - base_val as i32).abs();
                if delta >= 11000 {
                    let pedal_mode = if is_pedal {
                        Some(detect_pedal_axis_mode(base_val, cur_val).to_string())
                    } else {
                        None
                    };
                    return Some(CapturedWheelInput {
                        source: format!("{prefix}axis:{axis_idx}"),
                        detected_pedal_mode: pedal_mode,
                        device_name: cur_dev.name.clone(),
                    });
                }
            }
            if is_steering {
                continue;
            }
        }

        // 2. Button press check (for button slots or digital pedals):
        for (btn_idx, &cur_pressed) in cur_dev.buttons.iter().enumerate() {
            let was_pressed = base_dev.buttons.get(btn_idx).copied().unwrap_or(false);
            if cur_pressed && !was_pressed {
                return Some(CapturedWheelInput {
                    source: format!("{prefix}btn:{btn_idx}"),
                    detected_pedal_mode: None,
                    device_name: cur_dev.name.clone(),
                });
            }
        }

        // 3. Hat switch check (for button slots):
        if !is_pedal {
            for (hat_idx, &cur_hat) in cur_dev.hats.iter().enumerate() {
                let base_hat = base_dev.hats.get(hat_idx).copied().unwrap_or(0);
                if cur_hat != 0 && cur_hat != base_hat {
                    let dir = if (cur_hat & 0x01) != 0 {
                        Some("up")
                    } else if (cur_hat & 0x02) != 0 {
                        Some("right")
                    } else if (cur_hat & 0x04) != 0 {
                        Some("down")
                    } else if (cur_hat & 0x08) != 0 {
                        Some("left")
                    } else {
                        None
                    };
                    if let Some(dir_name) = dir {
                        return Some(CapturedWheelInput {
                            source: format!("{prefix}hat:{hat_idx}:{dir_name}"),
                            detected_pedal_mode: None,
                            device_name: cur_dev.name.clone(),
                        });
                    }
                }
            }

            // 4. Axis motion check for button slots (analog paddles or triggers):
            for (axis_idx, &cur_val) in cur_dev.axes.iter().enumerate() {
                let base_val = base_dev.axes.get(axis_idx).copied().unwrap_or(0);
                let delta = (cur_val as i32 - base_val as i32).abs();
                if delta >= 18000 {
                    return Some(CapturedWheelInput {
                        source: format!("{prefix}axis:{axis_idx}{}", if cur_val < 0 { "-" } else { "+" }),
                        detected_pedal_mode: None,
                        device_name: cur_dev.name.clone(),
                    });
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capture_detects_inverted_and_normal_pedals_and_multi_device_buttons() {
        let base = vec![
            RawWheelDeviceState {
                id: 1,
                guid: "030000006d0400004fc2000000000000".into(),
                name: "Logitech G29".into(),
                is_wheel: true,
                is_gamepad: false,
                axes: vec![0, 32767, 32767],
                buttons: vec![false; 12],
                hats: vec![0],
            },
            RawWheelDeviceState {
                id: 2,
                guid: "030000004f04000060b6000000000000".into(),
                name: "USB Shifter".into(),
                is_wheel: false,
                is_gamepad: false,
                axes: vec![],
                buttons: vec![false; 8],
                hats: vec![],
            },
        ];

        // Press inverted throttle on axis 1 of primary wheel:
        let mut cur = base.clone();
        cur[0].axes[1] = -20000;
        let cap = detect_wheel_capture(&base, &cur, "030000006d0400004fc2000000000000", "throttle")
            .expect("captured throttle");
        assert_eq!(cap.source, "dev:030000006d0400004fc2000000000000:axis:1");
        assert_eq!(cap.detected_pedal_mode.as_deref(), Some("inverted"));

        // Press button 3 on external USB Shifter:
        let mut cur_btn = base.clone();
        cur_btn[1].buttons[3] = true;
        let cap_btn =
            detect_wheel_capture(&base, &cur_btn, "030000006d0400004fc2000000000000", "r2")
                .expect("captured external shifter button");
        assert_eq!(
            cap_btn.source,
            "dev:030000004f04000060b6000000000000:btn:3"
        );
    }
    #[test]
    fn auto_capture_is_guid_bound_and_hotplug_does_not_block_known_devices() {
        let known = RawWheelDeviceState { id: 2, guid: "wheel-guid".into(), name: "Wheel".into(), is_wheel: true,
            is_gamepad: false, axes: vec![0], buttons: vec![false], hats: vec![0] };
        let unknown = RawWheelDeviceState { id: 1, guid: "pedal-guid".into(), name: "Pedals".into(),
            axes: vec![32767], ..known.clone() };
        let mut baseline = vec![known.clone()];
        let mut moved = known.clone(); moved.axes[0] = 20000;
        let current = vec![unknown.clone(), moved];
        assert_eq!(detect_wheel_capture(&baseline, &current, "", "steering").unwrap().source, "dev:wheel-guid:axis:0");
        extend_wheel_capture_baseline(&mut baseline, &current);
        let mut pressed = current.clone(); pressed[0].axes[0] = -32768;
        assert_eq!(detect_wheel_capture(&baseline, &pressed, "", "throttle").unwrap().source, "dev:pedal-guid:axis:0");
        let mut buttons = baseline.clone(); buttons[0].buttons[0] = true;
        assert!(detect_wheel_capture(&baseline, &buttons, "", "r2").unwrap().source.starts_with("dev:"));
    }

    #[test]
    fn explicit_disconnected_ffb_target_never_falls_back_to_another_device() {
        let device = WheelDeviceInfo { id: 1, guid: "connected".into(), name: "Other wheel".into(),
            is_wheel: true, is_gamepad: false, num_axes: 3, num_buttons: 4, num_hats: 0, has_ffb: true };
        assert!(select_primary_wheel_device("disconnected", &[device.clone()]).is_none());
        assert_eq!(select_primary_wheel_device("", &[device]).unwrap().id, 1);
    }

    #[test]
    fn vendor_and_axis_count_do_not_turn_gamepads_or_auxiliaries_into_wheels() {
        let guid = "030000006d0400001dc2000000000000";
        assert!(!is_candidate_wheel(false, true, "Logitech USB Gamepad", guid));
        assert!(!is_candidate_wheel(false, false, "Thrustmaster T.16000M", guid));
        assert!(!is_candidate_wheel(false, false, "USB Pedals", guid));
        assert!(is_candidate_wheel(false, true, "HORI Racing Wheel Apex", guid));
        assert_eq!(format_friendly_device_name("Logitech USB Gamepad", guid), "Logitech USB Gamepad");
        assert_eq!(parse_guid_vid_pid(guid), Some((0x046d, 0xc21d)));
        for invalid in ["", "12345678901234567890", "0000000é000000000000000000000000", "zz0000006d0400001dc2000000000000"] {
            assert_eq!(parse_guid_vid_pid(invalid), None);
        }
    }

    #[test]
    fn moza_wheelbases_are_recognized_by_exact_model() {
        let r9_new_firmware = "030000006e3400001200000000000000";
        assert_eq!(parse_guid_vid_pid(r9_new_firmware), Some((0x346e, 0x0012)));
        assert!(is_candidate_wheel(false, false, "MOZA R9 Base", r9_new_firmware));
        assert_eq!(format_friendly_device_name("MOZA R9 Base", r9_new_firmware), "MOZA R9 Base");
        assert!(!is_candidate_wheel(false, false, "MOZA SR-P Pedals", "030000006e3400000300000000000000"));
        assert!(!is_candidate_wheel(false, false, "Pico device", "03000000091200000200000000000000"));
        assert!(is_wheel_vendor(0x346e) && !is_wheel_vendor(0x1209));
    }

    #[test]
    fn explicit_duplicate_guids_are_ambiguous_and_never_an_ffb_target() {
        let d = WheelDeviceInfo { id: 1, guid: "same".into(), name: "Wheel".into(), is_wheel: true,
            is_gamepad: false, num_axes: 3, num_buttons: 4, num_hats: 0, has_ffb: false };
        let other = WheelDeviceInfo { id: 2, ..d.clone() };
        assert!(select_primary_wheel_device("same", &[d, other]).is_none());
    }

}

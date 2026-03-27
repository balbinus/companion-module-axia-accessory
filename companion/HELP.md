## Axia Accessory Module

This module acts as an Axia Accessory Module, communicating with Axia Livewire consoles (QOR.16, QOR.32, Studio Engine, PowerStation, Quasar) over UDP multicast.

### Configuration

- **Interface IP**: The network interface to join the multicast group on. Use `0.0.0.0` for the system default.
- **Console IP** (optional): If set, only messages from this IP address will be accepted. Leave empty to listen to all sources on the multicast group.
- **Console Model** (optional): Select your console model to get a pre-defined list of internal sources in action/feedback dropdowns. If not set, only custom Livewire channel numbers can be used.

### Actions

- **Button Down**: Sends a button-down event for a given source and button (ON, OFF, MUTE, TALK).
- **Button Up**: Sends a button-up event for a given source and button.
- **Button Press (Down + Up)**: Sends a button-down event followed by a button-up event after a configurable delay.

### Feedbacks

- **Lamp State**: A boolean feedback that is true when the selected lamp (ON, OFF, MUTE, TALK) on a given source matches the selected state (ON or OFF). Useful for lighting up buttons based on console lamp states.

### Variables

For each known source (internal or dynamically discovered), the following variables are exposed:

- `ch_<id>_lmp_on` — ON lamp state
- `ch_<id>_lmp_off` — OFF lamp state
- `ch_<id>_lmp_mute` — MUTE lamp state
- `ch_<id>_lmp_talk` — TALK lamp state
- `ch_<id>_dsp_hptext` — Display text

### Presets

When a console model with internal sources is selected, presets are automatically generated for each source and button type (ON, OFF, MUTE, TALK) with matching feedbacks.

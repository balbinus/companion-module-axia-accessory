## Axia Accessory Module

This module acts as an Axia Accessory Module, communicating with Axia Livewire consoles (QOR.16, QOR.32, Studio Engine, PowerStation, Quasar) over UDP multicast.

### Configuration

- **Interface IP**: The network interface to join the multicast group on. Use `0.0.0.0` for the system default.
- **Console IP** (optional): If set, only messages from this IP address will be accepted. Leave empty to listen to all sources on the multicast group.
- **Console Model** (optional): Select your console model to get a pre-defined list of internal sources in action/feedback dropdowns. If not set, only custom Livewire channel numbers can be used.

### Actions

- **Button Down**: Sends a button-down event for a given source and button (ON, OFF, MUTE, TALK, Headphone Preset 1, Headphone Preset 2, Headphone Select).
- **Button Up**: Sends a button-up event for a given source and button.
- **Button Press (Down + Up)**: Sends a button-down event followed by a button-up event after a configurable delay (50-1000 ms).
- **Headphone Select Rotate**: Sends a rotary event (`>` or `<`) for the headphone select control of a given source.

### Feedbacks

- **Lamp State**: A boolean feedback that is true when the selected lamp (ON, OFF, MUTE, TALK, Headphone Preset 1, Headphone Preset 2) on a given source matches the selected state (ON or OFF). Useful for lighting up buttons based on console lamp states.

### Variables

For each known source (internal or dynamically discovered), the following variables are exposed:

- `ch_<id>_lmp_on` — ON lamp state
- `ch_<id>_lmp_off` — OFF lamp state
- `ch_<id>_lmp_mute` — MUTE lamp state
- `ch_<id>_lmp_talk` — TALK lamp state
- `ch_<id>_lmp_hp_pset1` — HEADPHONE PRESET 1 lamp state
- `ch_<id>_lmp_hp_pset2` — HEADPHONE PRESET 2 lamp state
- `ch_<id>_dsp_hptext` — Display text
- `ch_<id>_dsp_hpvol` — Volume (0-100)
- `ch_<id>_dsp_hpsource` — Headphone feed source

### Presets

Presets are generated for each button type (ON, OFF, MUTE, TALK, headphone presets) with matching feedbacks, plus a headphone select button (push and rotary). When a console model with internal sources is selected, these are generated for each fixed source. The **Livewire Channel** presets, which target any Livewire channel number, are always generated.

Each Livewire Channel button has a `channel` local variable (default 1): after adding a button, open its local variables and change `channel` to retarget the whole button (its actions, feedbacks and text) to another channel. The headphone display text of a retargeted button appears once that channel has sent its first message to the module, since a channel's variables are created on its first message.

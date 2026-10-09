import type { CompanionVariableDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ChannelState } from './main.js'
import { getFixedSources, channelLabel, channelVarPrefix, DEFAULT_PRESET_CHANNEL } from './sources.js'

/** The state of a channel that hasn't sent anything yet */
export function createChannelState(): ChannelState {
	return {
		LMP_ON: false,
		LMP_OFF: false,
		LMP_MUTE: false,
		LMP_TALK: false,
		DSP_HPtext: '',
		DSP_HPvol: 0,
		DSP_HPsource: '',
		LMP_HPpset1: false,
		LMP_HPpset2: false,
	}
}

function getAllChannels(self: ModuleInstance): Set<number> {
	const allChannels = new Set<number>()

	// Fixed sources from console model
	for (const source of getFixedSources(self.config.consoleModel)) {
		allChannels.add(source.id)
	}

	// The channel used by the example preset's default `channel` local variable, so
	// that its variables always exist
	allChannels.add(DEFAULT_PRESET_CHANNEL)

	// Dynamically discovered channels
	for (const channelId of self.channelStates.keys()) {
		allChannels.add(channelId)
	}

	return allChannels
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const variables: CompanionVariableDefinitions = {}

	for (const channelId of getAllChannels(self)) {
		const label = channelLabel(channelId, self.config.consoleModel)
		const prefix = channelVarPrefix(channelId)
		variables[`${prefix}_lmp_on`] = { name: `${label} - ON Lamp` }
		variables[`${prefix}_lmp_off`] = { name: `${label} - OFF Lamp` }
		variables[`${prefix}_lmp_mute`] = { name: `${label} - MUTE Lamp` }
		variables[`${prefix}_lmp_talk`] = { name: `${label} - TALK Lamp` }
		variables[`${prefix}_dsp_hptext`] = { name: `${label} - Display Text` }
		variables[`${prefix}_dsp_hpvol`] = { name: `${label} - HP Volume` }
		variables[`${prefix}_dsp_hpsource`] = { name: `${label} - HP Source` }
		variables[`${prefix}_lmp_hp_pset1`] = { name: `${label} - Headphone Preset 1 Lamp` }
		variables[`${prefix}_lmp_hp_pset2`] = { name: `${label} - Headphone Preset 2 Lamp` }
	}

	self.setVariableDefinitions(variables)

	// Channels that haven't sent anything yet get default values
	updateVariableValues(self)
}

export function updateVariableValues(self: ModuleInstance): void {
	const values: Record<string, string | undefined> = {}

	for (const channelId of getAllChannels(self)) {
		const state = self.channelStates.get(channelId) ?? createChannelState()
		const prefix = channelVarPrefix(channelId)
		values[`${prefix}_lmp_on`] = state.LMP_ON ? 'ON' : 'OFF'
		values[`${prefix}_lmp_off`] = state.LMP_OFF ? 'ON' : 'OFF'
		values[`${prefix}_lmp_mute`] = state.LMP_MUTE ? 'ON' : 'OFF'
		values[`${prefix}_lmp_talk`] = state.LMP_TALK ? 'ON' : 'OFF'
		values[`${prefix}_dsp_hptext`] = state.DSP_HPtext
		values[`${prefix}_dsp_hpvol`] = state.DSP_HPvol.toString()
		values[`${prefix}_dsp_hpsource`] = state.DSP_HPsource
		values[`${prefix}_lmp_hp_pset1`] = state.LMP_HPpset1 ? 'ON' : 'OFF'
		values[`${prefix}_lmp_hp_pset2`] = state.LMP_HPpset2 ? 'ON' : 'OFF'
	}

	self.setVariableValues(values)
}

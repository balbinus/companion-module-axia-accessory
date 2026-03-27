import type { CompanionVariableDefinition } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { getFixedSources, channelLabel, channelVarPrefix } from './sources.js'

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const variables: CompanionVariableDefinition[] = []
	const allChannels = new Set<number>()

	// Fixed sources from console model
	for (const source of getFixedSources(self.config.consoleModel)) {
		allChannels.add(source.id)
	}

	// Dynamically discovered channels
	for (const channelId of self.channelStates.keys()) {
		allChannels.add(channelId)
	}

	for (const channelId of allChannels) {
		const label = channelLabel(channelId, self.config.consoleModel)
		const prefix = channelVarPrefix(channelId)
		variables.push(
			{ variableId: `${prefix}_lmp_on`, name: `${label} - ON Lamp` },
			{ variableId: `${prefix}_lmp_off`, name: `${label} - OFF Lamp` },
			{ variableId: `${prefix}_lmp_mute`, name: `${label} - MUTE Lamp` },
			{ variableId: `${prefix}_lmp_talk`, name: `${label} - TALK Lamp` },
			{ variableId: `${prefix}_dsp_hptext`, name: `${label} - Display Text` },
		)
	}

	self.setVariableDefinitions(variables)
}

export function updateVariableValues(self: ModuleInstance): void {
	const values: Record<string, string | undefined> = {}

	for (const [channelId, state] of self.channelStates) {
		const prefix = channelVarPrefix(channelId)
		values[`${prefix}_lmp_on`] = state.LMP_ON ? 'ON' : 'OFF'
		values[`${prefix}_lmp_off`] = state.LMP_OFF ? 'ON' : 'OFF'
		values[`${prefix}_lmp_mute`] = state.LMP_MUTE ? 'ON' : 'OFF'
		values[`${prefix}_lmp_talk`] = state.LMP_TALK ? 'ON' : 'OFF'
		values[`${prefix}_dsp_hptext`] = state.DSP_HPtext
	}

	self.setVariableValues(values)
}

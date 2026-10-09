import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { getSourceChoices, resolveChannelId, MAX_CUSTOM_CHANNEL } from './sources.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	const sourceChoices = getSourceChoices(self.config.consoleModel)
	const defaultSource = sourceChoices.length > 1 ? sourceChoices[0].id : 'custom'

	self.setFeedbackDefinitions({
		lamp_state: {
			name: 'Lamp State',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'source',
					type: 'dropdown',
					label: 'Source',
					default: defaultSource,
					choices: sourceChoices,
					// needed so that isVisibleExpression can reference this field
					disableAutoExpression: true,
				},
				{
					id: 'customChannel',
					type: 'number',
					label: 'Livewire Channel Number',
					default: 1,
					min: 0,
					max: MAX_CUSTOM_CHANNEL,
					asInteger: true,
					isVisibleExpression: '$(options:source) == "custom"',
				},
				{
					id: 'lamp',
					type: 'dropdown',
					label: 'Lamp',
					default: 'LMP_ON',
					choices: [
						{ id: 'LMP_ON', label: 'ON' },
						{ id: 'LMP_OFF', label: 'OFF' },
						{ id: 'LMP_MUTE', label: 'MUTE' },
						{ id: 'LMP_TALK', label: 'TALK' },
						{ id: 'LMP_HPpset1', label: 'Headphone Preset 1' },
						{ id: 'LMP_HPpset2', label: 'Headphone Preset 2' },
					],
				},
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'ON',
					choices: [
						{ id: 'ON', label: 'ON' },
						{ id: 'OFF', label: 'OFF' },
					],
				},
			],
			callback: (feedback) => {
				const channelId = resolveChannelId(feedback.options)

				const state = self.channelStates.get(channelId)
				if (!state) return false

				const expected = feedback.options.state === 'ON'

				switch (feedback.options.lamp) {
					case 'LMP_ON':
						return state.LMP_ON === expected
					case 'LMP_OFF':
						return state.LMP_OFF === expected
					case 'LMP_MUTE':
						return state.LMP_MUTE === expected
					case 'LMP_TALK':
						return state.LMP_TALK === expected
					case 'LMP_HPpset1':
						return state.LMP_HPpset1 === expected
					case 'LMP_HPpset2':
						return state.LMP_HPpset2 === expected
					default:
						return false
				}
			},
		},
	})
}

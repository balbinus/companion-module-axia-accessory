import type { SomeCompanionActionInputField } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ChannelOptions } from './types.js'
import { getSourceChoices, resolveChannelId, MAX_CUSTOM_CHANNEL } from './sources.js'

export function UpdateActions(self: ModuleInstance): void {
	const sourceChoices = getSourceChoices(self.config.consoleModel)
	const defaultSource = sourceChoices.length > 1 ? sourceChoices[0].id : 'custom'

	const channelOptions: SomeCompanionActionInputField<keyof ChannelOptions>[] = [
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
	]

	const buttonChoices = [
		{ id: 'BTN_ON', label: 'ON' },
		{ id: 'BTN_OFF', label: 'OFF' },
		{ id: 'BTN_MUTE', label: 'MUTE' },
		{ id: 'BTN_TALK', label: 'TALK' },
		{ id: 'BTN_HPpset1', label: 'Headphone Preset 1' },
		{ id: 'BTN_HPpset2', label: 'Headphone Preset 2' },
		{ id: 'BTN_HPsel', label: 'Headphone Select' },
	]

	self.setActionDefinitions({
		button_down: {
			name: 'Button Down',
			options: [
				...channelOptions,
				{
					id: 'button',
					type: 'dropdown',
					label: 'Button',
					default: 'BTN_TALK',
					choices: buttonChoices,
				},
			],
			callback: async (event) => {
				const channelId = resolveChannelId(event.options)
				const button = event.options.button
				self.sendCommand(channelId, button, 'DOWN')
			},
		},

		button_up: {
			name: 'Button Up',
			options: [
				...channelOptions,
				{
					id: 'button',
					type: 'dropdown',
					label: 'Button',
					default: 'BTN_TALK',
					choices: buttonChoices,
				},
			],
			callback: async (event) => {
				const channelId = resolveChannelId(event.options)
				const button = event.options.button
				self.sendCommand(channelId, button, 'UP')
			},
		},

		button_press: {
			name: 'Button Press (Down + Up)',
			options: [
				...channelOptions,
				{
					id: 'button',
					type: 'dropdown',
					label: 'Button',
					default: 'BTN_TALK',
					choices: buttonChoices,
				},
				{
					id: 'delay',
					type: 'number',
					label: 'Delay between down and up (ms)',
					default: 100,
					min: 50,
					max: 1000,
					asInteger: true,
					clampValues: true,
				},
			],
			callback: async (event) => {
				const channelId = resolveChannelId(event.options)
				const button = event.options.button
				const delay = event.options.delay
				self.sendCommand(channelId, button, 'DOWN')
				setTimeout(() => {
					self.sendCommand(channelId, button, 'UP')
				}, delay)
			},
		},

		hp_sel_rot: {
			name: 'Headphone Select Rotate',
			options: [
				...channelOptions,
				{
					id: 'direction',
					type: 'dropdown',
					label: 'Direction',
					default: '+1',
					choices: [
						{ id: '+1', label: '>' },
						{ id: '-1', label: '<' },
					],
				},
			],
			callback: async (event) => {
				const channelId = resolveChannelId(event.options)
				const direction = event.options.direction
				self.sendCommand(channelId, 'ROT_HPsel', direction)
			},
		},
	})
}

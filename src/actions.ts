import type { ModuleInstance } from './main.js'
import { getSourceChoices } from './sources.js'

export function UpdateActions(self: ModuleInstance): void {
	const sourceChoices = getSourceChoices(self.config.consoleModel)
	const defaultSource = sourceChoices.length > 1 ? sourceChoices[0].id : 'custom'

	const channelOptions = [
		{
			id: 'source',
			type: 'dropdown' as const,
			label: 'Source',
			default: defaultSource,
			choices: sourceChoices,
		},
		{
			id: 'customChannel',
			type: 'number' as const,
			label: 'Livewire Channel Number',
			default: 1,
			min: 0,
			max: 32767,
			isVisible: (options: Record<string, unknown>): boolean => options['source'] === 'custom',
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

	function getChannelId(options: Record<string, unknown>): number {
		if (options['source'] === 'custom') {
			return Number(options['customChannel'])
		}
		return Number(options['source'])
	}

	self.setActionDefinitions({
		button_down: {
			name: 'Button Down',
			options: [
				...channelOptions,
				{
					id: 'button',
					type: 'dropdown' as const,
					label: 'Button',
					default: 'BTN_TALK',
					choices: buttonChoices,
				},
			],
			callback: async (event) => {
				const channelId = getChannelId(event.options)
				const button = String(event.options['button'])
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
				const channelId = getChannelId(event.options)
				const button = String(event.options['button'])
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
				},
			],
			callback: async (event) => {
				const channelId = getChannelId(event.options)
				const button = String(event.options['button'])
				const delay = Number(event.options['delay'])
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
				const channelId = getChannelId(event.options)
				const direction = String(event.options['direction'])
				self.sendCommand(channelId, 'ROT_HPsel', direction)
			},
		},
	})
}

import type { ModuleInstance } from './main.js'
import type { CompanionPresetDefinitions } from '@companion-module/base'
import { combineRgb } from '@companion-module/base'
import { getFixedSources, channelVarPrefix } from './sources.js'

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions = {}
	const fixedSources = [...getFixedSources(self.config.consoleModel), { id: 1, label: 'Livewire Channel 1' }]

	const buttons = [
		{ id: 'BTN_ON', lamp: 'LMP_ON', label: 'ON', color: combineRgb(0, 255, 0) },
		{ id: 'BTN_OFF', lamp: 'LMP_OFF', label: 'OFF', color: combineRgb(255, 0, 0) },
		{ id: 'BTN_MUTE', lamp: 'LMP_MUTE', label: 'MUTE', color: combineRgb(255, 128, 0) },
		{ id: 'BTN_TALK', lamp: 'LMP_TALK', label: 'TALK', color: combineRgb(255, 200, 0) },
		{ id: 'BTN_HPpset1', lamp: 'LMP_HPpset1', label: 'HP PSET 1', color: combineRgb(255, 200, 0) },
		{ id: 'BTN_HPpset2', lamp: 'LMP_HPpset2', label: 'HP PSET 2', color: combineRgb(255, 200, 0) },
		{ id: 'BTN_HPpsel', lamp: 'LMP_HPpsel', label: 'HP PSEL', color: combineRgb(255, 200, 0) },
	]

	for (const source of fixedSources) {
		for (const btn of buttons) {
			presets[`${source.id}_${btn.id}`] = {
				type: 'button',
				category: source.label,
				name: `${source.label} ${btn.label}`,
				style: {
					text: `${source.label}\\n${btn.label}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: 'button_down',
								options: {
									source: source.id > 32768 ? String(source.id) : 'custom',
									customChannel: source.id > 32768 ? 1 : source.id,
									button: btn.id,
								},
							},
						],
						up: [
							{
								actionId: 'button_up',
								options: {
									source: source.id > 32768 ? String(source.id) : 'custom',
									customChannel: source.id > 32768 ? 1 : source.id,
									button: btn.id,
								},
							},
						],
					},
				],
				feedbacks: [
					{
						feedbackId: 'lamp_state',
						options: {
							source: source.id > 32768 ? String(source.id) : 'custom',
							customChannel: source.id > 32768 ? 1 : source.id,
							lamp: btn.lamp,
							state: 'ON',
						},
						style: {
							bgcolor: btn.color,
							color: combineRgb(0, 0, 0),
						},
					},
				],
			}
		} // buttons

		presets[`${source.id}_hp`] = {
			type: 'button',
			category: source.label,
			name: `${source.label} HP`,
			style: {
				text: `${source.label}\\n$(axia-accessory:${channelVarPrefix(source.id)}_dsp_hptext)`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			options: {
				rotaryActions: true,
			},
			steps: [
				{
					down: [
						{
							actionId: 'button_down',
							options: {
								source: source.id > 32768 ? String(source.id) : 'custom',
								customChannel: source.id > 32768 ? 1 : source.id,
								button: 'BTN_HPsel',
							},
						},
					],
					up: [
						{
							actionId: 'button_up',
							options: {
								source: source.id > 32768 ? String(source.id) : 'custom',
								customChannel: source.id > 32768 ? 1 : source.id,
								button: 'BTN_HPsel',
							},
						},
					],
					rotate_left: [
						{
							actionId: 'hp_sel_rot',
							options: {
								source: source.id > 32768 ? String(source.id) : 'custom',
								customChannel: source.id > 32768 ? 1 : source.id,
								direction: '-1',
							},
						},
					],
					rotate_right: [
						{
							actionId: 'hp_sel_rot',
							options: {
								source: source.id > 32768 ? String(source.id) : 'custom',
								customChannel: source.id > 32768 ? 1 : source.id,
								direction: '+1',
							},
						},
					],
				},
			],
			feedbacks: [],
		}
	} // fixedSources

	self.setPresetDefinitions(presets)
}

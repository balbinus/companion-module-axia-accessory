import type { ModuleInstance } from './main.js'
import type { CompanionPresetDefinitions } from '@companion-module/base'
import { combineRgb } from '@companion-module/base'
import { getFixedSources } from './sources.js'

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions = {}
	const fixedSources = [...getFixedSources(self.config.consoleModel), { id: 1, label: 'Livewire Channel 1' }]

	const buttons = [
		{ id: 'BTN_ON', lamp: 'LMP_ON', label: 'ON', color: combineRgb(0, 255, 0) },
		{ id: 'BTN_OFF', lamp: 'LMP_OFF', label: 'OFF', color: combineRgb(255, 0, 0) },
		{ id: 'BTN_MUTE', lamp: 'LMP_MUTE', label: 'MUTE', color: combineRgb(255, 128, 0) },
		{ id: 'BTN_TALK', lamp: 'LMP_TALK', label: 'TALK', color: combineRgb(255, 200, 0) },
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
		}
	}

	self.setPresetDefinitions(presets)
}

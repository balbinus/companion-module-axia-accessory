import type {
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSimplePresetLocalVariable,
} from '@companion-module/base'
import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ChannelOptions, ModuleTypes } from './types.js'
import { getFixedSources, channelVarPrefix, DEFAULT_PRESET_CHANNEL } from './sources.js'

type PresetDefinitions = CompanionPresetDefinitions<ModuleTypes>
type PresetSections = CompanionPresetSection<ModuleTypes>[]

/** What a preset targets: the channel options, and the variable prefix for the display text */
interface PresetTarget {
	/** Used to build the preset ids */
	id: string
	label: string
	/** Channel options for actions and feedbacks */
	channel: {
		source: ChannelOptions['source']
		customChannel: ChannelOptions['customChannel'] | { isExpression: true; value: string }
	}
	/** The text shown on the button to identify the channel */
	title: string
	/** The module variable holding the headphone display text, as button text (may nest local variables) */
	hpTextVariable: string
	localVariables?: CompanionSimplePresetLocalVariable[]
}

export function UpdatePresets(self: ModuleInstance): void {
	const presets: PresetDefinitions = {}
	const sections: PresetSections = []

	const buttons = [
		{ id: 'BTN_ON', lamp: 'LMP_ON', label: 'ON', color: combineRgb(0, 255, 0) },
		{ id: 'BTN_OFF', lamp: 'LMP_OFF', label: 'OFF', color: combineRgb(255, 0, 0) },
		{ id: 'BTN_MUTE', lamp: 'LMP_MUTE', label: 'MUTE', color: combineRgb(255, 128, 0) },
		{ id: 'BTN_TALK', lamp: 'LMP_TALK', label: 'TALK', color: combineRgb(255, 200, 0) },
		{ id: 'BTN_HPpset1', lamp: 'LMP_HPpset1', label: 'HP PSET 1', color: combineRgb(255, 200, 0) },
		{ id: 'BTN_HPpset2', lamp: 'LMP_HPpset2', label: 'HP PSET 2', color: combineRgb(255, 200, 0) },
	]

	// Fixed sources: one set of presets per source, with the source baked in
	const targets: PresetTarget[] = getFixedSources(self.config.consoleModel).map((source) => ({
		id: String(source.id),
		label: source.label,
		channel: { source: String(source.id), customChannel: 1 },
		title: source.label,
		hpTextVariable: `$(axia-accessory:${channelVarPrefix(source.id)}_dsp_hptext)`,
	}))

	// Custom channel: the whole button is retargeted by editing the `channel` local variable
	targets.push({
		id: 'custom',
		label: 'Livewire Channel',
		channel: { source: 'custom', customChannel: { isExpression: true, value: '$(local:channel)' } },
		title: 'Channel $(local:channel)',
		// Nested variable: the local variable is resolved first, then the module variable of that channel
		hpTextVariable: `$(axia-accessory:${channelVarPrefix('$(local:channel)')}_dsp_hptext)`,
		localVariables: [
			{
				variableType: 'simple',
				variableName: 'channel',
				headline: 'Livewire channel number to control',
				startupValue: DEFAULT_PRESET_CHANNEL,
			},
		],
	})

	for (const target of targets) {
		const presetIds: string[] = []

		for (const btn of buttons) {
			const presetId = `${target.id}_${btn.id}`
			presetIds.push(presetId)
			presets[presetId] = {
				type: 'simple',
				name: `${target.label} ${btn.label}`,
				style: {
					text: `${target.title}\\n${btn.label}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: 'button_down',
								options: { ...target.channel, button: btn.id },
							},
						],
						up: [
							{
								actionId: 'button_up',
								options: { ...target.channel, button: btn.id },
							},
						],
					},
				],
				feedbacks: [
					{
						feedbackId: 'lamp_state',
						options: { ...target.channel, lamp: btn.lamp, state: 'ON' },
						style: {
							bgcolor: btn.color,
							color: combineRgb(0, 0, 0),
						},
					},
				],
				localVariables: target.localVariables,
			}
		} // buttons

		const hpPresetId = `${target.id}_hp`
		presetIds.push(hpPresetId)
		presets[hpPresetId] = {
			type: 'simple',
			name: `${target.label} HP`,
			style: {
				text: `${target.title}\\n${target.hpTextVariable}`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: 'button_down',
							options: { ...target.channel, button: 'BTN_HPsel' },
						},
					],
					up: [
						{
							actionId: 'button_up',
							options: { ...target.channel, button: 'BTN_HPsel' },
						},
					],
					rotate_left: [
						{
							actionId: 'hp_sel_rot',
							options: { ...target.channel, direction: '-1' },
						},
					],
					rotate_right: [
						{
							actionId: 'hp_sel_rot',
							options: { ...target.channel, direction: '+1' },
						},
					],
				},
			],
			feedbacks: [],
			localVariables: target.localVariables,
		}

		sections.push({
			id: `source_${target.id}`,
			name: target.label,
			description: target.localVariables
				? 'After adding a button, edit its "channel" local variable to choose the Livewire channel number.'
				: undefined,
			definitions: presetIds,
		})
	} // targets

	self.setPresetDefinitions(sections, presets)
}

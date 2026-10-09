import type { InstanceTypes } from '@companion-module/base'
import type { ModuleConfig } from './config.js'

/** The options shared by every action/feedback that targets a channel */
export type ChannelOptions = {
	source: string
	customChannel: number
}

export interface ModuleTypes extends InstanceTypes {
	config: ModuleConfig
	secrets: undefined
	actions: {
		button_down: { options: ChannelOptions & { button: string } }
		button_up: { options: ChannelOptions & { button: string } }
		button_press: { options: ChannelOptions & { button: string; delay: number } }
		hp_sel_rot: { options: ChannelOptions & { direction: string } }
	}
	feedbacks: {
		lamp_state: { type: 'boolean'; options: ChannelOptions & { lamp: string; state: string } }
	}
}

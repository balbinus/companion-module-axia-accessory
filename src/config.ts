import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	interfaceIp: string
	consoleIp: string
	consoleModel: string
	/** Channels heard from the console, remembered across restarts. Has no config field: only saved by the module itself */
	discoveredChannels?: number[]
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'interfaceIp',
			label: 'Interface IP (for multicast)',
			tooltip: 'The IP address of the network interface to use for multicast. Use 0.0.0.0 for the default interface.',
			width: 6,
			default: '0.0.0.0',
			regex: Regex.IP,
		},
		{
			type: 'textinput',
			id: 'consoleIp',
			label: 'Console IP (optional)',
			tooltip: 'If set, only messages from this IP will be accepted. Leave empty to accept from any source.',
			width: 6,
			default: '',
		},
		{
			type: 'dropdown',
			id: 'consoleModel',
			label: 'Console Model',
			tooltip: 'Defines the list of fixed (well-known) sources available in dropdowns.',
			width: 6,
			default: '',
			choices: [
				{ id: '', label: 'Other (custom sources only)' },
				{ id: 'qor16', label: 'Axia QOR.16' },
				{ id: 'qor32', label: 'Axia QOR.32' },
			],
		},
	]
}

import type { ChannelOptions } from './types.js'

export interface FixedSource {
	id: number
	label: string
}

/**
 * Build a fixed-source channel ID from category and source number.
 * Format: 0xFCNN0000 (hex), transmitted as decimal on the wire.
 *   F  = 0xF (fixed header nibble)
 *   C  = category: 0x0=MIC, 0x1=ANALOG, 0x2=AES, 0xF=SPECIAL
 *   NN = source number (0-based)
 * Uses arithmetic instead of bitwise ops to avoid signed-int issues.
 */
function makeChannelId(category: number, sourceNumber: number): number {
	return (0xf0 | category) * 0x1000000 + sourceNumber * 0x10000
}

const MIC = 0x0
const ANALOG = 0x1
const AES = 0x2
const SPECIAL = 0xf

function mics(count: number): FixedSource[] {
	return Array.from({ length: count }, (_, i) => ({
		id: makeChannelId(MIC, i),
		label: `Microphone ${i + 1}`,
	}))
}

function analogs(count: number): FixedSource[] {
	return Array.from({ length: count }, (_, i) => ({
		id: makeChannelId(ANALOG, i),
		label: `Analog ${i + 1}`,
	}))
}

function aes(count: number): FixedSource[] {
	return Array.from({ length: count }, (_, i) => ({
		id: makeChannelId(AES, i),
		label: `AES/EBU ${i + 1}`,
	}))
}

const testTone: FixedSource = {
	id: makeChannelId(SPECIAL, 0),
	label: '1 kHz -20 dBFS Test Tone',
}

const vmixOutput: FixedSource = {
	id: makeChannelId(SPECIAL, 1),
	label: 'VMIX Output',
}

export function getFixedSources(consoleModel: string): FixedSource[] {
	switch (consoleModel) {
		case 'qor16':
			return [...mics(2), ...analogs(8), ...aes(1), testTone, vmixOutput]
		case 'qor32':
			return [...mics(4), ...analogs(16), ...aes(2), testTone, vmixOutput]
		default:
			return []
	}
}

export function getSourceChoices(consoleModel: string): { id: string; label: string }[] {
	const fixed = getFixedSources(consoleModel)
	const choices = fixed.map((s) => ({
		id: String(s.id),
		label: s.label,
	}))
	choices.push({ id: 'custom', label: 'Livewire Channel (custom)' })
	return choices
}

/** The Livewire channel id targeted by an action/feedback's source/customChannel options */
export function resolveChannelId(options: ChannelOptions): number {
	if (options.source === 'custom') {
		return options.customChannel
	}
	return Number(options.source)
}

export function channelLabel(channelId: number, consoleModel: string): string {
	const fixed = getFixedSources(consoleModel)
	const match = fixed.find((s) => s.id === channelId)
	if (match) return match.label
	return `LwCH ${channelId}`
}

export function channelVarPrefix(channelId: number | string): string {
	return `ch_${channelId}`
}

/** The Livewire channel the example 'custom channel' presets start out with */
export const DEFAULT_PRESET_CHANNEL = 1

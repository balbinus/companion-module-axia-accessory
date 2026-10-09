import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, updateChannelValues, createChannelState, getAllChannels } from './variables.js'
import type { ModuleTypes } from './types.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { isDiscoverableChannel, sanitizeDiscoveredChannels, MAX_DISCOVERED_CHANNELS } from './sources.js'
import dgram from 'dgram'

const MULTICAST_ADDR = '239.192.255.4'
const RECEIVE_PORT = 4012
const SEND_PORT = 4011
// Newly discovered channels are batched: one preset rebuild and one config save per burst...
const DISCOVERY_DEBOUNCE_MS = 1500
// ...but a steady trickle of new channels still gets flushed at least this often
const DISCOVERY_MAX_WAIT_MS = 10000

export interface ChannelState {
	LMP_ON: boolean
	LMP_OFF: boolean
	LMP_MUTE: boolean
	LMP_TALK: boolean
	// Raw DSP_HPtext received from the console
	DSP_HPtext: string
	// Calculated DSP_HPvol (0-100), based on the DSP_HPtext
	DSP_HPvol: number
	// Source of the headphone signal, based on the DSP_HPtext
	DSP_HPsource: string
	LMP_HPpset1: boolean
	LMP_HPpset2: boolean
}

export { UpgradeScripts } from './upgrades.js'

export default class ModuleInstance extends InstanceBase<ModuleTypes> {
	config!: ModuleConfig
	channelStates: Map<number, ChannelState> = new Map()
	receiveSocket: dgram.Socket | null = null
	sendSocket: dgram.Socket | null = null
	// Sorted livewire channels heard from the console, persisted in the config (see saveDiscoveredChannels)
	discoveredChannels: number[] = []
	discoveryTimer: NodeJS.Timeout | null = null
	// When discoveredChannels first changed since the last rebuild/save (null: nothing pending)
	discoveryPendingSince: number | null = null
	// Whether the MAX_DISCOVERED_CHANNELS warning was logged
	discoveryCapWarned = false

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		// The stored list may be missing or hold junk
		this.discoveredChannels = sanitizeDiscoveredChannels(config.discoveredChannels)
		this.config = { ...config, discoveredChannels: this.discoveredChannels }

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.startListening()
	}

	async destroy(): Promise<void> {
		// Don't lose channels found since the last save (no need to rebuild the presets of a module being stopped)
		this.flushDiscovery(false)
		this.clearDiscoveryTimer()
		this.stopListening()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.stopListening()
		this.clearDiscoveryTimer()
		// Saving the settings forgets the discovered channels (e.g. to start over with another console).
		// saveConfig doesn't call configUpdated, so this can't loop.
		this.discoveredChannels = []
		this.discoveryPendingSince = null
		this.discoveryCapWarned = false
		this.config = { ...config, discoveredChannels: [] }
		this.saveConfig(this.config)
		this.channelStates.clear()
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.startListening()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	startListening(): void {
		try {
			this.receiveSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

			this.receiveSocket.on('error', (err) => {
				this.log('error', `Receive socket error: ${err.message}`)
				this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
			})

			this.receiveSocket.on('message', (msg, rinfo) => {
				if (this.config.consoleIp && rinfo.address !== this.config.consoleIp) {
					return
				}
				this.parseMessage(msg.toString())
			})

			this.receiveSocket.bind(RECEIVE_PORT, () => {
				try {
					const iface = this.config.interfaceIp || '0.0.0.0'
					this.receiveSocket!.addMembership(MULTICAST_ADDR, iface)
					this.log('info', `Listening on ${MULTICAST_ADDR}:${RECEIVE_PORT} (interface: ${iface})`)
					this.updateStatus(InstanceStatus.Ok)
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : String(err)
					this.log('error', `Failed to join multicast group: ${message}`)
					this.updateStatus(InstanceStatus.ConnectionFailure, message)
				}
			})

			this.sendSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
			this.sendSocket.on('error', (err) => {
				this.log('error', `Send socket error: ${err.message}`)
			})
			this.sendSocket.bind(() => {
				try {
					const iface = this.config.interfaceIp || '0.0.0.0'
					this.sendSocket!.setMulticastInterface(iface)
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : String(err)
					this.log('error', `Failed to set multicast interface for send: ${message}`)
				}
			})
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err)
			this.log('error', `Failed to start listening: ${message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, message)
		}
	}

	stopListening(): void {
		if (this.receiveSocket) {
			try {
				this.receiveSocket.dropMembership(MULTICAST_ADDR, this.config.interfaceIp || '0.0.0.0')
			} catch (_) {
				// ignore – socket may already be closed
			}
			this.receiveSocket.close()
			this.receiveSocket = null
		}
		if (this.sendSocket) {
			this.sendSocket.close()
			this.sendSocket = null
		}
	}

	parseMessage(data: string): void {
		const trimmed = data.trim()
		this.log('debug', `Received message: ${trimmed}`)
		const match = trimmed.match(/^SET\s+LwCH#(\d+)\s+(.+)$/)
		if (!match) return

		const channelId = parseInt(match[1], 10)
		const propsStr = match[2]

		let state = this.channelStates.get(channelId)
		const isNew = !state
		if (!state) {
			state = createChannelState()
		}

		// Parse key=value pairs, handling quoted strings for DSP_HPtext
		const propRegex = /(\w+)=('(?:[^']*)'|"(?:[^"]*)"|[^,]*)/g
		let propMatch
		while ((propMatch = propRegex.exec(propsStr)) !== null) {
			const key = propMatch[1]
			let value = propMatch[2]

			if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
				value = value.slice(1, -1)
			}

			switch (key) {
				case 'LMP_ON':
					state.LMP_ON = value === 'ON'
					break
				case 'LMP_OFF':
					state.LMP_OFF = value === 'ON'
					break
				case 'LMP_MUTE':
					state.LMP_MUTE = value === 'ON'
					break
				case 'LMP_TALK':
					state.LMP_TALK = value === 'ON'
					break
				case 'DSP_HPtext':
					// Test if value contains exactly 10 characters
					// from ASCII character codes 27-32 (for volume bar)
					/* eslint-disable no-control-regex */
					if (value.length == 10 && /^[\x1b-\x20]{10}$/.test(value)) {
						this.log('debug', `Parsing DSP_HPtext as volume bar`)

						// Map from character codes to block characters:
						// 27	U+2589 	▉ 	Left seven eighths block
						// 28	U+258A 	▊ 	Left three quarters block
						// 29	U+258B 	▋ 	Left five eighths block
						// 30	U+258D 	▍ 	Left three eighths block
						// 31	U+258E 	▎ 	Left one quarter block
						// 32	U+0020 	' ' 	ASCII Space
						let newHPvol = 0
						state.DSP_HPtext = value
							.split('')
							.map((c) => {
								const code = c.charCodeAt(0)
								switch (code) {
									case 27:
										newHPvol += 5
										return '▉'
									case 28:
										newHPvol += 4
										return '▊'
									case 29:
										newHPvol += 3
										return '▋'
									case 30:
										newHPvol += 2
										return '▍'
									case 31:
										newHPvol += 1
										return '▎'
									case 32:
										newHPvol += 0
										return ' '
									default:
										// any other character: reset newHPvol because it's not a volume bar
										newHPvol = -1
										return c
								}
							})
							.join('')

						this.log('debug', `Parsed DSP_HPtext: ${state.DSP_HPtext}, newHPvol: ${newHPvol}`)
						state.DSP_HPvol = newHPvol * 2
					} else {
						state.DSP_HPtext = value
						state.DSP_HPsource = value
					}
					break
				case 'LMP_HPpset1':
					state.LMP_HPpset1 = value === 'ON'
					break
				case 'LMP_HPpset2':
					state.LMP_HPpset2 = value === 'ON'
					break
			}
		}

		// A channel with no variable definitions yet (set before the state is stored, as that adds it)
		const needsDefinitions = isNew && !getAllChannels(this).has(channelId)
		this.channelStates.set(channelId, state)

		if (needsDefinitions) {
			if (isDiscoverableChannel(channelId)) {
				if (this.discoveredChannels.length < MAX_DISCOVERED_CHANNELS) {
					this.discoveredChannels = [...this.discoveredChannels, channelId].sort((a, b) => a - b)
					this.scheduleDiscoveryFlush()
				} else if (!this.discoveryCapWarned) {
					this.discoveryCapWarned = true
					this.log('warn', `Already ${MAX_DISCOVERED_CHANNELS} discovered channels, not remembering any more`)
				}
			}
			// Variables must exist right away, or their values would be dropped. Also sets their values.
			this.updateVariableDefinitions()
		} else {
			updateChannelValues(this, channelId)
		}
		this.checkFeedbacks('lamp_state')
	}

	/** Mark the discovered channels as changed, to be rebuilt/saved once a burst of new channels has settled */
	scheduleDiscoveryFlush(): void {
		const now = Date.now()
		this.discoveryPendingSince ??= now
		this.clearDiscoveryTimer()
		// Wait for the burst to end, but no longer than the max wait since the first pending change
		const remaining = DISCOVERY_MAX_WAIT_MS - (now - this.discoveryPendingSince)
		if (remaining <= 0) {
			this.flushDiscovery()
			return
		}
		this.discoveryTimer = setTimeout(() => this.flushDiscovery(), Math.min(DISCOVERY_DEBOUNCE_MS, remaining))
	}

	/** Rebuild the presets and save the discovered channels, if they changed since the last flush */
	flushDiscovery(rebuildPresets = true): void {
		this.clearDiscoveryTimer()
		if (this.discoveryPendingSince === null) return
		try {
			if (rebuildPresets) this.updatePresets()
			this.config = { ...this.config, discoveredChannels: [...this.discoveredChannels] }
			this.saveConfig(this.config)
			// Only once saved, so that a failure is retried on the next change
			this.discoveryPendingSince = null
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err)
			this.log('error', `Failed to update the discovered channels: ${message}`)
		}
	}

	clearDiscoveryTimer(): void {
		if (this.discoveryTimer) {
			clearTimeout(this.discoveryTimer)
			this.discoveryTimer = null
		}
	}

	sendCommand(channelId: number, button: string, direction: string): void {
		if (!Number.isInteger(channelId) || channelId < 0) {
			this.log('error', `Invalid channel id: ${channelId}`)
			return
		}

		const message = `EVENT LwCH#${channelId} ${button}=${direction}`
		this.log('debug', `Sending: ${message}`)

		if (!this.sendSocket) {
			this.log('error', 'Send socket not available')
			return
		}

		const buf = Buffer.from(message, 'ascii')
		this.sendSocket.send(buf, 0, buf.length, SEND_PORT, MULTICAST_ADDR, (err) => {
			if (err) {
				this.log('error', `Failed to send: ${err.message}`)
			}
		})
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}

import { InstanceBase, runEntrypoint, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, updateVariableValues } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import dgram from 'dgram'

const MULTICAST_ADDR = '239.192.255.4'
const RECEIVE_PORT = 4012
const SEND_PORT = 4011

export interface ChannelState {
	LMP_ON: boolean
	LMP_OFF: boolean
	LMP_MUTE: boolean
	LMP_TALK: boolean
	DSP_HPtext: string
	LMP_HPpset1: boolean
	LMP_HPpset2: boolean
}

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	channelStates: Map<number, ChannelState> = new Map()
	receiveSocket: dgram.Socket | null = null
	sendSocket: dgram.Socket | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.startListening()
	}

	async destroy(): Promise<void> {
		this.stopListening()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.stopListening()
		this.config = config
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
			state = {
				LMP_ON: false, LMP_OFF: false,
				LMP_MUTE: false, LMP_TALK: false,
				DSP_HPtext: '', LMP_HPpset1: false, LMP_HPpset2: false
			}
		}

		// Parse key=value pairs, handling quoted strings for DSP_HPtext
		const propRegex = /(\w+)=('(?:[^']*)'|"(?:[^"]*)"|[^,]*)/g
		let propMatch
		while ((propMatch = propRegex.exec(propsStr)) !== null) {
			const key = propMatch[1]
			let value = propMatch[2]

			if ((value.startsWith("'") && value.endsWith("'"))
				|| (value.startsWith('"') && value.endsWith('"'))) {
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
					this.log('debug', `DSP_HPtext value: ${value.split('').map(c => c.charCodeAt(0)).join(', ')}`)
					// Map from character codes to block characters:
					// 27	U+2589 	▉ 	Left seven eighths block
					// 28	U+258A 	▊ 	Left three quarters block
					// 29	U+258B 	▋ 	Left five eighths block
					// 30	U+258D 	▍ 	Left three eighths block
					// 31	U+258E 	▎ 	Left one quarter block
					// 32	U+0020 	' ' 	ASCII Space
					state.DSP_HPtext = value
						.split('')
						.map(c => {
							const code = c.charCodeAt(0)
							switch (code) {
								case 27: return '▉'
								case 28: return '▊'
								case 29: return '▋'
								case 30: return '▍'
								case 31: return '▎'
								case 32: return ' '
								default: return c
							}
						})
						.join('')
					break
				case 'LMP_HPpset1':
					state.LMP_HPpset1 = value === 'ON'
					break
				case 'LMP_HPpset2':
					state.LMP_HPpset2 = value === 'ON'
					break
			}
		}

		this.channelStates.set(channelId, state)

		if (isNew) {
			this.updateVariableDefinitions()
		}

		updateVariableValues(this)
		this.checkFeedbacks('lamp_state')
	}

	sendCommand(channelId: number, button: string, direction: string): void {
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

runEntrypoint(ModuleInstance, UpgradeScripts)

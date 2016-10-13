import * as fs from 'fs'
import * as WebSocket from 'ws'
import WebSocketServer = WebSocket.Server
import * as http from 'http'
import Crdp from 'chrome-remote-debug-protocol'
import * as rpc from '../lib/noice-json-rpc'

async function setupClient() {
    try {
        const api: Crdp.CrdpClient = new rpc.Client(new WebSocket("ws://localhost:8080"), {logConsole: true}).api()

        await Promise.all([
            api.Runtime.enable(),
            api.Debugger.enable(),
            api.Profiler.enable(),
        ])

        await api.Profiler.start()
        await new Promise((resolve) => api.Runtime.onExecutionContextDestroyed(resolve)); // Wait for event
        const result = await api.Profiler.stop()

        console.log("Result", result)
        process.exit(0)

    } catch (e) {
        console.error(e)
    }
}

function setupServer() {
    const wssServer = new WebSocketServer({port: 8080});
    const api: Crdp.CrdpServer = new rpc.Server(wssServer).api();

    const enable = () => {}

    api.Debugger.expose({enable})
    api.Profiler.expose({enable})
    api.Runtime.expose({
        enable,
    })
    api.Profiler.expose({
        enable,
        start() {
            setTimeout(() => {
                api.Runtime.emitExecutionContextDestroyed({executionContextId:1})
            }, 1000)
        },
        stop() {
            const response: Crdp.Profiler.StopResponse = {
                profile: {
                    nodes: [],
                    startTime: 0,
                    endTime: 100
                }
            }
            return response
        }
    })

}

setupServer()
setupClient()
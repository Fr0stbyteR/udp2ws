import udp from "dgram";
import process from "process";
import { WebSocketServer } from "ws";
// import OSC from "osc";

const udpPort = +process.argv[2] || 8000;
const wsPort = +process.argv[3] || 8012;

const wsServer = new WebSocketServer({ port: wsPort });
const wsAddress = wsServer.address();

const udpServer = udp.createSocket("udp4");

let recvBytes = 0;
let showBytes = 0;

udpServer.on("listening", () => {
    const address = udpServer.address();
    console.log(`UDP Server Listening \t${address.address}:${address.port}`);
    console.log(`WebSocket Server on \t${typeof wsAddress === "string" ? `${wsAddress}::${wsPort}` : `${wsAddress.address}:${wsAddress.port}`}`);
    
    udpServer.on("message", (msg, info) => {
        recvBytes += msg.byteLength;
        wsServer.clients.forEach((socket) => {
            socket.send(msg);
        });
    });
});

udpServer.bind(udpPort);

setInterval(() => {
    if (recvBytes === showBytes) return;
    process.stdout.cursorTo(0);
    process.stdout.write(`Transferred: ${recvBytes} Bytes`);
    showBytes = recvBytes;
}, 250);

import udp from "dgram";
import process from "process";
import { WebSocketServer } from "ws";

/** @type {string[]} */
const argv = [];
/** @type {Record<string, string>} */
const opts = {};

const parseArgs = () => {
    let key = "";
    for (const str of process.argv.slice(2)) {
        if (str.startsWith("-")) key = str.replace(/^-/, "");
        else if (!key) argv.push(str);
        else opts[key] = str;
    }
};

parseArgs();

const udpPort = +argv[0] || 8000;
const wsPort = +argv[1] || 8012;
const rate = +opts.rate || 0;

const wsServer = new WebSocketServer({ port: wsPort });
const wsAddress = wsServer.address();

const udpServer = udp.createSocket("udp4");

let recvBytes = 0;
let sentBytes = 0;
let showRecvBytes = 0;
let showSentBytes = 0;
let interval = rate ? 1000 / rate : 0;

udpServer.on("listening", () => {
    const address = udpServer.address();
    console.log(`UDP Server Listening \t${address.address}:${address.port}`);
    console.log(`WebSocket Server on \t${typeof wsAddress === "string" ? `${wsAddress}::${wsPort}` : `${wsAddress.address}:${wsAddress.port}`}`);
    
    if (rate) {
        /** @type {Buffer | null} */
        let buffer;
        /** @type {NodeJS.Timeout} */
        let i;
        let sendScheduled = false;
        const cb = () => {
            sendScheduled = false;
            if (!buffer) return;
            sendScheduled = true;
            wsServer.clients.forEach((socket) => {
                socket.send(buffer);
            });
            sentBytes += buffer.byteLength;
            buffer = null;
            i = setTimeout(cb, interval);
        };
        udpServer.on("message", (msg, info) => {
            recvBytes += msg.byteLength;
            buffer = msg;
            if (!sendScheduled) cb();
        });
    } else {
        udpServer.on("message", (msg, info) => {
            recvBytes += msg.byteLength;
            sentBytes += msg.byteLength;
            wsServer.clients.forEach((socket) => {
                socket.send(msg);
            });
        });
    }
});

udpServer.bind(udpPort);

setInterval(() => {
    if (recvBytes === showRecvBytes && sentBytes === showSentBytes) return;
    process.stdout.cursorTo(0);
    process.stdout.write(`Recv: ${recvBytes} \t Bytes`);
    process.stdout.write(`\t`);
    process.stdout.write(`Sent: ${sentBytes} \t Bytes`);
    showRecvBytes = recvBytes;
    showSentBytes = sentBytes;
}, 250);

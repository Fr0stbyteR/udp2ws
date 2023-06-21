const Max = require("@shren/max-api-or-not");
const udp = require("dgram");
const { WebSocketServer } = require("ws");

Max.addHandler("start", (updPortIn, wsPortIn, rateIn) => {
    const udpPort = +updPortIn || 8000;
    const wsPort = +wsPortIn || 8012;
    const rate = rateIn || 0;
    
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
        Max.outlet("stat", recvBytes, sentBytes);
        showRecvBytes = recvBytes;
        showSentBytes = sentBytes;
    }, 250);
});

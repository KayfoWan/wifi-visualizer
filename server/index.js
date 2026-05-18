import http, { STATUS_CODES } from 'http';
import { URL } from 'url';
import { exec, spawn } from 'child_process';
import { WebSocketServer } from "ws";

const PORT = 3000;

// const ls = spawn('ls', ['-lh', '/home/k4199/']);

// ls.stdout.on('data', (data) => {
//     console.log(`Live Feed: ${data}`);
// });

// ls.on('close', (code) => {
//     console.log(`Process exited with code ${code}.`);
// });


// const ls = exec('ls -lh /home/k4199/');

// ls.stdout.on('data', (data) => {
//     console.log(`\nExec Feed:\n\n${data}`);
// });

// ls.on('close', (code) => {
//     console.log(`Process exited with code ${code}`);
// });

// const tshark = spawn('sudo', [
//     'tshark',
//     '-i', 'any',
//     '-T', 'fields',
//     '-e', 'frame.len',
//     '-e', 'ip.src',
//     '-e', 'ip.dst',
//     '-e', '_ws.col.Protocol'
// ]);

// tshark.stdout.on('data', (data) => {
//     const line = data.toString().trim();
//     console.log(`Data:\n\n${data}`);
// });

// tshark.stderr.on('data', (data) => {
//     console.log(`Tshark status/Error: ${data}`);
// });

// tshark.on('close', (code) => {
//     console.log(`Process exited with code ${code}`);
// });

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    if(parsedUrl.pathname === '/check' && req.method === 'GET') {
        try {
            const target = 'https://google.com';
            const ping = await fetch(target);

            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({
                status: "success",
                statusCode: ping.status
            }));
        } catch (error) {
            res.writeHead(500, { 'content-type': 'application/json' });
            res.end(JSON.stringify({
                status: "unsuccessful",
                error: error.message
            }));
        }
    } else {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Route Not Found');
    }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log("A frontend has connected.");

    const tshark = spawn('tshark', [
        '-l',
        '-i', 'any',
        '-f', 'not port 3000 and not port 3001',
        '-T', 'fields',
        '-e', 'frame.len',
        '-e', 'eth.src',
        '-e', 'eth.dst',
        '-e', 'ip.src',
        '-e', 'ip.dst',
        '-e', 'ipv6.src',
        '-e', 'ipv6.dst',
        '-e', '_ws.col.Protocol'
    ]);

    tshark.stdout.on('data', (data) => {

        const line = data.toString('utf8').trim();

        const lines = line.split('\n');

        for (const singleLine of lines) {
            const fields = singleLine.split('\t');

            if(fields.length < 8) continue;

            const frameLen = fields[0];
            const ethSrc = fields[1];
            const ethDst = fields[2];
            const ipSrc = fields[3];
            const ipDst = fields[4];
            const ipv6Src = fields[5];
            const ipv6Dst = fields[6];
            const protocol = fields[7];

            const normalizedPacket = {
                size: frameLen,
                macSrc: ethSrc,
                macDst: ethDst,
                src: ipSrc || ipv6Src || ethSrc,
                dst: ipDst || ipv6Dst || ethDst,
                proto: protocol || "UNKNOWN"
            };

            if (normalizedPacket.src === '::1' || normalizedPacket.src === '127.0.0.1') continue;

            if(ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(normalizedPacket));
            }
        }
    });

    tshark.stderr.on('data', (data) => {
        console.log(`Tshark status/Error: ${data}`);
    });

    tshark.on('close', (code) => {
        console.log(`Process exited with code ${code}`);
    });

    ws.on('close', () => {
        console.log('Frontend disconnected. Killing tshark process...');
        tshark.kill();
        console.log("tshark process terminated.");
    });
});

server.listen(PORT, ()=> {
    console.log("Server is running on port: " + PORT);
    console.log("WebSocket is listening...");
});

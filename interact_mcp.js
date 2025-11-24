const { spawn } = require('child_process');

const env = {
    ...process.env,
    VWO_ACCOUNT_ID: '894940',
    VWO_API_KEY: 'd0914962ef2b552363166068cb4d1c10557f5fbb9ba87ef6597d80dc8c949898'
};

const mcp = spawn('npx', ['-y', 'vwo-fme-mcp@latest'], { env });

const fs = require('fs');
const logStream = fs.createWriteStream('mcp_output.txt', { flags: 'a' });

mcp.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
    logStream.write(`STDOUT: ${data}\n`);
});

mcp.stderr.on('data', (data) => {
    console.error(`STDERR: ${data}`);
    logStream.write(`STDERR: ${data}\n`);
});

mcp.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
});

// Wait for server to start then send list tools command
setTimeout(() => {
    const listProjects = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
            name: "ListProjectAndEnvironments",
            arguments: {
                limit: 10,
                offset: 0
            }
        }
    };
    mcp.stdin.write(JSON.stringify(listProjects) + '\n');
}, 5000);

// Keep alive for a bit to receive response
setTimeout(() => {
    mcp.kill();
}, 15000);

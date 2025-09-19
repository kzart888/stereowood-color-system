#!/usr/bin/env node

async function main() {
    try {
        const { run } = require('./custom-colors-store.test.js');
        await run();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();

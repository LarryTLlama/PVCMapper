console.log("Downloading PVC tile data.");
var term = require('terminal-kit').terminal;

let nethervalues = [-1, -1, -1, -1, -1, -2, -4, -8, -15];
let netherTilesToFetch = 0;
for (const i of nethervalues) {
    netherTilesToFetch += (Math.abs(i) * 2) * (Math.abs(i) * 2)
}
let overworldvalues = [-1, -1, -1, -2, -4, -7, -14, -28, -56];
let overworldTilesToFetch = 0;
for (const i of overworldvalues) {
    overworldTilesToFetch += (Math.abs(i) * 2) * (Math.abs(i) * 2)
}

let fetch = require("node-fetch");
let {outputFile} = require('fs-extra');
let path = require("path")
async function download(width, height, zoom, world) {
    const response = await fetch(`https://web.peacefulvanilla.club/maps/tiles/${world}/${zoom}/${width}_${height}.png`);
    const buffer = await response.buffer();
    await outputFile(`./public/maps/${world}/${zoom}/${width}_${height}.png`, buffer)
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let gonether = p => new Promise(async (resolve, reject) => {
        let netherprogress = 0;

        let netherprogressBar = term.progressBar({
            width: 80,
            title: 'Fetching nether tiles',
            eta: true,
            percent: true
        });
        let index = -1;
        for (const x of nethervalues) {
            index++;
            console.log(index)
            const original = x
            let width = original;
            let w1 = 0;
            let height = original;
            let h1 = 0;
            while (width < Math.abs(original)) {
                await download(width, height, index, "minecraft_the_nether")
                // Stagger download so we don't DOS the server.
                netherprogress++;
                netherprogressBar.update(netherprogress / netherTilesToFetch);
                await sleep(1000)
                height = height + 1;
                h1 = h1 + 512
                if (height == Math.abs(original)) {
                    height = original;
                    h1 = 0;
                    width = width + 1;
                    w1 = w1 + 512
                }
            }
            if (index == nethervalues.length) resolve();
        }
    })
let gooverworld = p => new Promise(async (resolve) => {
        let overworldprogress = 0;
        console.log("Tiles to fetch: ", overworldTilesToFetch)
        let overworldprogressBar = term.progressBar({
            width: 80,
            title: 'Fetching overworld tiles',
            eta: true,
            percent: true
        });
        let index = -1;
        for (const x of overworldvalues) {
            index++
            const original = x
            let width = original;
            let w1 = 0;
            let height = original;
            let h1 = 0;
            while (width < Math.abs(original)) {
                //console.log(`Downloading image at location:  X = ${width}   Y = ${height}    Zoom level ${index}`)
                await download(width, height, index, "minecraft_overworld")
                // Stagger download so we don't DOS the server.
                overworldprogress++;
                overworldprogressBar.update(overworldprogress / overworldTilesToFetch);
                await sleep(250)
                height = height + 1;
                h1 = h1 + 512
                if (height == Math.abs(original)) {
                    height = original;
                    h1 = 0;
                    width = width + 1;
                    w1 = w1 + 512
                }
            }
            if (index == overworldvalues.length) resolve();
        }
    })


async function go() {
    //await gonether();
    await gooverworld();
}
go()
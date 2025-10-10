const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { setTimeout } = require('timers/promises');

const raceId = process.argv[2];

if (!raceId) {
    console.error('Usage: node capturedata.js <raceId>');
    process.exit(1);
}
else {
    async function openBrowserAndCaptureResponses(raceId) {
        const url = `https://www.webscorer.com/racemap/viewracersel?raceid=${raceId}`;
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        // Enable request interception
        //await page.setRequestInterception(true);

        // Create directory to save files
        const dir = path.resolve(__dirname, 'data', raceId);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        // Navigate to the target URL
        console.log('Go to url', url);
        await page.goto(url); // Wait until network is idle
        await page.waitForNetworkIdle();
        await page.$('#ddSelRacers');
        await setTimeout(4000);
        const options = await page.evaluate((selector) => {
            const selectElement = document.querySelector(selector);
            if (!selectElement) {
                return []; // Return empty array if select element not found
            }

            // Map through the options and extract their text and value
            return Array.from(selectElement.options).map(option => ({
                text: option.textContent,
                value: option.value
            }));
        }, '#ddSelRacers');
        console.log(`Found ${options.length} racers in the dropdown`);
        console.dir(options);
        
        var responseCount = 0;
        page.on('response', async (response) => {
            try {
                const url = response.url();
                if (url.startsWith('https://www.webscorer.com/racemap/viewracersel?raceid=')) {
                    //console.log(`URL: ${response.url()}`);
                    //console.log(`Status: ${response.status()}`);
                    const text = await response.text();
                    const jsonStr = text.split('\n').filter(line => line.trim().startsWith('<span id="racerlocationsjson" style="display:none;">')).map(line => line.trim())[0];
                    // Save to file
                    const filename = 'racer' + (++responseCount) + '.txt';
                    fs.writeFileSync(path.resolve(__dirname, 'data', raceId, filename), jsonStr);
                    console.log('Saved response to', filename);
                }
            } catch (error) {
                console.error(`Error processing response: ${error}`);
            }
        });

        const selectElement = await page.$('#ddSelRacers');
        for (let i=1; i<options.length; i++) {
            console.log('Selecting option:', options[i].text, options[i].value);
            await selectElement.select(options[i].value);
            //console.log('Waiting for network idle after selection');
            await page.waitForNetworkIdle();
            //console.log('waiting some more');
            await setTimeout(4000);
        }

        await setTimeout(4000);
        console.log('Closing browser');
        await browser.close();
    }

    openBrowserAndCaptureResponses(raceId);
}

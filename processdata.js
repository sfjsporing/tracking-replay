const fs = require('fs');
const path = require('path');
const randomColor = require('randomcolor');

// Read filename from command line argument
const filename = process.argv[2] || 'allracers.json';

const startDateTime = new Date('2025-10-05T11:30:00');
const endDateTime = new Date('2025-10-05T13:00:00');
let earliest = Infinity, latest = -Infinity;

// Read and parse the JSON file
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, filename), 'utf8'));
// Map data, convert and sort timestamps in track
let racers = data.Racers.map( (racer, i) => {
    const bib = racer.Props.find(p => p.Name === 'Bib')?.Value || '';
    return {
        id: 1 + i,
        name: racer.RacerId,
        color: randomColor({ luminosity: 'bright', format: 'hex' }),
        bib: bib,
        badData: racer.Props.find(p => p.Name === 'BadData')?.Value || false,
        sortValue: (racer.Props.find(p => p.Name === 'Gender')?.Value==='Male' ? 1000 : 0) + (parseInt(bib) || 0), // Sort by Bib number, default to 0 if not found
        track: racer.Positions.map(p => ({
            lat: p.Lat,
            lon: p.Lon,
            timestamp: parseDateTime(p.DateTime)
        })).sort((a, b) => a.timestamp - b.timestamp).filter((elem) => elem.timestamp>startDateTime && elem.timestamp<endDateTime)
    };
}).sort((a, b) => a.sortValue - b.sortValue);
// Process each racer's track to calculate distances and speeds
racers.forEach(racer => {
    racer.track = racer.track.map(p => {
        // Calculate speed from previous position if available
        const idx = racer.track.indexOf(p);
        if (idx > 0) {
            const prev = racer.track[idx - 1];
            p.dist = haversineDistance(prev.lat, prev.lon, p.lat, p.lon); // in meters
            p.speed = (() => {
                const timeDiff = (p.timestamp - prev.timestamp) / 1000; // in seconds
                return timeDiff > 0 ? +((p.dist / timeDiff) * 3.6).toFixed(2) : 0; // speed in km/h
            })();
        }
        else {
            p.dist = 0;
            p.speed = 0;
        }
        return p;
    }).map(p => {
        // Calculate cumulative distance
        const idx = racer.track.indexOf(p);
        p.totalDist = idx > 0 ? racer.track[idx - 1].totalDist + p.dist : 0;
        // Calculate average speed up to this point
        const timeElapsed = (p.timestamp - racer.track[0].timestamp) / 1000; // in seconds
        p.avgSpeed = timeElapsed > 0 ? +((p.totalDist / timeElapsed) * 3.6).toFixed(2) : 0; // avg speed in km/h
        return p;
    });
    racer.maxSpeed = racer.track.reduce((max, p) => p.speed > max ? p.speed : max, 0);
    racer.totalDistance = racer.track.reduce((sum, p) => sum + p.dist, 0);
    racer.totalTime = racer.track.length > 1 ? (racer.track[racer.track.length - 1].timestamp - racer.track[0].timestamp) / 1000 : 0; // in seconds
    racer.avgSpeed = racer.totalTime > 0 ? (racer.totalDistance / racer.totalTime) * 3.6 : 0; // avg speed in km/h
    earliest = Math.min(earliest, racer.track[0]?.timestamp || Infinity);
    latest = Math.max(latest, racer.track[racer.track.length - 1]?.timestamp || -Infinity);
});

//console.dir(racers, {depth: 1, maxArrayLength: 40});

// Output the processed data
let pathFromFilename = filename.split('.').slice(0, -1).join('.');
console.log('Processed ', racers.length, 'racers from', filename, 'to', pathFromFilename + '_processed.json');
fs.writeFileSync(path.resolve(__dirname, pathFromFilename + '_processed.json'), JSON.stringify(
    {
        description: 'Replay of event "Queen And King of the Fjord + SM 2025" 2025-10-05 with data from webscorer. Webscorer was configured to record positions every 15s. Some competitors did not record. Checkboxes only work after the competitor has tracking data.',
        earliest: earliest,
        latest: latest,
        racers: racers
    }, null, 2), 'utf8');

function parseDateTime(dateTimeStr) {
    // Expected input format from webscorer: Jun 14, 2025  at 13:01:16 (GMT+2)
    return Date.parse(dateTimeStr.split(',').join('').split(' at ').join().split('(').join().split(')').join());
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
}
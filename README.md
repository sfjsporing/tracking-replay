# Description
This repo holds instructions and html for showing a basic replay of GPS tracking data from webscorer.com
External packages in use:
 - https://github.com/Leaflet/Leaflet
   - with map data from https://www.openstreetmap.org/
 - https://github.com/davidmerfield/randomColor
 - https://fontawesome.com/

# Getting data from webscorer
 - Log in to webscorer on web
 - Find the race results
 - Go to 'GPS tracking of racers'
 - Click 'Selected racer progress'
 - Make sure 'Only show latest tracking' is selected
 - Select a racer
 - Save the response generated in the browser. ex: https://www.webscorer.com/racemap/viewracersel?raceid=385956&resultid=394347
    For example as racer1.txt, racer2.txt etc. and put them in a directory

# Parsing the responses
Get the location json from the responses
```
for filename in racer*.txt ; do
    grep "racerlocationsjson" ${filename} | xmllint --xpath '//span/text()' - | jq '{RacerId: .Racers[0].RacerId, Props: .Racers[0].Props, Positions: [.Racers[] | {Lat: .Latitude, Lon: .Longitude, DateTime: .DateTime, Seq: .Offset}]}' > ${filename%%.*}.json
done
```

# Combining into one big json
```
jq -s '{Racers: .}' racer*.json > allracers.json
```

# Edit the big json after reviewing the replay
 - If some competitors have bad tracking data, mark them by adding to their Props:
 ```
        {
          "Name": "BadData",
          "Value": true
        }
 ```

# Process the big json
```
node processdata.js allracers.json
```

# Edit html
 - Update description
 - Update dataUrl
 - Update setView coordinates
 - Update startDateTime/endDateTime to filter out positions outside of interest

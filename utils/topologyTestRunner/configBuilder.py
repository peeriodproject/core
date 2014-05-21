#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import urllib2
import json
import time
import random

#from subprocess import call

configTemplatePath = '../../src/config/mainConfig.json'
openPorts = [1,2,3,4,5,6,7,8,9,10]
amount = 3
crawlIpAddresses = False

locations = []

def getJson(url):
	req = urllib2.Request(url)
	opener = urllib2.build_opener()
	f = opener.open(req)

	return json.loads(f.read())

def getLocation(ip):
	result = getJson('http://freegeoip.net/json/' + ip)

	location = {
		'lat': result['latitude'],
		'lng': result['longitude'],
		'country': result['country_code']
	}

	return location

if crawlIpAddresses:
	print 'scanning the internet for reachable ip addresses'
	print '------------------------------------------------'

	os.system('sudo ./bin/zmap/zmap --bandwidth=1M --target-port=80 --max-results=' + str((amount * 3)) + ' --output-module=json --output-file=zmap-results.json -f "saddr,timestamp-str,timestamp-ts,timestamp-us"')
	time.sleep(.1)

jsonFile = open('zmap-results.json', 'r')
content = ','.join(jsonFile.readlines())
jsonFile.close()

results = json.loads('[' + content + ']')

# random file numbers
indexes = random.sample(range(0, len(results) - 1), amount)

print "\n"
print 'fetching locations of ' +  str(amount) + ' ip addresses'
print '------------------------------------------------'

for i in indexes:
	line = results[i]

	if line['type'] == 'result':
		locations.append({
			'location': getLocation(line['saddr']),
			'delay': line['timestamp-us'] / 1000
		})
		
		time.sleep(0.2)

print 'writing config files'
print '------------------------------------------------'

configFile = open(configTemplatePath, 'r')
config = json.load(configFile);
configFile.close()

portIndexes = random.sample(range(0, len(openPorts)), amount)
#locationIndexes = random.sample(range(0, len(locations) - 1), amount)

print locations
locationIndex = 0

for i in portIndexes:
	config['net']['myOpenPorts'] = [openPorts[i]]
	config['simulator'] = locations[locationIndex]
	locationIndex += 1

	configFile = open('configs/config-' + str(i) + '.json', 'w')
	configFile.write(json.dumps(config, sort_keys=True, indent=4))
	configFile.close()

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import urllib2
import json
import time
import random
import socket

#from subprocess import call

#configTemplatePath = '../../src/config/mainConfig.json'
openPorts = []
locations = []

def getJson(url):
	req = urllib2.Request(url)
	opener = urllib2.build_opener()
	jsonContent = None
	
	try:
	    f = opener.open(req, timeout=10)
	    jsonContent = json.loads(f.read())
	except urllib2.URLError as e:
		print e
	except socket.timeout as e:
		print e
	except e:
		print e
	
	return jsonContent

def getLocation(ip):
	result = getJson('http://freegeoip.net/json/' + ip)

	if result:
		return {
			'lat': result['latitude'],
			'lng': result['longitude'],
			'country': result['country_code']
		}
	else:
		return None

def setOpenPorts(amount, startPort = 0):
	global openPorts

	openPorts = range(startPort, startPort + amount)

def crawlIpAddresses(amount):
	print "\n"
	print 'scanning the internet for reachable ip addresses'
	print '------------------------------------------------'

	os.system('sudo ./bin/zmap/zmap --bandwidth=150K --target-port=80 --max-results=' + str((amount * 3)) + ' --output-module=json --output-file=zmap-results.json -f "saddr,timestamp-str,timestamp-ts,timestamp-us"')
	time.sleep(5)
	print "\nDone!"

def loadLocations(results, amount, ipsLoaded = 0):
	global locations;
	# random file numbers
	indexes = random.sample(range(0, len(results)), amount)

	for i in indexes:
		line = results[i]

		if line['type'] == 'result':
			print str(ipsLoaded + 1) + '. location found: ' + line['saddr']
			
			#try:
			loc = getLocation(line['saddr'])
			if loc:
				locations.append({
					'location': loc,
					'rtt': line['timestamp-us'] / 1000
					#'rtt': (line['timestamp-us'] / 1000) * (1 + random.random())
				})
				ipsLoaded += 1

			time.sleep(0.1)

	return ipsLoaded

def fetchLocations (fetchLocations, amount):
	global locations;

	jsonFile = open('zmap-results.json', 'r')
	content = ','.join(jsonFile.readlines())
	jsonFile.close()

	results = json.loads('[' + content + ']')

	if fetchLocations:
		print "\n"
		print 'fetching locations of ' +  str(amount) + ' ip addresses'
		print '------------------------------------------------'

		loaded = 0

		while loaded < amount:
			loaded = loadLocations(results, amount / 5, loaded)
			time.sleep(1)

		locationsFile = open('locations.json', 'w')
		locationsFile.write(json.dumps(locations, sort_keys=True, indent=4))
		locationsFile.close()
	else:
		locationsFile = open('locations.json', 'r')
		locations = json.load(locationsFile)
		locationsFile.close()

def writeConfigFiles(configTemplatePath, amount):
	print "\n"
	print 'writing config files'
	print '------------------------------------------------'

	configFile = open(configTemplatePath, 'r')
	config = json.load(configFile);
	configFile.close()

	print len(openPorts)
	portIndexes = random.sample(range(0, len(openPorts)), amount)
	print len(portIndexes)
	locationIndex = 0

	for i in portIndexes:
		if locationIndex < amount:
			config['net']['myOpenPorts'] = [openPorts[i]]
			config['net']['simulator'] = locations[locationIndex]
			config['app']['dataPath'] = '/Users/jj/Desktop/dataPath'
			locationIndex += 1

			configFile = open('configs/config-' + str(i) + '.json', 'w')
			configFile.write(json.dumps(config, sort_keys=True, indent=4))
			configFile.close()
		else:
			break

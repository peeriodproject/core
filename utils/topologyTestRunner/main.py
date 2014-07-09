#!/usr/bin/env python
# -*- coding: utf-8 -*-

#
# 
#
#
#
#
#
#
#   pip install elasticsearch-curator
#

import subprocess

import configBuilder
import runner

amount = 100
maxOpenPorts = 200

# --------- Runner ------------------------------

appSrc = '/Users/jj/Desktop/testing/abschluss_app_src/src'

# --------- Config Builder ----------------------

configTemplatePath = '/Users/jj/Desktop/testing/abschluss_app_src/src/config/mainConfig.json'


crawlIpAddresses = False
fetchLocations = False
overrideConfig = True

extractApps = True

updateApps = False
resetAppData = True

createSharedFolders = True
startApps = True

clearExistingLogs = True

delayBetweenAppStarts = 10
tryToRestartAppsEverySeconds = 900

# -----------------------------------------------

#if clearExistingLogs:
#	subprocess.call('curator --time-unit minutes ')

configBuilder.setOpenPorts(min(amount, maxOpenPorts), 31000)
if crawlIpAddresses: configBuilder.crawlIpAddresses(amount)
configBuilder.fetchLocations(fetchLocations, amount)
if overrideConfig: configBuilder.writeConfigFiles(configTemplatePath, amount)

if extractApps: runner.extractApps(amount, 8)
if resetAppData: runner.resetAppData(amount, createSharedFolders)
if updateApps: runner.updateApps(amount)

if startApps:
	runner.updateConfig(amount)
	runner.startInstances(amount, delayBetweenAppStarts, printFolderName=True)

	if tryToRestartAppsEverySeconds:
		runner.restartInstancesEverySeconds(tryToRestartAppsEverySeconds, amount, delayBetweenAppStarts)
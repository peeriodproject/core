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

# --------- Runner ------------------------------

appSrc = '../../src'

# --------- Config Builder ----------------------

configTemplatePath = '../../src/config/mainConfig.json'
#amount = 1000
crawlIpAddresses = False
fetchLocations = False
overrideConfig = False

extractApps = True

updateApps = True
resetAppData = True
startApps = True

clearExistingLogs = True


# -----------------------------------------------

#if clearExistingLogs:
#	subprocess.call('curator --time-unit minutes ')

configBuilder.setOpenPorts(min(amount, 133), 31000)
if crawlIpAddresses: configBuilder.crawlIpAddresses(amount)
configBuilder.fetchLocations(fetchLocations, amount)
if overrideConfig: configBuilder.writeConfigFiles(configTemplatePath, amount)

if extractApps: runner.extractApps(amount, 8)
if resetAppData: runner.resetAppData(amount)
if updateApps: runner.updateApps(amount)

if startApps:
	runner.updateConfig(amount)
	runner.startInstances(amount)
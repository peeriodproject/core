#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import time
import shutil
import random
import json
import subprocess

appSrc = '../../src'
#amount = 1

import configBuilder

systemFolders = ['bin', 'configs']
folders = [name for name in os.listdir('.') if os.path.isdir(name)]

def extractApps(amount, delay = 30):
	i = 0

	global folders;

	print 'folders length', len(folders)

	if len(folders) - len(systemFolders) >= 0:
		i = len(folders) - len(systemFolders)
		print i

	if i < amount:
		print 'extracting ' + str(amount - i) + ' node-webkit instances'
		print '------------------------------------------------'

		for i in range(amount - i):
			print i
			os.system('open ' + './node-webkit.zip')
			time.sleep(delay)
		
	print 'waiting for ' + str(amount) + ' folders'
	print '------------------------------------------------'

	foldersExtracted = False
	while not foldersExtracted:
		folders = [name for name in os.listdir(".") if os.path.isdir(name)]
		print folders

		if len(folders) - len(systemFolders) >= amount:
			foldersExtracted = True
		else:
			time.sleep(1)

#print 'copying app into node-webkit instances'
#print '------------------------------------------------'
#folders = [name for name in os.listdir('.') if os.path.isdir(name)]
#j = 0
#for folder in folders:
#	isRunner = True
#
#	for sysFolder in systemFolders:
#		if folder == sysFolder:
#			isRunner = False
#			break
#
#	print folder
#
#	if j < amount and isRunner:
#		folder = folder.replace(' ', '\ ')
#		appDest = './' + folder + '/node-webkit.app/Contents/Resources/app.nw.zip'
#		print appDest
#		shutil.copyfile('./app.nw.zip', appDest)
#		os.system('open ' + appDest)
#		j += 1
#		time.sleep(30)
#		# todo remove zip file

# wait for zip extraction
#time.sleep(30)

def updateConfig(amount):
	print 'updating configs'
	print '------------------------------------------------'

	configs = []

	for file in os.listdir('./configs'):
		if file.endswith('.json'):
			configs.append(file)

	configIndexes = random.sample(range(0, len(configs)), amount)
	folders = [name for name in os.listdir('.') if os.path.isdir(name)]

	j = 0
	for folder in folders:
		isRunner = True

		for sysFolder in systemFolders:
			if folder == sysFolder:
				isRunner = False
				break

		if j < amount and isRunner:
			#folder = folder.replace(' ', '\ ')
			#folder = folder.replace('\\\\', '\ ')
			#print folder
			appDest = './' + folder + '/node-webkit.app/Contents/Resources/app.nw/config/mainConfig.json'
			shutil.copyfile('./configs/' + configs[configIndexes[j]], appDest)
			j += 1

	print 'updating app name'
	print '------------------------------------------------'

	j = 0
	for folder in folders:
		isRunner = True

		for sysFolder in systemFolders:
			if folder == sysFolder:
				isRunner = False
				break

		if j < amount and isRunner:
			packageFile = open('./' + folder + '/node-webkit.app/Contents/Resources/app.nw/package.json', 'r')
			content = json.loads(packageFile.read())
			packageFile.close()

			content['name'] = 'App-' + str(j)
			
			packageFile = open('./' + folder + '/node-webkit.app/Contents/Resources/app.nw/package.json', 'w')
			packageFile.write(json.dumps(content))
			packageFile.close()

			configFile = open('./' + folder + '/node-webkit.app/Contents/Resources/app.nw/config/mainConfig.json', 'r')
			config = json.loads(configFile.read())
			packageFile.close()

			config['app']['dataPath'] = '/Users/jj/Library/Application Support/App-' + str(j)

			configFile = open('./' + folder + '/node-webkit.app/Contents/Resources/app.nw/config/mainConfig.json', 'w')
			configFile.write(json.dumps(config))
			configFile.close()

			j += 1

def resetAppData(amount):
	print 'reset app runtime data'
	print '------------------------------------------------' 

	j = 0
	for folder in folders:
		isRunner = True

		for sysFolder in systemFolders:
			if folder == sysFolder:
				isRunner = False
				break

		if j < amount and isRunner:
			# clear routing table
			try:
				path = '/Users/jj/Desktop/abschluss_app/utils/topologyTestRunner/' + folder + '/node-webkit.app/Contents/Resources/app.nw/db/'
				os.remove(path + 'data.mdb')
				os.remove(path + 'lock.mdb')
			except OSError as e:
				pass

			j += 1

	# remove application support
	for a in range(amount):
		try:
			shutil.rmtree('/Users/jj/Library/Application Support/App-' + str(a))
		except:
			pass

def updateApps(amount):
	print "\n"'updating app sources'
	print '------------------------------------------------'

	print "\n"'- pulling latest changes'

	# pulling the latest changes from the main repo
	subprocess.call('cd /Users/jj/Desktop/testing/abschluss_app_src; git pull;', shell=True);

	print "\n"'- commiting changes to local remote'

	# commiting changes and pushing it to the app source (local) remote
	subprocess.call('cd /Users/jj/Desktop/testing/abschluss_app_src/src; git add . ; git commit -a -m "runner update: ' + str(time.time()) + '"; git push;', shell=True,  stdout=open(os.devnull, 'wb'));

	print "\n"'- updating ' + str(amount) + ' instances'
	# iterating over instances and pulling the latest changes from the (local) remote
	j = 0
	for folder in folders:
		isRunner = True

		for sysFolder in systemFolders:
			if folder == sysFolder:
				isRunner = False
				break

		if j < amount and isRunner:
			path = '/Users/jj/Desktop/abschluss_app/utils/topologyTestRunner/' + folder + '/node-webkit.app/Contents/Resources/app.nw'
			print folder

			subprocess.call('cd "' + path + '"; git stash save --keep-index; git stash drop; git pull;', shell=True, stdout=open(os.devnull, 'wb'));
			#packageFile = open('./' + folder + '/node-webkit.app/Contents/Resources/app.nw/package.json', 'r')

			j += 1



def startInstances(amount, delay, printFolderName=False):
	print 'starting '  + str(amount) + ' node-webkit instances'
	print '------------------------------------------------'

	j = 0
	for folder in folders:
		isRunner = True

		for sysFolder in systemFolders:
			if folder == sysFolder:
				isRunner = False
				break

		if j < amount and isRunner:
			#folder = folder.replace(' ', '\ ')
			if printFolderName: print folder
			os.system('open "' + folder + '/node-webkit.app"')
			time.sleep(delay)
			j += 1

def restartInstancesEverySeconds(seconds, amount, delay):
	print 'restarting all closed node-webkit instances'
	print '------------------------------------------------'
	startInstances(amount, delay, printFolderName=False)
	time.sleep(seconds)
	restartInstancesEverySeconds(seconds, amount, delay)
	
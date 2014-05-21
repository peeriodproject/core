#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import time
import shutil
import random

appSrc = '../../src'
amount = 3

import configBuilder

i = 0

systemFolders = ['bin', 'configs']

folders = [name for name in os.listdir('.') if os.path.isdir(name)]

print 'folders length', len(folders)

if len(folders) - len(systemFolders) >= 0:
	i = len(folders) - len(systemFolders)
	print i

if i < amount:
	print 'extracting ' + str(amount - i) + ' node-webkit instances'
	print '------------------------------------------------'

	for i in range(amount):
		print i
		os.system('open ' + './node-webkit.zip')
		time.sleep(30)
	
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

print 'updating configs'
print '------------------------------------------------'

configs = []

for file in os.listdir('./configs'):
	if file.endswith('.json'):
		configs.append(file)

configIndexes = random.sample(range(0, len(configs)), amount)

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
		#shutil.copyfile('./configs/' + configs[configIndexes[j]], appDest)
		j += 1


print 'starting node-webkit instances'
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
		print folder
		os.system('open "' + folder + '/node-webkit.app"')
		j += 1

	
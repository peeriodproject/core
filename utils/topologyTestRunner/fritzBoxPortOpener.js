var startPort = -1;
var processed = 0;
var amount = 100;

function run () {
	var isListPage = true;
	var pageLoadTimeout;

	var checkPage = function () {
		var form = window.frames['frame_content'].document.getElementsByTagName('form')[0];

		if (!form || !form.action) {
			runner();0
		}
		else if (startPort === -1) {
			startPort = parseInt(prompt('Port: 31000 + x', 0));
			processed = startPort;
			runner();
		}
		else if (form.action === 'http://fritz.box/internet/port_fw_edit.lua') {
			if (isListPage) {
				console.log('filling form');
				fillForm();
				isListPage = false;
			}
			else {
				runner();
			}
		}
		else if (form.action === 'http://fritz.box/internet/port_fw.lua') {
			if (!isListPage) {
				isListPage = true;
				console.log('on the list');
				var buttons = form.getElementsByTagName('button');
				for (var i in buttons) {
					if (buttons[i].name === 'new_rule') {
						buttons[i].click();
						break;
					}
				}
			}

			runner();
		}
	};

	var fillForm = function () {
		var form = window.frames['frame_content'].document.getElementsByTagName('form')[0];
		var inputs = form.getElementsByTagName('input');
		var port = startPort;

		// andere anwendungen
		form.getElementsByTagName('select')[0].selectedIndex = 5;
		form.getElementsByTagName('select')[0].onchange();

		// bezeichnung
		inputs[4].value = 'Peeriod Test' + (port + 1);

		// ports
		inputs[5].value = 31000 + port;
		inputs[6].value = 31000 + port;
		inputs[8].value = 31000 + port;

		isListPage = true;
		form.getElementsByTagName('button')[0].click();

		startPort++;
		processed++;

		if (processed < amount) {
			runner();
		}
		else {
			alert('opened ' + amount + ' ports!');
		}
	};

	var runner = function () {
		pageLoadTimeout = setTimeout(function () {
			checkPage();
		}, 10000);
	};

	runner();
}
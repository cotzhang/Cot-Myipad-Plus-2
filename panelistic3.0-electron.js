/*version: panelistic 3.0 for Electron apps*/
/*author: cotzhang@github*/

let panelistic_blur;
let panelistic_dialog_count = 0;
let panelistic_callback = { name: "callback" };

function Panelistic() {
	this.dialog = {};
	this.dialog.alert = function(title, content, button, callback) {
		let id = Date.now();
		panelistic_callback["v" + id] = callback ? callback : () => {};
		panelistic_blur.innerHTML += `<div class="panelistic_popup" id="${id}"><div class="panelistic_panel_dlct panelistic_popup_layout"><span class="panelistic_popup_title">${title}</span><br><span class="panelistic_placeholder"></span><span class="panelistic_popup_content">${content}</span></div><span class="panelistic_placeholder"></span><input type="button" class="defaultdismissbtn defaultcancelbtn" value="${button}" onclick="panelistic.dialog.dismiss(${id});panelistic_callback.v${id}();"><br></div>`;
		panelistic_blur.style.visibility = 'visible';
		if (document.getElementById("webview")) document.getElementById("webview").blur()
		panelistic_blur.focus()
		panelistic_dialog_count++;
		return id;
	};
	this.dialog.salert = function(content) {
		let id = Date.now();
		panelistic_blur.innerHTML += `<div class="panelistic_popup" id="${id}"><div class="panelistic_panel_dlct panelistic_popup_layout"><span class="panelistic_popup_content panelistic_salert"><div class="ldacontainer">
        <div class="loading">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>&nbsp;&nbsp;${content}</span></div></div>`;
		panelistic_blur.style.visibility = 'visible';
		panelistic_dialog_count++;
		return id;
	};
	this.dialog.input = function(title, content, placeholder, button, callback) {
		let id = Date.now();
		panelistic_callback["v" + id] = callback ? callback : () => {};
		panelistic_blur.innerHTML += `<div class="panelistic_popup" id="${id}"><div class="panelistic_panel_dlct panelistic_popup_layout"><span class="panelistic_popup_title">${title}</span><br><span class="panelistic_popup_content">${content}</span></div><input type="text" onload="this.focus()" placeholder=${placeholder} value="" id="input${id}" class="panelistic_dialog_input"><input type="button" class="defaultdismissbtn" value="${button}" onclick="panelistic_callback.v${id}(document.getElementById('input${id}').value);panelistic.dialog.dismiss(${id});"><input type="button" value="取消" onclick="panelistic.dialog.dismiss(${id});" class="defaultcancelbtn"><br></div>`;
		panelistic_blur.style.visibility = 'visible';
		panelistic_dialog_count++;
		if (document.getElementById("webview")) document.getElementById("webview").blur()
		panelistic_blur.focus()
		return id;
	};
	this.dialog.confirm = function(title, content, btntrue, btnfalse, callback) {
		let id = Date.now();
		panelistic_callback["v" + id] = callback ? callback : () => {};
		panelistic_blur.innerHTML += `<div class="panelistic_popup" id="${id}"><div class="panelistic_panel_dlct panelistic_popup_layout"><span class="panelistic_popup_title">${title}</span><br><span class="panelistic_placeholder"></span><span class="panelistic_popup_content">${content}</span></div><span class="panelistic_placeholder"></span><input type="button" value="${btntrue}" class="defaultdismissbtn" onclick="panelistic.dialog.dismiss(${id});panelistic_callback.v${id}(1);">&nbsp;<input type="button" value="${btnfalse}" onclick="panelistic.dialog.dismiss(${id});panelistic_callback.v${id}(0);" class="defaultcancelbtn"><br></div>`;
		panelistic_blur.style.visibility = 'visible';
		panelistic_dialog_count++;
		if (document.getElementById("webview")) document.getElementById("webview").blur()
		panelistic_blur.focus()
		return id;
	};
	this.dialog.dismiss = function(id) {
		if (panelistic_dialog_count > 0) {
			document.getElementById(id + "").remove();
			panelistic_dialog_count--;
			if (panelistic_dialog_count == 0) {
				panelistic_blur.style.visibility = 'hidden';
			}
		} else {
			return false;
		}
	};

	this.initialize = function() {
		panelistic_blur = document.getElementById('panelistic_blur');
		document.addEventListener('keydown', function(event) {
			if (event.key === 'Enter') {
				let dialogs = document.getElementsByClassName("panelistic_popup");
				if (dialogs.length > 0) {
					let topDialog = dialogs[dialogs.length - 1];
					let closeButton = topDialog.querySelector('.defaultdismissbtn');
					if (closeButton) {
						closeButton.click();
					}
				}
			}
			if (event.key === 'Escape') {
				let dialogs = document.getElementsByClassName("panelistic_popup");
				if (dialogs.length > 0) {
					let topDialog = dialogs[dialogs.length - 1];
					let closeButton = topDialog.querySelector('.defaultcancelbtn');
					if (closeButton) {
						closeButton.click();
					}
				}
			}
		});
		if (document.getElementById("webview")) {
			document.getElementById("webview").addEventListener('keydown', function(event) {
				if (event.key === 'Enter') {
					let dialogs = document.getElementsByClassName("panelistic_popup");
					if (dialogs.length > 0) {
						let topDialog = dialogs[dialogs.length - 1];
						let closeButton = topDialog.querySelector('.defaultdismissbtn');
						if (closeButton) {
							closeButton.click();
						}
					}
				}
				if (event.key === 'Escape') {
					let dialogs = document.getElementsByClassName("panelistic_popup");
					if (dialogs.length > 0) {
						let topDialog = dialogs[dialogs.length - 1];
						let closeButton = topDialog.querySelector('.defaultcancelbtn');
						if (closeButton) {
							closeButton.click();
						}
					}
				}
			});
		}

	};
}
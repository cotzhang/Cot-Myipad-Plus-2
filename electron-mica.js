// const wallpaper = require('node-wallpaper').default;
// wallpaper.get().then(wallpaper2 => {
let forceRef = false;
if (!fs.existsSync(getuserdatapath() + '/processed.jpg')) {
	forceRef = true;
} else {
	setWallpaper();
}


function refWallpaper() {
	document.getElementById('bgimg').src = document.getElementById('bgimg').src+"?ts="+Date.now();
}

function setWallpaper() {
	let wallpaper = getuserdatapath() + '/processed.jpg';
	log("Current wallpaper: " + wallpaper, 0)
	// 创建一个 Image 对象
	const backgroundImage = new Image();

	// 设置 Image 对象的 src 属性为 TranscodedWallpaper 文件路径
	backgroundImage.src = 'file://' + wallpaper;
	backgroundImage.id = "bgimg";

	document.body.appendChild(backgroundImage)
}

require("electron").ipcRenderer.on("wpupd", (event, message) => {
	if (!forceRef) { refWallpaper() } else { setWallpaper() }
})
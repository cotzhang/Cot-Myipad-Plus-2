const wallpaper = require('node-wallpaper').default;
wallpaper.get().then(wallpaper2 => {
	if (!fs.existsSync(getuserdatapath() + '/processed.jpg')) {
		processImage(wallpaper2, (wallpaper) => {
			log("Current wallpaper: " + wallpaper, 0)
			// 创建一个 Image 对象
			const backgroundImage = new Image();

			// 设置 Image 对象的 src 属性为 TranscodedWallpaper 文件路径
			backgroundImage.src = 'file://' + wallpaper;
			backgroundImage.id = "bgimg";

			document.body.appendChild(backgroundImage)

			// 监听图片加载完成事件
			backgroundImage.onload = function() {
				// 将图片设置为 body 的背景图像
				// document.body.style.backgroundImage = `url('${backgroundImage.src}')`;
			};
		})
	} else {
		let wallpaper = getuserdatapath() + '/processed.jpg';
		log("Current wallpaper: " + wallpaper, 0)
		// 创建一个 Image 对象
		const backgroundImage = new Image();

		// 设置 Image 对象的 src 属性为 TranscodedWallpaper 文件路径
		backgroundImage.src = 'file://' + wallpaper;
		backgroundImage.id = "bgimg";

		document.body.appendChild(backgroundImage)

		// 监听图片加载完成事件
		backgroundImage.onload = function() {
			// 将图片设置为 body 的背景图像
			// document.body.style.backgroundImage = `url('${backgroundImage.src}')`;
		};
	}
});

function refWallpaper() {
	document.getElementById('bgimg').src = document.getElementById('bgimg').src;
}

function processImage(inputPath, callback) {
	// 获取用户数据路径
	const userDataPath = getuserdatapath() + '/processed.jpg';
	const sharp = require('sharp');

	sharp(inputPath)
		.blur(100)
		.toFile(userDataPath, function(err) {
			if (err) {
				log('Error during image processing:'+ err.message,2);
			} else {
				callback(userDataPath)
			}
		});
}
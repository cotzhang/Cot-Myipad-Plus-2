const { app } = require('electron')


getuserdatapath = () => {
  if (process.platform != 'win32') {
    return process.cwd() + '/ldata'
  }
  if (fs.existsSync(process.cwd() + '/onusb')) {
    return process.cwd() + '/data'
  }
  return require('path').join(process.env.appdata, 'cmp').replaceAll('\\', '/')
}

// Linux detection
if (process.platform != 'win32') {
  // Hey, you are using the linux system!
  getuserdatapath = () => {
    return process.cwd() + '/ldata'
  }
}
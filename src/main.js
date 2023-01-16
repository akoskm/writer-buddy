const {app, BrowserWindow, Menu, Tray, ipcMain} = require('electron');
const path = require('path');
const ioHook = require('iohook');
const fs = require('fs');
const PImage = require('pureimage');

let tray = null;
let goal = 1000;
let wordCount = 0;
const SPACE = 57;
const ENTER = 28;

const indexHtmlPath = path.resolve( __dirname,'../resources/index.html');

function getProgressBarPath () {
  return path.resolve( __dirname,'../resources/progress_bar.png');
}
const preloadScriptPath = path.join(__dirname, 'preload.js');

const font = PImage.registerFont(path.resolve( __dirname, '../resources/RobotoMono-VariableFont_wght.ttf'), 'Roboto');
font.loadSync();

async function createProgressBarImage() {
  const progressInPercent = (wordCount / goal) * 100;
  var img = PImage.make(100, 20);
  var ctx = img.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 100, 20);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(0, 0, wordCount < goal ? progressInPercent : 100, 20);
  ctx.fillStyle = '#0000ff';
  ctx.font = "20pt Roboto";
  ctx.fillText(`${wordCount}/${goal}`, 5, 17);
  await PImage.encodePNGToStream(img, fs.createWriteStream(getProgressBarPath()));
}

async function updateProgressBar(tray) {
  await createProgressBarImage();
  tray.setImage(getProgressBarPath());
}

function reloadTrayTitle(tray) {
  const title = `Daily goal: ${wordCount} / ${goal} words`;
  tray.setToolTip(title)
}

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 400, height: 400, webPreferences: {
      contextIsolation: true, preload: preloadScriptPath,
    }
  })

  win.loadFile(indexHtmlPath)

  tray = new Tray(getProgressBarPath());
  updateProgressBar(tray);

  let isTracking = false;
  let isHidden = false;

  const menuTemplate = [{
    id: 'tracker', label: getLabelText(), click: () => {
      isTracking = !isTracking;
      if (isTracking) ioHook.start();

      menuTemplate[0].label = getLabelText();
      const contextMenu = Menu.buildFromTemplate(menuTemplate)
      tray.setContextMenu(contextMenu)
    }
  }, {
    id: 'hide', label: 'Hide', click: () => {
      if (isHidden) {
        app.show();
        menuTemplate[1].label = 'Hide';
      } else {
        app.hide()
        menuTemplate[1].label = 'Show';
      }
      isHidden = !isHidden;

      const contextMenu = Menu.buildFromTemplate(menuTemplate)
      tray.setContextMenu(contextMenu)
    }
  }, {
    id: 'quit', label: 'Quit', click: () => {
      app.exit();
    }
  }]

  function getLabelText() {
    return isTracking ? 'Stop tracking' : 'Start tracking'
  }

  const contextMenu = Menu.buildFromTemplate(menuTemplate)
  tray.setContextMenu(contextMenu)
  updateProgressBar(tray);
  reloadTrayTitle(tray)

  console.log('registering keydown event');

  let previousEvent;

  ioHook.on('keydown', (event) => {
    if (!isTracking) return;

    if (event.keycode === SPACE || event.keycode === ENTER) {
      if (previousEvent.keycode !== SPACE && previousEvent.keycode !== ENTER) {
        wordCount += 1
        reloadTrayTitle(tray)
        updateProgressBar(tray);
      }
    }

    previousEvent = event;
  });

  ipcMain.handle('set-goal', async function setGoal(_event, wordGoal) {
    goal = wordGoal;
    updateProgressBar(tray);
    reloadTrayTitle(tray);
  })
}

app.whenReady().then(async () => {
  await createProgressBarImage();
  createWindow();
})

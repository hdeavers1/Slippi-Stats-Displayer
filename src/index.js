const { app, BrowserWindow } = require('electron');
const { ipcMain, dialog } = require('electron');
const { ipcRenderer } = require('electron');
const puppeteer = require('puppeteer');
const { SlippiGame } = require("@slippi/slippi-js");
const fs = require("fs");
const path = require('path');
const Store = require('electron-store');
const store = new Store();

let mainWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
   mainWindow = new BrowserWindow({
    width: 650,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

//listen for events and change screen data
ipcMain.on('update-folder', (event, selectedFolderPath) => {
    store.set('selectedFolderPath', selectedFolderPath);
});

ipcMain.on('get-selected-folder-path', (event) => {
    const selectedFolderPath = store.get('selectedFolderPath', null);
    event.returnValue = selectedFolderPath;
  });

ipcMain.handle('open-dialog', async () => {
    return await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
  });

let  lastProcessedFile = null;

//main line
ipcMain.on('start-processing', (event) => {

    const selectedFolderPath = store.get('selectedFolderPath', null);
    userPath = selectedFolderPath;
    processMostRecentSlpFile(userPath);
    runPuppeteer();

    const interval = setInterval(() => {
        processMostRecentSlpFile(userPath);
    }, 6000); //60000 = 60 seconds
    
    process.on("SIGINT", () => {
        clearInterval(interval);
        process.exit();
    });
  });

//function that transmute data in the app
async function findMostRecentSlpFile(directory) {
    const slpFiles = fs
        .readdirSync(directory)
        .filter((file) => path.extname(file).toLowerCase() === ".slp")
        .map((file) => path.join(directory, file))
        .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());

    return slpFiles[0] || null;
}

async function processMostRecentSlpFile(pathInput) {

    findMostRecentSlpFile(pathInput);

    const mostRecentSlpFile = await findMostRecentSlpFile(pathInput);


    if (mostRecentSlpFile && mostRecentSlpFile !== lastProcessedFile) {
        lastProcessedFile = mostRecentSlpFile;

            
            let game = new SlippiGame(mostRecentSlpFile, { processOnTheFly: true });
            let settings = game.getSettings();
            let stats = game.getStats();
        
            let player1 = settings.players[0].connectCode;
            let player2 = settings.players[1].connectCode;

            let player1link = "https://slippi.gg/user/" + player1.replace("#", "-");
            let player2link = "https://slippi.gg/user/" + player2.replace("#", "-");

            let playerInfo = await runPuppeteer(player1link, player2link);

            //create ranked image from text
            playerInfo[0][0].rank = rankedImage(playerInfo[0][0].rank);
            playerInfo[1][0].rank = rankedImage(playerInfo[1][0].rank);
            //remove null from character array and characters played from prior seasons
            playerInfo[0][0].characters = removeNullAndAfter(playerInfo[0][0].characters);
            playerInfo[1][0].characters = removeNullAndAfter(playerInfo[1][0].characters);
            //breaks the character data apart and inserts the percentage into its own array, and characters into its own
            sendPercentages(playerInfo[0][0].characters, playerInfo[0][0].percentages);
            sendPercentages(playerInfo[1][0].characters, playerInfo[1][0].percentages);
            //change character to display stock icon
            playerInfo[0][0].characters = characterStock(playerInfo[0][0].characters);
            playerInfo[1][0].characters = characterStock(playerInfo[1][0].characters);

            logInfo(mainWindow, playerInfo);

            do {
                await new Promise(resolve => setTimeout(resolve, 1000));
    
                game = new SlippiGame(mostRecentSlpFile, { processOnTheFly: true });
                stats = game.getStats();
            } while (!stats.gameComplete);    

            let player1stats = {
                "Total Damage": stats.overall[0]?.totalDamage?.toFixed(2) || 'null',
                "Inputs Per Minute": stats.overall[0]?.inputsPerMinute?.ratio?.toFixed(2) || 'null',
                "Openings Per Kill": stats.overall[0]?.openingsPerKill.ratio?.toFixed(2) || 'null',
                "Neutral Win Ratio": stats.overall[0]?.neutralWinRatio.ratio?.toFixed(2) || 'null',
                "Character": characterAssigner(settings.players[0]?.characterId),
                "Character Color": stockIconAssigner(characterAssigner(settings.players[0]?.characterId), settings.players[0].characterColor),
                "Kills": stats.overall[0].killCount,
                "Stage": stageAssigner(settings.stageId)
              };
              let player2stats = {
                "Total Damage": stats.overall[1]?.totalDamage?.toFixed(2) || 'null',
                "Inputs Per Minute": stats.overall[1]?.inputsPerMinute?.ratio?.toFixed(2) || 'null',
                "Openings Per Kill": stats.overall[1]?.openingsPerKill?.ratio?.toFixed(2) || 'null',
                "Neutral Win Ratio": stats.overall[1]?.neutralWinRatio?.ratio?.toFixed(2) || 'null',
                "Character": characterAssigner(settings.players[1]?.characterId),
                "Character Color": stockIconAssigner(characterAssigner(settings.players[1]?.characterId), settings.players[1].characterColor),
                "Kills": stats.overall[1].killCount
              };
              
              logStats(mainWindow, player1stats, player2stats, playerInfo);
    }
}

//send data to the main window
function logInfo(mainWindow, playerInfo) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-player-info', { playerInfo });
    } else {
        console.error("mainWindow is not available to send update-player-info event.");
    }
}

function logStats(mainWindow, player1stats, player2stats, playerInfo) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-player-stats', { player1stats, player2stats, playerInfo });
    } else {
        console.error("mainWindow is not available to send update-player-stats event.");
    }
}

//create puppeteer scraping
async function runPuppeteer(player1link, player2link) {
    
const browser = await puppeteer.launch({headless: "true"});
    
async function scrapePlayerInfo(playerlink) {
    const page = await browser.newPage();
    
    await page.goto(playerlink);

    console.log("navigating to: " + playerlink);

    await new Promise(resolve => setTimeout(resolve, 1000));

    return page.evaluate(() =>
        Array.from(document.querySelectorAll('.content'), (e) => ({
            name: e.querySelector('#root > div > div > div > div > div.jss4 > div > div.jss7 p').innerText,
            tag: e.querySelector('#root > div > div > div > div > div.jss4 > div > div.jss7 > p.MuiTypography-root.MuiTypography-body1.css-k11z2a').innerText,
            rank: e.querySelector('#root > div > div > div > div > div.jss4 > div > div.jss7 > p.MuiTypography-root.MuiTypography-body1.jss13.css-jh714q').innerText,
            rating: e.querySelector('#root > div > div > div > div > div.jss4 > div > div.jss7 > p.MuiTypography-root.MuiTypography-body1.jss14.css-1rxv754').innerText,
            characters: Array.from(e.querySelectorAll('.jss25.container img'), (img) => img.getAttribute('aria-label')),
            percentages: [],
            wins: e.querySelector('#root > div > div > div > div > div.jss25.container > div > div.jss18 > div:nth-child(2) > div > p.MuiTypography-root.MuiTypography-body1.css-1i7pcxu').innerText,
            slash: e.querySelector('#root > div > div > div > div > div.jss25.container > div > div.jss18 > div:nth-child(2) > div > p.MuiTypography-root.MuiTypography-body1.css-12l30yr').innerText,
            loses: e.querySelector('#root > div > div > div > div > div.jss25.container > div > div.jss18 > div:nth-child(2) > div > p.MuiTypography-root.MuiTypography-body1.css-2bid3n').innerText,
         }))
    );
}

let player1info = player1link ? await scrapePlayerInfo(player1link) : null;
let player2info = player2link ? await scrapePlayerInfo(player2link) : null;

await browser.close();

return [player1info, player2info];
    
} 

// functions that change data into images/ others
function stockIconAssigner(string, id) {
    let icon = null;
    icon = "images/stockIcon/" + string + "-" + id + ".png";
    return icon;
}

function removeNullAndAfter (arr) {
    let index = arr.indexOf(null);
    if (index !== -1) {
        return arr.slice(0, index);
    }
    return arr;
}

function sendPercentages(arr, arr2) {
    for (let i = 0; i < arr.length; i++) {
        const tempArr = arr[i].split(" ");
        arr[i] = tempArr[0];

        for (let j = 0; j < tempArr[1].length; j++) {
            // Remove parentheses from the percentages
            tempArr[1] = tempArr[1].replace(/[\(\),]/g, "");
        }
        tempArr[1] = tempArr[1] + ' ';
        arr2.push(tempArr[1]);
    }
    return;
}

function characterStock(arr) {
for (let i = 0; i < arr.length; i++) {
switch (arr[i]) {
    case 'Falcon':
    arr[i] = 'images/stockIcon/Falcon-0.png';
        break;
    case 'DK':
        arr[i] = 'images/stockIcon/DK-0.png';
        break;
    case "Fox":
        arr[i] = 'images/stockIcon/Fox-0.png';
        break;
    case 'G&W':
        arr[i] = 'images/stockIcon/G&W-0.png';
        break;
    case 'Kirby':
        arr[i] = 'images/stockIcon/Kirby-0.png';
        break;
    case 'Bowser':
        arr[i] = 'images/stockIcon/Bowser-0.png';
        break;
    case 'Link':
        arr[i] = 'images/stockIcon/Link-0.png';
        break;
    case 'Luigi':
        arr[i] = 'images/stockIcon/Luigi-0.png';
        break;
    case 'Mario':
        arr[i] = 'images/stockIcon/Mario-0.png';
        break;
    case 'Marth':
        arr[i] = 'images/stockIcon/Marth-0.png';
        break;
    case "Mewtwo":
        arr[i] = 'images/stockIcon/Mewtwo-0.png';
        break;
    case "Ness":
        arr[i] = 'images/stockIcon/Ness-0.png';
        break;
    case "Peach":
        arr[i] = 'images/stockIcon/Peach-0.png';
        break;
    case 'Pikachu':
        arr[i] = 'images/stockIcon/Pikachu-0.png';
        break;
    case 'ICs':
        arr[i] = 'images/stockIcon/ICs-0.png';
        break;
    case 'Puff':
        arr[i] = 'images/stockIcon/Puff-0.png';
        break;
    case 'Samus':
        arr[i] = 'images/stockIcon/Samus-0.png';
        break;
    case 'Yoshi':
        arr[i] = 'images/stockIcon/Yoshi-0.png';
        break;
    case 'Zelda':
        arr[i] = 'images/stockIcon/Zelda-0.png';
        break;
    case 'Sheik':
        arr[i] = 'images/stockIcon/Sheik-0.png';
        break;
    case "Falco":
        arr[i] = 'images/stockIcon/Falco-0.png';
        break;
    case "YLink":
        arr[i] = 'images/stockIcon/YLink-0.png';
        break;
    case "Doc":
        arr[i] = 'images/stockIcon/Doc-0.png';
        break;
    case 'Roy':
        arr[i] = 'images/stockIcon/Roy-0.png';
        break;
    case 'Pichu':
        arr[i] = 'images/stockIcon/Pichu-0.png';
        break;
    case 'Ganon':
        arr[i] = 'images/stockIcon/Ganon-0.png';
        break;
    default:
    arr[i] = "Unknown Character";
    }
}
return arr;
}

function characterAssigner(id) {
switch (id) {
    case 0:
    return "Falcon";

    case 1:
    return "DK";

    case 2:
    return "Fox";

    case 3:
    return 'G&W';

    case 4:
    return 'Kirby';

    case 5:
    return 'Bowser';

    case 6:
    return 'Link';

    case 7:
    return 'Luigi';

    case 8:
    return 'Mario';

    case 9:
    return "Marth";

    case 10:
    return "Mewtwo";

    case 11:
    return "Ness";

    case 12:
    return "Peach";

    case 13:
    return 'Pikachu';

    case 14:
    return 'ICs';

    case 15:
    return 'Puff';

    case 16:
    return 'Samus';

    case 17:
    return 'Yoshi';

    case 18:
    return 'Zelda';

    case 19:
    return 'Sheik';

    case 20:
    return "Falco";

    case 21:
    return "YLink";

    case 22:
    return "Doc";

    case 23:
    return 'Roy';

    case 24:
    return 'Pichu';

    case 25:
    return 'Ganon';

    case 26:
    return 'Master Hand';

    case 27:
    return 'Wireframe (Male)';

    case 28:
    return 'WireFrame (Female)';

    case 29:
    return 'Gigabowser';

    case 30:
    return "Crazy Hand";

    case 31:
    return "Sandbag";

    case 32:
    return 'Popo';

    default:
        return "Unknown Character";
    }

}

function stageAssigner(id) {
switch(id) {
    case 2:
        return 'images/stageImage/fountain_of_dreams.webp';
    case 3:
        return 'images/stageImage/pokemon_stadium.webp';
    case 8:
        return 'images/stageImage/yoshis_story.webp';
    case 28:
        return 'images/stageImage/dream_land.webp';
    case 31:
        return 'images/stageImage/battlefield.webp';
    case 32:
        return 'images/stageImage/Final_Destination.webp';
    default:
        return 'Unknown Stage';
    }
}

function rankedImage(id) {
switch(id) {
    case 'BRONZE 1':
        return 'images/ranks/bronze_1.svg';
    case 'BRONZE 2':
        return 'images/ranks/bronze_2.svg';
    case 'BRONZE 3':
        return 'images/ranks/bronze_3.svg';
    case 'SILVER 1':
        return 'images/ranks/silver_1.svg';
    case 'SILVER 2':
        return 'images/ranks/silver_2.svg';
    case 'SILVER 3':
        return 'images/ranks/silver_3.svg';
    case 'GOLD 1':
        return 'images/ranks/gold_1.svg';
    case 'GOLD 2':
        return 'images/ranks/gold_2.svg';
    case 'GOLD 3':
        return 'images/ranks/gold_3.svg';
    case 'PLATINUM 1':
        return 'images/ranks/platinum_1.svg';
    case 'PLATINUM 2':
        return 'images/ranks/platinum_2.svg';
    case 'PLATINUM 3':
        return 'images/ranks/platinum_3.svg';
    case 'DIAMOND 1':
        return 'images/ranks/diamond_1.svg';
    case 'DIAMOND 2':
        return 'images/ranks/diamond_2.svg';
    case 'DIAMOND 3':
        return 'images/ranks/diamond_3.svg';
    case 'MASTER 1':
        return 'images/ranks/master_1.svg';
    case 'MASTER 2':
        return 'images/ranks/master_2.svg';
    case 'MASTER 3':
        return 'images/ranks/grandmaster.svg';
    case 'GRANDMASTER':
        return 'images/ranks/grandmaster.svg';
    default:
        return 'images/ranks/unranked.svg';
    }
}


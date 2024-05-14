const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startButton');
  const folderButton = document.getElementById('folderButton');
  const selectedFolderPathInput = document.getElementById('selectedFolderPath');

  startButton.addEventListener('click', () => {
    const directoryContainer = document.querySelector('.directory-container');
    directoryContainer.classList.add('up-screen');

    ipcRenderer.send('start-processing');
  });

  folderButton.addEventListener('click', () => {
    ipcRenderer.invoke('open-dialog').then((result) => {
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedFolderPath = result.filePaths[0];

        ipcRenderer.send('update-folder', selectedFolderPath);

        selectedFolderPathInput.value = selectedFolderPath;
      }
    }).catch((err) => {
      console.error(err);
    });
  });
  selectedFolderPathInput.value = ipcRenderer.sendSync('get-selected-folder-path');
});

ipcRenderer.on('update-player-info', (event, data) => {
    // Update player 1 information
    const playerInfoContainer = document.querySelector('.player-container');
    const playerStatsContainer = document.querySelector('.playerStats');
    playerInfoContainer.classList.add('on-screen');
    playerStatsContainer.classList.remove('on-screen');
    document.getElementById('p1name').innerText = data.playerInfo[0][0].name;
    document.getElementById('p1tag').innerText = data.playerInfo[0][0].tag;
    document.getElementById('p1rank').innerHTML = `<img src="${data.playerInfo[0][0].rank}" alt="Player 1 Rank Image" height="175px" width="175px">`;
    document.getElementById('p1rating').innerText = data.playerInfo[0][0].rating;
    document.getElementById('p1wins').innerText = data.playerInfo[0][0].wins;
    document.getElementById('p1loses').innerText = data.playerInfo[0][0].loses;
    document.getElementById('p1slash').innerText = data.playerInfo[0][0].slash;

    // Update player 1 character and percentage containers
    let characterContainer1 = document.getElementById('player1characters');
    let percentageContainer1 = document.getElementById('player1percentages');
    
    // Clear the existing content of the containers
    characterContainer1.innerHTML = '';
    percentageContainer1.innerHTML = '';
    
    // Iterate through each character and create an img element
    data.playerInfo[0][0].characters.forEach((character, index) => {
        // Create an img element
        let characterImg = document.createElement('img');
      
        // Set the src attribute to the character's image URL
        characterImg.src = character;
      
        // Set alt text, height, and width attributes
        characterImg.alt = 'stock icon';
        characterImg.height = 50;
        characterImg.width = 50;
      
        // Append the img element to the character container
        characterContainer1.appendChild(characterImg);

        let percentagesArray = data.playerInfo[0][0].percentages[index].split(' ');

        // Create a percentage element
        percentagesArray.forEach((percentage, percentageIndex) => {
            const percentageSpan = document.createElement('span');
            percentageSpan.innerText = percentage;
    
            // Append the percentage element to the percentage container
            percentageContainer1.appendChild(percentageSpan);
    
            // Add a space after each percentage (except the last one)
            if (percentageIndex < percentagesArray.length - 1) {
                const spaceSpan = document.createElement('span');
                spaceSpan.innerText = ' ';
                percentageContainer1.appendChild(spaceSpan);
            }
        });
        // Add a space after each character (except the last one)
        if (index < data.playerInfo[0][0].characters.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.innerText = ' ';
        characterContainer1.appendChild(spaceSpan);
     }
    });

    // Update player 2 information
    console.log(data.playerInfo[1][0]);
    document.getElementById('p2name').innerText = data.playerInfo[1][0].name;
    document.getElementById('p2tag').innerText = data.playerInfo[1][0].tag;
    document.getElementById('p2rank').innerHTML = `<img src="${data.playerInfo[1][0].rank}" alt="Player 2 Rank Image" height="175px" width="175px">`;
    document.getElementById('p2rating').innerText = data.playerInfo[1][0].rating;
    document.getElementById('p2wins').innerText = data.playerInfo[1][0].wins;
    document.getElementById('p2loses').innerText = data.playerInfo[1][0].loses;
    document.getElementById('p2slash').innerText = data.playerInfo[1][0].slash;

    // Update player 2 character and percentage containers
    const characterContainer2 = document.getElementById('player2characters');
    const percentageContainer2 = document.getElementById('player2percentages');

    // Clear the existing content of the containers
    characterContainer2.innerHTML = '';
    percentageContainer2.innerHTML = '';

    // Iterate through each character and create an img element
    data.playerInfo[1][0].characters.forEach((character, index) => {
        // Create an img element
        const characterImg = document.createElement('img');
      
        // Set the src attribute to the character's image URL
        characterImg.src = character;
      
        // Set alt text, height, and width attributes
        characterImg.alt = 'stock icon';
        characterImg.height = 50;
        characterImg.width = 50;
      
        // Append the img element to the character container
        characterContainer2.appendChild(characterImg);

        const percentagesArray2 = data.playerInfo[1][0].percentages[index].split(' ');

        // Create a percentage element
        percentagesArray2.forEach((percentage, percentageIndex) => {
            const percentageSpan = document.createElement('span');
            percentageSpan.innerText = percentage;
    
            // Append the percentage element to the percentage container
            percentageContainer2.appendChild(percentageSpan);
    
            // Add a space after each percentage (except the last one)
            if (percentageIndex < percentagesArray2.length - 1) {
                const spaceSpan = document.createElement('span');
                spaceSpan.innerText = ' ';
                percentageContainer2.appendChild(spaceSpan);
            }
        });
        // Add a space after each character (except the last one)
        if (index < data.playerInfo[1][0].characters.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.innerText = ' ';
        characterContainer2.appendChild(spaceSpan);
     }
    });
});
ipcRenderer.on('update-player-stats', (event, data) => {
    // Player 1 Stats
    const playerInfoContainer = document.querySelector('.player-container');
    const playerStatsContainer = document.querySelector('.playerStats');
    playerStatsContainer.classList.add('on-screen');
    playerInfoContainer.classList.remove('on-screen');

    const appendImagesToContainer = (containerId, images, kills) => {
        const containerElement = document.getElementById(containerId);
        containerElement.innerHTML = ''; // Clear existing content

        for (let i = 0; i < Math.min(4, images.length); i++) {
            const imageElement = document.createElement('img');
            imageElement.src = images;
            imageElement.alt = 'Stock Icon';
            imageElement.height = 60;
            imageElement.width = 60;

            if (kills > 0) {
            imageElement.style.opacity = .2;
            }
            containerElement.appendChild(imageElement);
            kills = kills - 1;
        }

        containerElement.style.display = 'flex';
    };

    appendImagesToContainer('p1color', data.player1stats['Character Color'], data.player2stats['Kills']);
    appendImagesToContainer('p2color', data.player2stats['Character Color'], data.player1stats['Kills']);

    document.getElementById('player1name').innerText = data.playerInfo[0][0].name;
    document.getElementById('p1dmg').innerText = data.player1stats['Total Damage'];
    document.getElementById('p1input').innerText = data.player1stats['Inputs Per Minute'];
    document.getElementById('p1open').innerText = data.player1stats['Openings Per Kill'];
    document.getElementById('p1neutral').innerText = data.player1stats['Neutral Win Ratio'];
    document.getElementById('p1stage').innerHTML = `<img src="${data.player1stats['Stage']}" alt="Stage Image" height="700px" width="636px">`;

    document.getElementById('player2name').innerText = data.playerInfo[1][0].name;
    document.getElementById('p2dmg').innerText = data.player2stats['Total Damage'];
    document.getElementById('p2input').innerText = data.player2stats['Inputs Per Minute'];
    document.getElementById('p2open').innerText = data.player2stats['Openings Per Kill'];
    document.getElementById('p2neutral').innerText = data.player2stats['Neutral Win Ratio'];
});
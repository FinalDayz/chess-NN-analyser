const { Chess } = require('chess.js');

const { spawn } = require('child_process');
const { log } = require('console');
const fs = require('fs');

const NEWLINE = '\r\n';

const DATA_OUTPUT_FILE = 'positions.fen';
const DATA_INPUT_FILE = '../chess neural network evaluator/lichess_data_generator/lichess_db_standard_rated_2014-01.pgn';

function start() {
  analyseGames();
}

function parseGamePGN(gamePGN) {
  const game = new Chess();
  game.loadPgn(gamePGN);
  const replayGame = new Chess();

  const gameOutput = [];

  // 0.5: For 700k games, 0: ~650,  1: ~715,  2: ~1400,  3: ~2700
  let startRecordFromMove = 9;
  while (Math.random() > 0.4 && startRecordFromMove > 0) {
    startRecordFromMove--;
  };
  let moveIndex = 0;

  const recordGame = async () => {
    const fen = replayGame.fen();
    gameOutput.push(fen);
  }

  for (const move of game.history()) {
    if (moveIndex >= startRecordFromMove) {
      recordGame();
    }

    replayGame.move(move);
    moveIndex++;
  }
// 18 838 323
  recordGame();

  return gameOutput;
}

async function analyseGames() {
  let gameCount = 0;
  let batchGameMoves = [];
  let totalGameMovesCount = 0;
  let sessionGamesMovesCount = 0;
  let sessionGameCount = 0;

  if (!fs.existsSync(DATA_INPUT_FILE)) {
    log("Error, file " + DATA_INPUT_FILE + " not found.");
    return;
  }
  let rawGameDataBuffer = fs.readFileSync(DATA_INPUT_FILE);
  log('Loaded file of size ' + Math.round(rawGameDataBuffer.length / 1024 / 1024) + 'mb');

  let currentLine = '';
  let TOTAL_GAMES = 697_600;

  let numberOfGamesToSkip = 0;

  if (fs.existsSync(DATA_OUTPUT_FILE)) {
    console.log('File \'' + DATA_OUTPUT_FILE + '\' exist, trying to start from where it was left off...');

    outputDataItterator = fs.readFileSync(DATA_OUTPUT_FILE).entries();
    let lastMoveNumber = 0;

    foreachBufferNewLine(outputDataItterator, (line) => {
      totalGameMovesCount++;
      const moveNumber = parseInt(line.split('|')[0].split(' ')[5]);
      if (moveNumber < lastMoveNumber) {
        numberOfGamesToSkip++;
        gameCount++;
      }
      lastMoveNumber = moveNumber;
    });

    console.log("Going to skip " + numberOfGamesToSkip + " games, so " + Math.round(gameCount * 100 / TOTAL_GAMES) + "% of games");
  }

  let timeStart = Date.now();
  for (const bufferEntry of rawGameDataBuffer.entries()) {
    const entryChar = String.fromCharCode(bufferEntry[1]);
    if (entryChar !== '\n') {
      currentLine += entryChar;
      continue;
    }
    if (!currentLine.startsWith('1. ')) {
      currentLine = '';
      continue;
    }

    // Logic for starting where it was left last time
    if (numberOfGamesToSkip > 0) {
      numberOfGamesToSkip--;
      currentLine = '';
      continue;
    }

    gameOutput = parseGamePGN(currentLine);

    totalGameMovesCount += gameOutput.length;
    sessionGamesMovesCount += gameOutput.length;

    batchGameMoves.push(...gameOutput);
    if (gameCount % 5000 == 0) {
      log("Writing to file " + DATA_OUTPUT_FILE + " ...");
      arrayToChunks(batchGameMoves, (chunkStr) => {
        fs.appendFileSync(DATA_OUTPUT_FILE, chunkStr);
      }, 50000);
      batchGameMoves = [];
    };

    gameCount++;
    sessionGameCount++;
    if (gameCount % 399 == 0) {
      const msElapsed = Date.now() - timeStart;
      const msRemaining = msElapsed / (sessionGameCount / (TOTAL_GAMES - numberOfGamesToSkip)) - msElapsed

      log(
        msToTime(msElapsed) + "]",
        gameCount, ":", Math.round(gameCount * 100 / TOTAL_GAMES * 10) / 10, "% ",
        "Tot moves:", totalGameMovesCount, ",added:", sessionGamesMovesCount,
        'time remaining:', msToTime(msRemaining),
      );
    }

    currentLine = '';

  }

  log("[FINAL] Writing to file " + DATA_OUTPUT_FILE + " ...");
  arrayToChunks(batchGameMoves, (chunkStr) => {
    fs.appendFileSync(DATA_OUTPUT_FILE, chunkStr);
  }, 50000);

  console.log("Done!!");
}

function foreachBufferNewLine(bufferEntriesItterator, lineCallback) {
  let currentLine = '';

  for (const bufferEntry of bufferEntriesItterator) {
    const entryChar = String.fromCharCode(bufferEntry[1]);
    if (entryChar !== '\n') {
      currentLine += entryChar;
      continue;
    }

    const callbackResult = lineCallback(currentLine);
    if (callbackResult) {
      return callbackResult;
    }
    currentLine = '';
  }

  return undefined;
}

function arrayToChunks(arr, callback, CHUNK_SIZE) {
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    // const isLast = i + CHUNK_SIZE >= arr.length;
    const chunks = arr.slice(i, i + CHUNK_SIZE);
    let chunkStr = "";
    for (const chunkObj of chunks) {
      chunkStr += chunkObj + '\n';
    }

    callback(chunkStr);
  }
}

function convertJSONPositionDataToRaw(inputJSON, outputRaw) {
  const fileData = JSON.parse(fs.readFileSync(inputJSON));

  fs.writeFileSync(outputRaw, "");
  arrayToChunks(fileData, (chunkStr) => {
    fs.appendFileSync(outputRaw, chunkStr);
  }, 50000);

  console.log("Done!");
}

function getNewLines(fileName) {
  return new Promise((acc, _) => {
    let count = 0;
    let foundNewLine = false;
    fs.createReadStream(fileName)
      .on('data', function (chunk) {
        for (i = 0; i < chunk.length; ++i) {
          if (chunk[i] === 10) foundNewLine = true;
          if (chunk[i] === 49 && foundNewLine === true) count++;

          if (chunk[i] !== 10) foundNewLine = false;
        }
      })
      .on('end', function () {
        acc(count);
      });
  })
}

function msToTime(time) {
  time = time / 1000;
  timeSec = Math.floor(time % 60);
  time = time / 60;
  timeMin = Math.floor(time % 60);
  time = time / 60;
  timeHr = Math.floor(time % 60);
  time = time / 60;

  return (timeHr > 0 ? timeHr.toString().padStart(2, '0') + ':' : '') +
    timeMin.toString().padStart(2, '0') + ":" +
    timeSec.toString().padStart(2, '0')
}

start();
// convertJSONPositionDataToRaw(
//   'positionData.json',
//   'positionData.raw'
// );
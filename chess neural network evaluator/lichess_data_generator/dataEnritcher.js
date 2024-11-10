const { Chess } = require('chess.js');
const { spawn } = require('child_process');
const { log } = require('console');
const fs = require('fs');

const DATA_INPUT_FILE = 'positionData_depth_2_1.4g.raw';
const DATA_OUTPUT_FILE = 'positionData_depth_2_enriched.raw';
const NEWLINE = '\r\n';
const COMMAND_GO_DEPTH = (depth) => 'go depth ' + depth;
const ANALISIS_DEPTH = 2;
const ENRITCH_ONE_IN = 116;

async function start() {
  if (!fs.existsSync(DATA_INPUT_FILE)) {
    log("ERROR DATA_INPUT_FILE does not exist");
    return;
  }
  let AVGBytesAddedPerRow = 1922;


  let rawGameMovesData = fs.readFileSync(DATA_INPUT_FILE);

  const totalPositions = await getNewLines(DATA_INPUT_FILE);
  console.log('Loaded ' + totalPositions + ' position from file ' + DATA_INPUT_FILE + " (" + (rawGameMovesData.length / 1024 / 1024) + " mb)");

  const estimatedBytes = totalPositions / ENRITCH_ONE_IN * AVGBytesAddedPerRow;
  console.log('Estimating to add', Math.round(estimatedBytes / 1024 / 1024), 'mb');


  let newPositionsBuffer = "";
  writeBuffer = () => {
    console.log('Writing buffer, length: ', newPositionsBuffer.length / 1024 / 1024, "mb")
    writeStartFile(DATA_OUTPUT_FILE, newPositionsBuffer);
    newPositionsBuffer = "";
  }

  let index = 0;
  let positionsAdded = 0;
  let addedBytes = 0;
  let lastLog = Date.now();
  let timeStart = Date.now();

  let currentPromiseArr = [];
  let concurrentPromises = 1;

  const stockfishAnalyser = getStockFishInstance();
  await foreachBufferNewLine(rawGameMovesData.entries(), async positionLine => {
    const [fen, _] = positionLine.split('|');
    // if (index >= 500000) return true;

    if (Math.random() <= 1 / ENRITCH_ONE_IN) {
      // if (index % ENRITCH_ONE_IN == 0) {

      //======

      const game = new Chess(fen);


      for (const moveStr of game.moves()) {
        const game = new Chess(fen);
        game.move(moveStr);
        const moveFen = game.fen();
        write(stockfishAnalyser, 'position fen ' + moveFen);

        const alaysis = await analysePos(stockfishAnalyser, ANALISIS_DEPTH);
        const parsedCP = (alaysis.cp ? alaysis.cp : (parseInt(alaysis.mate) < 0 ? -99999 : 99999));
        const newEntry = moveFen + '|' + parsedCP + '\n';
        newPositionsBuffer += newEntry;
        addedBytes += newEntry.length;
        positionsAdded++;
      }

      //=====

      if (newPositionsBuffer.length > 1024 * 1024 * 5) {
        writeBuffer();
      }

      if (Date.now() - lastLog > 6000) {
        const msElapsed = Date.now() - timeStart;
        const msRemaining = msElapsed / (index / totalPositions) - msElapsed

        console.log(msToTime(msElapsed) + "]",
          Math.round(index * 100 / totalPositions * 10) / 10, '%',
          'tot positions:', positionsAdded / 1000, "k,",
          'tot size:', Math.round(addedBytes / 1024 / 1024 * 10) / 10, 'mb,',
          'time remaining:', msToTime(msRemaining),
        );
        lastLog = Date.now();
      }
    }

    // currentPromiseArr.push(
    //   executeMove(fen, moveStr)
    // );
    // if (currentPromiseArr.length >= concurrentPromises) {
    //   const result = await Promise.all(currentPromiseArr);

    //   for (const newEntry of result) {
    //     newPositionsBuffer += newEntry;
    //     positionsAdded++;
    //   }

    //   currentPromiseArr = [];
    // }

    index++;
  });

  stockfishAnalyser.kill();


  writeBuffer();
  const commandMergeInputWithOutput = `cat ${DATA_INPUT_FILE} >> ${DATA_OUTPUT_FILE}`;
  console.log(commandMergeInputWithOutput);
}

function analysePositionMoves(fen) {
  return new Promise(async (acc, _) => {
    const game = new Chess(fen);
    newPositionsBuffer = '';
    positionsAdded = 0;

    const stockfishAnalyser = getStockFishInstance();

    for (const moveStr of game.moves()) {
      const game = new Chess(fen);
      game.move(moveStr);
      const moveFen = game.fen();
      write(stockfishAnalyser, 'position fen ' + moveFen);

      const alaysis = await analysePos(stockfishAnalyser, ANALISIS_DEPTH);
      const parsedCP = (alaysis.cp ? alaysis.cp : (parseInt(alaysis.mate) < 0 ? -99999 : 99999));
      const newEntry = moveFen + '|' + parsedCP + '\n';
      newPositionsBuffer += newEntry;
      positionsAdded++;
    }

    stockfishAnalyser.kill();

    acc([newPositionsBuffer, positionsAdded]);
  });
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

function writeStartFile(fileName, strToWrite) {
  if (!strToWrite?.length) return;
  fs.appendFileSync(fileName, strToWrite);
}

async function getForBestMove(stockfishProcess, commandToStart) {
  return new Promise((acc, rej) => {
    const bestmoveRegex = /bestmove ([^\s]+)/;
    const cpRegex = /score cp ([^\s]+)/;
    const mateRegex = /score mate ([^\s]+)/;
    let lines = "";

    let cp = undefined;
    let mate = undefined;

    const listener = data => {

      data = data.toString().split('\n');
      for (const line of data) {

        if (line.startsWith('info ') && mateRegex.test(line)) {
          mate = mateRegex.exec(line)[1];
        }
        if (line.startsWith('info ') && cpRegex.test(line)) {
          cp = cpRegex.exec(line)[1];
        }

        if (line.startsWith('bestmove ')) {
          if (cp === undefined && mate === undefined) {
            console.error(lines);
          }
          const bestMove = bestmoveRegex.exec(line)[1];
          stockfishProcess.stdout.removeListener('data', listener);
          acc({ bestMove, cp, mate });
        }
      }
    };
    stockfishProcess.stdout.on('data', listener);

    write(stockfishProcess, commandToStart);
  });
}

async function analysePos(stockfishProcess, depth) {
  return await getForBestMove(stockfishProcess, COMMAND_GO_DEPTH(depth));
}

function write(stockfishProcess, command) {
  // log("[command]: " + command);
  stockfishProcess.stdin.write(command + NEWLINE);
}

async function foreachBufferNewLine(bufferEntriesItterator, lineCallback) {
  let currentLine = '';

  for (const bufferEntry of bufferEntriesItterator) {
    const entryChar = String.fromCharCode(bufferEntry[1]);
    if (entryChar !== '\n') {
      currentLine += entryChar;
      continue;
    }

    const callbackResult = await lineCallback(currentLine);
    if (callbackResult) {
      return callbackResult;
    }
    currentLine = '';
  }

  return undefined;
}

function getNewLines(fileName) {
  return new Promise((acc, _) => {
    let count = 0;
    fs.createReadStream(fileName)
      .on('data', function (chunk) {
        for (i = 0; i < chunk.length; ++i)
          if (chunk[i] == 10) count++;
      })
      .on('end', function () {
        acc(count);
      });
  })
}

function getStockFishInstance() {
  const stockfishProcess = spawn('stockfish');
  // stockfishProcess.stderr.on("data", (data) => {
  //   console.log(`stdout: ${data}`);
  // });

  return stockfishProcess;
}

start();
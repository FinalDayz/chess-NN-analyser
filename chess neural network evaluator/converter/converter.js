const { Chess } = require('chess.js');

const { log } = require('console');
const fs = require('fs');
const bigJSON = require('big-json');
const JSONStream = require("JSONStream");

// const DATA_INPUT_FILE = '../data generator/positionData.json';
const DATA_INPUT_FILE = '../lichess_data_generator/positionData_depth_2_enriched.raw';
// const DATA_OUTPUT_FILE = 'NNInput.json';
const DATA_OUTPUT_FILE = 'NNInput.csv';

function jsonChunked(arr, callback, CHUNK_SIZE) {
  callback('[');
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    const isLast = i + CHUNK_SIZE >= arr.length;
    const chunk = arr.slice(i, i + CHUNK_SIZE);
    let chunkStr = JSON.stringify(chunk);
    chunkStr = chunkStr.substr(1, chunkStr.length - 2) + (isLast ? '' : ',');
    callback(chunkStr)
  }
  callback(']')
}

function writeJSONChunked(fileName, arr) {
  fs.writeFileSync(fileName, "");
  jsonChunked(arr, (chunkStr) => {
    fs.appendFileSync(fileName, chunkStr + '\n');
  }, 50000);
}

function rawChunked(arr, callback, CHUNK_SIZE) {
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    // const isLast = i + CHUNK_SIZE >= arr.length;
    const chunks = arr.slice(i, i + CHUNK_SIZE);
    let chunkStr = "";
    for (const chunkObj of chunks) {
      chunkStr += chunkObj.input.join(',') + ',' + chunkObj.output.join(',') + '\n';
    }

    callback(chunkStr);
  }
}

function writeRAWChunked(fileName, arr) {
  fs.writeFileSync(fileName, "");
  rawChunked(arr, (chunkStr) => {
    fs.appendFileSync(fileName, chunkStr);
  }, 50000);
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

async function start() {
  if (!fs.existsSync(DATA_INPUT_FILE)) {
    log("ERROR DATA_INPUT_FILE does not exist");
    return;
  }

  let rawGameMovesData = fs.readFileSync(DATA_INPUT_FILE);
  const totalPositions = await getNewLines(DATA_INPUT_FILE);
  log('Loaded ' + totalPositions + ' position from file ' + DATA_INPUT_FILE + " (" + (rawGameMovesData.length / 1024 / 1024) + " mb)");
  let parsedPositions = [];

  let MAX_INDEX = 1_910_000;
  MAX_INDEX = Infinity;
  let index = 0;

  let start = Date.now();
  fs.writeFileSync(DATA_OUTPUT_FILE, "");

  foreachBufferNewLine(rawGameMovesData.entries(), positionLine => {
    const [fen, cp] = positionLine.split('|');

    const newPositions = convertLine(fen, cp);
    parsedPositions.push(newPositions);

    index++;
    if (index % 120000 == 0) {
      log(Math.round(index * 100 / totalPositions) + "%" +
        " ( " + index + "/" + totalPositions + ")");
    }
    if (index % 200000 == 0) {

      rawChunked(parsedPositions, (chunkStr) => {
        fs.appendFileSync(DATA_OUTPUT_FILE, chunkStr);
      }, 50000);
      parsedPositions = [];
    }

    if (index >= MAX_INDEX) return true;
  });

  rawChunked(parsedPositions, (chunkStr) => {
    fs.appendFileSync(DATA_OUTPUT_FILE, chunkStr);
  }, 50000);

  log("Done parsing and writing, that took " +Math.round((Date.now() - start)/1000) + "sec ");

}

function convertLine(fen, cp) {
  cp = parseInt(cp);
  const fenData = fen.split(' ');
  const isWhite = fenData[1] === 'w';
  let eval = parseInt(isWhite ? cp : -cp);

  // Make CP evaluation compatable with NN output.
  // Range is -1 to 1. Make evals of 600 equal to 1.
  // We don't want it to lose too much percision, but also try to differentiate between winning and mating
  eval = eval / 600;
  eval = Math.max(-1, eval);
  eval = Math.min(1, eval);
  eval = Math.round(eval * 100) / 100

  const NNInput = fenToNNInput(isWhite, fen);

  return {
    input: NNInput,
    output: [eval],
  };
}

const pieceValues = {
  'P': 0.167,
  'N': 0.333,
  'B': 0.5,
  'R': 0.667,
  'Q': 0.833,
  'K': 1,
}
const pieceValuesBlack = Object.fromEntries(
  Object.entries(pieceValues)
    .map(
      ([pieceName, pieceValue]) => [pieceName.toLowerCase(), -pieceValue]
    )
);

const pieceValuesBlackWhite = {
  ...pieceValues,
  ...pieceValuesBlack,
}

function fenToNNInput(isWhiteTurn, fen) {
  const pieceValueTable = [isWhiteTurn ? 1 : -1];

  for (const fenChar of fen) {
    if (fenChar == '/') continue;
    if (fenChar == ' ') break;

    const pieceValue = pieceValuesBlackWhite[fenChar];
    // FEN value is a number, so place zero's
    if (pieceValue === undefined) {
      for (let i = 0; i < parseInt(fenChar); i++) {
        pieceValueTable.push(0);
      }
      continue;
    }

    pieceValueTable.push(pieceValue);
  }

  return pieceValueTable;
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

// function convertChessGameToNNInput(chessGame) {
//   const pieceValueTable = [chessGame.turn() === 'w' ? 1 : -1];

//   for (const column of [8, 7, 6, 5, 4, 3, 2, 1]) {
//     for (const row of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
//       const square = row + column;
//       const piece = chessGame.get(square);
//       let pieceValue = piece ? pieceValues[piece.type.toUpperCase()] : 0;
//       pieceValue = piece.color === 'w' ? pieceValue : -pieceValue;
//       pieceValueTable.push(pieceValue);
//     }
//   }

//   return pieceValueTable;
// }


start();
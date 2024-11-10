const { Chess } = require('chess.js');

const { spawn } = require('child_process');
const { log } = require('console');
const fs = require('fs');

const NEWLINE = '\r\n';
const COMMAND_START_POS = 'position startpos';
const COMMAND_PRINT_POSITION = 'd';
const COMMAND_GO_DEPTH = (depth) => 'go depth ' + depth;
const COMMAND_GO_MS = (ms) => 'go movetime ' + ms;
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const COMMAND_CLEAR_TABLE = 'setoption name Clear Hash';
const DATA_FILE = 'positionData.json';


function getStockFishInstance() {
  const stockfishProcess = spawn('stockfish');
  stockfishProcess.stderr.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  return stockfishProcess;
}

function start() {

  generateGames();
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
  write(stockfishProcess, COMMAND_CLEAR_TABLE);
  return await getForBestMove(stockfishProcess, COMMAND_GO_DEPTH(depth));
}

function write(stockfishProcess, command) {
  // log("[command]: " + command);
  stockfishProcess.stdin.write(command + NEWLINE);
}

function random(from, to) {
  to++;
  return Math.floor(
    Math.random() * (to - from) + from
  );
}

async function generateGame() {
  const gameOutput = [];
  const sockfishPlayer = getStockFishInstance();
  const stockfishAnalyser = getStockFishInstance();
  let gameCommand = 'position fen ' + START_FEN + ' moves ';

  const ignoreNumberOfFirstMoves = 4;
  const openingMoves = 6;

  const game = new Chess();

  while (!game.isGameOver()) {
    const isInOpening = game.history().length <= openingMoves;
    const savePositionAnalisis = game.history().length > ignoreNumberOfFirstMoves
    // Update game position
    write(sockfishPlayer, gameCommand);
    write(stockfishAnalyser, gameCommand);


    // Analyse position
    const alaysis = await analysePos(stockfishAnalyser, 1);
    // log("ANALYSIS ", alaysis, "FEN:", game.fen());

    if (savePositionAnalisis) {
      gameOutput.push({
        fen: game.fen(),
        cp: alaysis.cp ? alaysis.cp : (parseInt(alaysis.mate) < 0 ? -99999 : 99999)
      });
    }

    // Make next move
    const delayMs = isInOpening ?
      (Math.random() > 0.5 ? random(1, 20) : random(50, 70)) :
      random(30, 55);

    write(sockfishPlayer, COMMAND_CLEAR_TABLE);
    const result = await getForBestMove(
      sockfishPlayer,
      COMMAND_GO_MS(delayMs)
    );

    gameCommand += result.bestMove + ' ';
    game.move(result.bestMove);
  }

  // log(gameOutput[gameOutput.length - 1])
  // log(game.fen());
  // log(game.pgn());
  stockfishAnalyser.kill();
  sockfishPlayer.kill();


  return gameOutput;
}

async function generateGames() {
  let totalGameMoves = [];
  let gameCount = 0;

  if (fs.existsSync(DATA_FILE)) {
    totalGameMoves = JSON.parse(fs.readFileSync(DATA_FILE));
    log('Loaded ' + totalGameMoves.length + ' positions from file ' + DATA_FILE);
  }

  while (true) {
    const gameOutput = await generateGame();
    gameCount++;

    log(gameCount + "] Game ended with eval: '" + gameOutput[gameOutput.length - 1].cp +
      "', with " + gameOutput.length + " ply moves. Total moves in file: " + (totalGameMoves.length + gameOutput.length));

    totalGameMoves.push(...gameOutput);

    fs.writeFileSync(DATA_FILE, JSON.stringify(totalGameMoves));
  }

}

start();
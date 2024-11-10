// fetch('converter/NNInput.json')
//   .then((response) => response.json())
//   .then((json) => console.log(json));
// const data = require('./converter/NNInput.json');


const data = [];
// import data from './converter/NNInput.json' assert { type: 'json' };


const config = {
  inputSize: 65,
  outputSize: 1,
  learningRate: 0.01,
  momentum: 0.003,
  hiddenLayers: [5], // array of ints for the sizes of the hidden layers in the network
  activation: 'tanh', // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
  errorThresh: 0.05, // equivalent evaluation: 0.3 (30 cp)
};

const net = new brain.NeuralNetwork(config);
const RUN_ONLINE_API = true;

let resultBoard = Chessboard('board2', {
  pieceTheme: 'chessboardjs-1.0.0/img/chesspieces/wikipedia/{piece}.png',
  position: 'start',
  draggable: false,
});

function addSliderEventListener(slider, index) {
  slider.addEventListener('input', (e) => {
    latentSliderChange(index, e.target.value);
  });

  slider.addEventListener('change', (e) => {
    latentSliderChange(index, e.target.value, true);
  });
} 

let sliderChangeTimeout;
function latentSliderChange(index, newValue, noCooldown) {

  document.getElementById(`latent-text-${index}`).innerText = newValue
  console.log('change')

  window.clearTimeout(sliderChangeTimeout);
  sliderChangeTimeout = setTimeout(() => {
    latestLatentValues[index] = parseFloat(newValue);
    console.log(newValue, latestLatentValues)

    req('latentspace', {latentSpace: latestLatentValues})
    .then(json => {
      updateBoard2(json.predictedFen)
    })

  }, noCooldown ? 0 : 250);
}

function updateBoard2(fen) {
  resultBoard.position(fen);
  document.getElementById('board2Fen').value = fen;
}

function copyFenBoard2() {
  const copyText = document.getElementById('board2Fen');
  copyText.select();
  navigator.clipboard.writeText(copyText.value);

}

let latestLatentValues = [];

function fillLatentElement(latentValues) {
  const latentEl = document.getElementById('latentLayer');
  latentEl.innerHTML = '';

  let index = 0;
  for(const latentValue of latentValues) {
    const el = document.createElement('div');
    el.id = `latent-text-${index}`;
    el.innerText = Math.round(latentValue*100)/100;
    latentEl.appendChild(el);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 250;
    slider.step = 0.01;
    slider.value = latentValue;
    addSliderEventListener(slider, index)

    latentEl.appendChild(slider);

    index++;
  }
}

console.log(resultBoard)

var board = Chessboard('board', {
  pieceTheme: 'chessboardjs-1.0.0/img/chesspieces/wikipedia/{piece}.png',
  position: 'start',
  draggable: true,
  onChange: (firstPosition, changedPosition, ) => {
    setTimeout(() => {

      console.log('firstPosition',firstPosition)
      console.log('changedPosition',changedPosition)

      const piecesFirst = Object.entries(firstPosition).map(([sq, pc]) => sq + '=>' + pc);
      const piecesSecond = Object.entries(changedPosition).map(([sq, pc]) => sq + '=>' + pc);

      const diff = piecesSecond.filter(piece => !piecesFirst.includes(piece));

      console.log(diff)

      const isWhiteTurn = true;
      
      if(!diff.length) {
        throw new Error('ERROR diff created nothing extra');
      }

      const colorLastPlayed = diff[0][4];
      const colorTurn = ({w: 'b', b: 'w'})[colorLastPlayed]


      if (RUN_ONLINE_API) {

        const fen = getBoardFen(colorTurn);
        boardUpdated(fen)
      } else {
        const fen = board.fen() + " " + (isWhiteTurn ? 'w' : 'b') + " KQkq - 0 1";
        const chessGame = new Chess(fen);
        const nnInput = convertChessGameToNNInput(chessGame, isWhiteTurn);
        console.log(nnInput);
        const nnout = net.run(nnInput)[0];
        console.log("OUTPUT eval:", Math.round(nnout * 6 * 10) / 10 + " (" + nnout + ")");
      }
    }, 1)
  }
});

function boardUpdated(fen) {
  req('autoencoder', {fen})
  .then(json => {
    updateBoard2(json.predictedFen)

    latestLatentValues = json.latentSpace;
    fillLatentElement(json.latentSpace);
  });
}

function getBoardFen(colorTurn) {
  return board.fen() + " " + colorTurn + " KQkq - 0 1";
}

function resetBoard1() {
  board.position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 0')
}

function setFen() {
  const fenToSet = document.getElementById('setFen').value;
  board.position(fenToSet)
}

const evaluateOnline = (fen) => {
  // const chessGame = new Chess(fen);
  // const isWhitwMove = fen.split(' ')[1] === 'w';
  // const nnInput = convertChessGameToNNInput(chessGame, fen.split(' ')[1] === 'w');

  // fetch(
  //   'http://127.0.0.1:8080/evaluate',
  //   { method: 'POST', body: nnInput }
  // )
  //   .then(r => r.text())
  //   .then(evaluation => {
  //     evaluation = parseFloat(evaluation);
  //     console.log((isWhitwMove ? 'WHITE move' : 'BLACK move') + "] eval:", Math.round(evaluation * 6 * 10) / 10 + " (" + evaluation + ")");
  //   });
}

async function req(endpoint, jsonBody) {
  return await fetch(`http://127.0.0.1:5000/${endpoint}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(jsonBody)
  })
  .then(r => r.json());
}

const pieceValues = {
  'p': 0.167,
  'n': 0.333,
  'b': 0.5,
  'r': 0.667,
  'q': 0.833,
  'k': 1,
}

const valuePieces = Object
  .fromEntries(
    Object.entries(pieceValues)
      .map(([key, value]) => [value, key])
  );

window.pieceValues = pieceValues;
window.valuePieces = valuePieces;

function searchInData(fen) {
  const input = fenToInput(fen);
  const matches = [];
  let index = 0;
  for (const dataLine of data) {
    let match = dataLine.input
      .every((element, index) => element === input[index]);
    if (match) {
      matches.push({ ...dataLine, index });
    }
    index++
  }
}


function convertChessGameToNNInput(chessGame, isWhiteTurn) {
  const pieceValueTable = [isWhiteTurn ? 1 : -1];
  for (const column of [8, 7, 6, 5, 4, 3, 2, 1]) {
    for (const row of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const square = row + column;
      const piece = chessGame.get(square);
      let pieceValue = piece ? pieceValues[piece.type] : 0;
      pieceValue = piece?.color === 'w' ? pieceValue : -pieceValue;
      pieceValueTable.push(pieceValue);
    }
  }

  return pieceValueTable;
}



const benchMark = (amount = 100000, log = true) => {
  let totalError = 0;
  for (let i = 0; i < amount; i++) {
    const output = nn.run(data[i].input);
    const error = Math.abs(output[0] - data[i].output[0]);
    if ((i % (amount / 50)) == 0 && log) {
      console.log('error', rnd3(error),
        'out:', rnd3(output[0]),
        'wanted:', rnd3(data[i].output[0]),
        'fen:' + inputToFen(data[i].input));
    }
    totalError += error;
  }
  if (log)
    console.log("Average error: " + rnd3(totalError / amount));
  return totalError / amount
}

window.benchMark = benchMark;

function rnd1(val) {
  return Math.round(val * 10) / 10;
}
function rnd3(val) {
  return Math.round(val * 1000) / 1000;
}
function rnd5(val) {
  return Math.round(val * 100000) / 100000;
}

const fenToInput = (fen) => {
  const chessGame = new Chess(fen);
  return convertChessGameToNNInput(chessGame, chessGame.turn() === 'w');
}

//[[-1.0, -0.6644382476806641, -0.3283114731311798, -0.5032886862754822, -0.8374893665313721, -1.0, -0.5040618777275085, -0.3365003168582916, -0.6667364835739136, -0.1655884087085724, -0.1656920164823532, -0.16099120676517487, -0.00027705222601071, -0.0006997668533585966, -0.16570088267326355, -0.16612088680267334, -0.16773204505443573, -8.486455772072077e-05, 0.00011595070827752352, -0.0012450811918824911, -0.0005533787189051509, -0.0006761134136468172, 0.001082887058146298, -0.0005500655388459563, 6.992526323301718e-05, 0.0002472556661814451, -0.0003394527011550963, -0.0009148990502581, -0.0007639504037797451, 0.0003584646910894662, -0.0005158621352165937, 0.0003798709949478507, -0.0005235771532170475, 8.911812619771808e-05, -0.00018575690046418458, 0.0001437922182958573, 0.002367207780480385, 0.0021471139043569565, -0.00039478836697526276, -0.0006810828344896436, -8.866281132213771e-05, -0.0008722099009901285, -0.000422229670220986, 0.15894673764705658, -0.00091648189118132, -0.001131899538449943, -0.0029427323024719954, 0.0008590794168412685, -0.0010060803033411503, 0.1655702143907547, 0.1652267426252365, -0.0033979197032749653, 0.00027345953276380897, 0.0006132363923825324, 0.16684933006763458, 0.16716203093528748, 0.1665380895137787, 0.6678935885429382, 0.33489879965782166, 0.5087265372276306, 0.8317919969558716, 1.0, 0.49595388770103455, 0.3312179446220398, 0.6677200198173523]]
const inputToClosestValue = (input) => {
  const validValues = [0, ...Object.values(pieceValues), ...Object.values(pieceValues).map(v => -v)];
  // console.log(validValues)
  for(let i = 0; i < input.length; i++) {
    let closestError = 99;
    let closestValue = -99;

    for(const val of validValues) {
      const error = Math.abs(input[i] - val);
      // console.log(input[i],'] testing for ', val, 'error: ', error)
      if(error < closestError) {
        closestError = error;
        closestValue = val;
      }
    }
    input[i] = closestValue;
  }

  return input;
}

const inputToFen = (input) => {
  let fen = '';
  let pawnNum = 0;
  for (let i = 1; i < input.length; i++) {
    const inputPiece = input[i];
    if ((i - 1) % 8 == 0 && i != 1) {
      if (pawnNum > 0) {
        fen += pawnNum;
        pawnNum = 0;
      }
      fen += '/';
    }
    if (inputPiece === 0) {
      pawnNum++;
    } else {
      if (pawnNum > 0) {
        fen += pawnNum;
        pawnNum = 0;
      }
      const pieceType = valuePieces[Math.abs(inputPiece)];
      fen += inputPiece > 0 ? pieceType.toUpperCase() : pieceType;
    }
  }

  if (pawnNum > 0) {
    fen += pawnNum;
  }

  return fen + ' ' + (input[0] === 1 ? 'w' : 'b') + ' - - 0 1'
}

// const output = net.run([1, 0]); // [0.987]
window.inputToClosestValue = inputToClosestValue;
window.evaluateOnline = evaluateOnline;
window.searchInData = searchInData;
window.fenToInput = fenToInput;
window.inputToFen = inputToFen;
window.net = net;
window.nn = net;
window.data = data;
window.board = board;
window.resetBoard1 = resetBoard1;
window.setFen = setFen;
window.copyFenBoard2 = copyFenBoard2;


if (!RUN_ONLINE_API) {

  net.train(data, {
    iterations: 20,
    logPeriod: 1,
    log: (details) => {
      const bench = benchMark(100000, false);
      console.log(details.iterations + "]", 'err:', rnd5(details.error), 'benchmark:', rnd3(bench))
    },
    // errorThresh: 0.011,
  });
}


setTimeout(() => {
  const fen = getBoardFen('w');
  updateBoard2(fen);
  boardUpdated(fen);
}, 150)

/*
EXAMPLE::: 

nnOutput = [-1.0, -0.6644382476806641, -0.3283114731311798, -0.5032886862754822, -0.8374893665313721, -1.0, -0.5040618777275085, -0.3365003168582916, -0.6667364835739136, -0.1655884087085724, -0.1656920164823532, -0.16099120676517487, -0.00027705222601071, -0.0006997668533585966, -0.16570088267326355, -0.16612088680267334, -0.16773204505443573, -8.486455772072077e-05, 0.00011595070827752352, -0.0012450811918824911, -0.0005533787189051509, -0.0006761134136468172, 0.001082887058146298, -0.0005500655388459563, 6.992526323301718e-05, 0.0002472556661814451, -0.0003394527011550963, -0.0009148990502581, -0.0007639504037797451, 0.0003584646910894662, -0.0005158621352165937, 0.0003798709949478507, -0.0005235771532170475, 8.911812619771808e-05, -0.00018575690046418458, 0.0001437922182958573, 0.002367207780480385, 0.0021471139043569565, -0.00039478836697526276, -0.0006810828344896436, -8.866281132213771e-05, -0.0008722099009901285, -0.000422229670220986, 0.15894673764705658, -0.00091648189118132, -0.001131899538449943, -0.0029427323024719954, 0.0008590794168412685, -0.0010060803033411503, 0.1655702143907547, 0.1652267426252365, -0.0033979197032749653, 0.00027345953276380897, 0.0006132363923825324, 0.16684933006763458, 0.16716203093528748, 0.1665380895137787, 0.6678935885429382, 0.33489879965782166, 0.5087265372276306, 0.8317919969558716, 1.0, 0.49595388770103455, 0.3312179446220398, 0.6677200198173523];

cleanNNOutput= inputToClosestValue(nnOutput)

fenOutput = inputToFen(cleanNNOutput);

console.log(fenOutput)

board.position(fenOutput)


*/
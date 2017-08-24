// http://cs.stanford.edu/people/karpathy/convnetjs/demo/rldemo.html

// http://cs.stanford.edu/people/karpathy/reinforcejs/

// Saving and Loading Brain State

// var j = brain.value_net.toJSON();
// var t = JSON.stringify(j); //brain as string

// var j = JSON.parse(t);
// brain.value_net.fromJSON(j);

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const cols = 8;
const rows = 16;

const midpoint = Math.floor(cols / 2);

const w = cols * 25;
const h = rows * 25;

const tw = Math.floor(w / cols);
const th = Math.floor(h / rows);

const EMPTY = 0;
const PLAYER = 1;
const ENEMY = 2;
const COLLISION = 3;
const LEFT = 'LEFT';
const RIGHT = 'RIGHT';
const STAY = 'STAY';

const state = Array(rows).fill(0).map(() => Array(cols).fill(EMPTY));

let speed = 100;

function getViewDeltas() {
  let viewDistance = 3; // to 9
  const levels = 4;
  const deltas = [];
  for (let level = 0; level < levels; level++) {
    const midpoint = Math.floor(viewDistance / 2);
    for (let x = -midpoint; x <= midpoint; x++) {
      deltas.push([x, rows - 1 - level]);
    }
    viewDistance += 2;
  }
  return deltas;
}

const viewDeltas = getViewDeltas();

const env = {
  getNumStates: () => viewDeltas.length,
  getMaxNumActions: () => 3,
};

// create the DQN agent
const spec = { alpha: 0.01 } // see full options on DQN page
const agent = new RL.DQNAgent(env, spec); 

function exportData() {
  document.getElementById('data').value = JSON.stringify(agent.toJSON());
}

function importData() {
  agent.fromJSON(JSON.parse(document.getElementById('data').value));
}

let gameOver = false;
let score = 0;
let game = 1;

let maxEnemies = 4;
let enemySpawnRate = 500;
let lastEnemySpawn = 0;
let enemies = [];

function moreEnemies() {
  maxEnemies++;
}

function lessEnemies() {
  maxEnemies--;
}

function fasterSpawn() {
  enemySpawnRate -= 100;
}

function slowerSpawn() {
  enemySpawnRate += 100;
}

function addRandomEnemy() {
  enemies.push({
    x: Math.floor(Math.random() * cols),
    y: 0
  });
}

const player = {
  x: midpoint,
};

function clearState() {
  state[rows - 1][player.x] = EMPTY;
  enemies.forEach(e => {
    if (!state[e.y]) {
      state[e.y] = [];
    }
    state[e.y][e.x] = EMPTY;  
  });    
}

function fillState() {
  state[rows - 1][player.x] = PLAYER;
  enemies.forEach(e => {
    if (!state[e.y]) {
      state[e.y] = [];
    }
    state[e.y][e.x] = ENEMY;  
  });  
}

// Create view relative positions array, so we can just MAP the current ENEMIES
// The view should look like this...
// 
//   # # # # # # # # #     (9)
//     # # # # # # #       (7)
//       # # # # #         (5)
//         # P #           (3)
//                       = 24
//                     
// And now that the enemy positions are RELATIVE, we do NOT need to send the player
// position array state! Yay!
// 
// Still need to figure out why the NON-LEARNING state always picks LEFT         
// 
// Also, visually show the view state and enemy hits                                                                     

function getState() {
  return viewDeltas.map(([dx, y]) => {
    const enemyInSight = state[y] && state[y][player.x + dx] === ENEMY;
    return enemyInSight ? 1 : 0;
  });
}

function renderAverageRewardOverTime() {
  const best = Math.max(...rewardAverages);
  const lastIndex = rewardAverages.length - 1;
  const firstIndex = Math.max(lastIndex - 10, 0);
  ctx.font = '12px serif';
  let sum = 0;
  let count = 0;
  for (let i = firstIndex, j = 0; i <= lastIndex; i++, j++) {
    sum += rewardAverages[i];
    count++;
    const c = rewardAverages[i] / best * (1 - 0.5) + 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${c})`;
    ctx.fillText(rewardAverages[i] + '', w + 10, 15 + j * 10);
  };
  const average = sum / count;  
  ctx.fillStyle = `rgba(255, 255, 255, 1)`;
  ctx.fillText('AVG: ' + average, w + 10, 15 + 10 * 12);
  ctx.fillText('BEST: ' + best, w + 10, 15 + 10 * 14);
}

function rotateAndPaintImage (image, angle, cx, cy, width, height) {
  ctx.save();                    // save context
  ctx.translate(cx, cy); // move to point
  ctx.rotate(angle * Math.PI / 180);  // rotate around that point
  ctx.drawImage(image, -(width / 2), -(height / 2), width, height);
  ctx.restore();                 // restore to initial coordinates 
}

function render() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, w + 100, h + 50);
  ctx.drawImage(document.getElementById('sky'), 0, 0, 128, 128, 0, 0, w, h);
  
  viewDeltas.forEach(([dx, y]) => {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    const x = player.x + dx;
    const cx = tw * x + tw / 2;
    const cy = th * y + th / 2;
    if (state[y][x] === ENEMY) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
    }
    ctx.fillRect(tw * x, th * y, tw, th);
  });

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = tw * x + tw / 2;
      const cy = th * y + th / 2;
      if (state[y][x] === ENEMY) {
        rotateAndPaintImage(document.getElementById('missile'), -45, cx, cy, 24, 24);
      }
      if (state[y][x] === PLAYER) {
        rotateAndPaintImage(document.getElementById('plane'), 0, cx, cy - 5, 32, 32);
      }    
      if (state[y][x] === COLLISION) {
        rotateAndPaintImage(document.getElementById('boom'), 0, cx, cy - 5, 32, 32);
      }    
    }
  }
    
  ctx.font = '12px serif';
  ctx.fillStyle = 'white';
  ctx.fillText(score + '', 5, 15);
  renderAverageRewardOverTime();
}

function update() {
  if (gameOver) {
    return;
  }
  const collision = enemies.find(enemy => player.x === enemy.x && enemy.y === rows - 1);
  if (collision) {
    state[collision.y][collision.x] = COLLISION;
    gameOver = true;
    return;
  }
  score++;
  clearState();
  enemies = enemies.map(({ x, y }, index) => {
    if (y === rows - 1) {
      return undefined;
    }
    return {
      x,
      y: y + 1
    };
  }).filter(enemy => enemy);
  // Spawn enemy if needed
  const now = Date.now();
  if (enemies.length < maxEnemies && (now - lastEnemySpawn) > enemySpawnRate) {
    addRandomEnemy();
    lastEnemySpawn = now;
  }
  fillState();
}

function goLeft() {
  state[rows - 1][player.x--] = EMPTY;
  state[rows - 1][player.x] = PLAYER;
}

function goRight() {
  state[rows - 1][player.x++] = EMPTY;
  state[rows - 1][player.x] = PLAYER;
}

function resetGame() {
  clearState();
  gameOver = false;
  score = 0;
  player.x = midpoint;
  enemies = [];
}

function getReward(oldScore) {
  return Math.sign(score - oldScore) * 0.1;
}

let rewardSum = 0;
let rewardAverages = [];

function loop() {
  const oldScore = score;
  const action = agent.act(getState());
  if (action === 0 && player.x > 0) {
    goLeft();
  }
  if (action === 1 && player.x < cols - 1) {
    goRight();
  }
  update();
  render();
  if (gameOver) {
    console.log(`Game ${game++}: ${score}`);
    rewardAverages.push(rewardSum);
    rewardSum = 0;
    resetGame();
  }
  const reward = getReward(oldScore);
  agent.learn(reward);
  rewardSum += reward;
  setTimeout(loop, speed);
}  

// Real Player
window.addEventListener('keydown', e => {
  // if (e.which === 39) {
  //   goRight();
  // }
  // if (e.which === 37) {
  //   goLeft();
  // }
  // if (e.which === 32) {
  //   resetGame();
  // }
  if (e.which === 38) {
    speed += 50;
    console.log(`Speed ${speed}`);
  }
  if (e.which === 40) {
    speed -= 50;
    console.log(`Speed ${speed}`);
  }
  if (e.which === 13) {
    // if (brain.learning) {
    //   brain.epsilon_test_time = 0.0; // don't make any more random choices
    //   brain.learning = false;
    //   console.log(`Learning is off`);
    // } else {
    //   brain.epsilon_test_time = 0.05;
    //   brain.learning = true;
    //   console.log(`Learning is ON`);
    // }
  }
});

render();
update();
loop();

function loadPreTrainedData() {
  fetch('pretrained-agent-data.json')
  .then(res => res.json())
  .then(data => agent.fromJSON(data));
}

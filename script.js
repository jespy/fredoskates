"use strict";

/* =================================================
   ELEMENTS
================================================= */
const gameArea =
  document.getElementById("game-area");

const player =
  document.getElementById("player");

const playerSprite =
  document.getElementById("player-sprite");

const obstaclesContainer =
  document.getElementById("obstacles");

const scoreDisplay =
  document.getElementById("score");

const highScoreDisplay =
  document.getElementById("high-score");

const coinCountDisplay =
  document.getElementById("coin-count");

const coinEffect =
  document.getElementById("coin-effect");

const startScreen =
  document.getElementById("start-screen");

const screenTitle =
  document.getElementById("screen-title");

const screenMessage =
  document.getElementById("screen-message");

const startButton =
  document.getElementById("start-button");

const farCityScroll =
  document.getElementById("far-city-scroll");

const cityScroll =
  document.getElementById("city-scroll");

const streetScroll =
  document.getElementById("street-scroll");

const foregroundScroll =
  document.getElementById("foreground-scroll");


/* =================================================
   PLAYER ANIMATIONS
================================================= */

const PLAYER_ANIMATIONS = {
  idle:  { frames: 6, fps: 4,  loop: true },
  push:  { frames: 6, fps: 10, loop: true },
  ride:  { frames: 6, fps: 8,  loop: true },
  jump:  { frames: 7, fps: 12, loop: false },
  trick: { frames: 8, fps: 14, loop: false },
  fall:  { frames: 6, fps: 10, loop: false }
};

let playerAnimation = "idle";
let playerAnimationFrame = 0;
let playerAnimationElapsed = 0;
let playerAnimationFinished = false;


/* =================================================
   SETTINGS
================================================= */

const DESKTOP_GROUND_POSITION = 82;
const MOBILE_GROUND_POSITION = 70;

const GRAVITY = 0.78;

const NORMAL_JUMP_POWER = 15;
const RAMP_JUMP_POWER = 20;

const STARTING_SPEED = 6;
const MAXIMUM_SPEED = 13;

const RAMP_CHANCE = 0.16;
const BENCH_CHANCE = 0.2;

const RAMP_RIDE_DURATION = 310;
const RAMP_RIDE_HEIGHT = 53;

const BENCH_GRIND_MINIMUM_TIME = 160;

const MINIMUM_OBSTACLE_DELAY = 1000;
const MAXIMUM_OBSTACLE_DELAY = 2200;

const MINIMUM_OBSTACLE_GAP = 340;
const HIGH_SPEED_EXTRA_GAP = 220;

const RAMP_EXTRA_GAP = 180;
const BENCH_EXTRA_GAP = 130;

const GRAB_IMAGE_DELAY = 90;

const FAR_CITY_SPEED_RATIO = 0.12;
const CITY_SPEED_RATIO = 0.27;
const STREET_SPEED_RATIO = 0.58;
const FOREGROUND_SPEED_RATIO = 1;

const BUILDING_MINIMUM_GAP = 140;
const BUILDING_MAXIMUM_GAP = 220;
const BUILDING_BUFFER = 420;

const DESKTOP_BUILDING_BOTTOM = 30;
const MOBILE_BUILDING_BOTTOM = 90;
const PORTRAIT_BUILDING_BOTTOM = 45;


/* Modular background buildings supplied with the game. */
const BUILDING_ASSETS = [
  {
    src: "images/environment/buildings/building-1.png",
    aspect: 1105 / 576,
    desktopHeight: 400,
    mobileHeight: 185
  },
  {
    src: "images/environment/buildings/building-2.png",
    aspect: 1311 / 442,
    desktopHeight: 300,
    mobileHeight: 151
  },
  {
    src: "images/environment/buildings/skate-shop.png",
    aspect: 825 / 589,
    desktopHeight: 350,
    mobileHeight: 189 
  }
];



/* =================================================
   PLAYER STATE
================================================= */

let playerHeight = 0;
let playerVelocity = 0;

let isJumping = false;
let isRidingRamp = false;
let rampLaunchActive = false;
let isGrinding = false;

let activeRamp = null;
let activeBench = null;

let rampRideStartTime = 0;
let rampRideStartHeight = 0;

let grindStartTime = 0;

let grabImageTimer = null;


/* =================================================
   GAME STATE
================================================= */

let gameRunning = false;

let gameSpeed = STARTING_SPEED;

let score = 0;
let coinCount = 0;

let previousFrameTime = 0;

let animationFrameId = null;
let obstacleTimer = null;
let scoreTimer = null;

let obstacles = [];


/* =================================================
   SCROLLING STATE
================================================= */

let farCityPosition = 0;
let cityPosition = 0;
let streetPosition = 0;
let foregroundPosition = 0;

let backgroundBuildings = [];
let lastBuildingAssetIndex = -1;


/* =================================================
   HIGH SCORE
================================================= */

const savedHighScore =
  Number(
    localStorage.getItem(
      "skateboardHighScore"
    )
  ) || 0;

if (highScoreDisplay) {
  highScoreDisplay.textContent =
    savedHighScore;
}


/* =================================================
   PLAYER ANIMATION FUNCTIONS
================================================= */

function setPlayerAnimation(name, restart = false) {
  if (!PLAYER_ANIMATIONS[name] || !playerSprite) return;

  if (playerAnimation !== name || restart) {
    playerAnimation = name;
    playerAnimationFrame = 0;
    playerAnimationElapsed = 0;
    playerAnimationFinished = false;
    renderPlayerFrame();
  }
}

function renderPlayerFrame() {
  if (!playerSprite) return;
  playerSprite.src = `images/player/${playerAnimation}-${playerAnimationFrame}.png`;
}

function updatePlayerAnimation(deltaTime) {
  const animation = PLAYER_ANIMATIONS[playerAnimation];
  if (!animation || playerAnimationFinished) return;

  playerAnimationElapsed += deltaTime * 16.67;
  const frameDuration = 1000 / animation.fps;

  while (playerAnimationElapsed >= frameDuration) {
    playerAnimationElapsed -= frameDuration;
    playerAnimationFrame += 1;

    if (playerAnimationFrame >= animation.frames) {
      if (animation.loop) {
        playerAnimationFrame = 0;
      } else {
        playerAnimationFrame = animation.frames - 1;
        playerAnimationFinished = true;
      }
    }

    renderPlayerFrame();
  }
}

function showNormalSkaterImage() {
  setPlayerAnimation(gameRunning ? "ride" : "idle", true);
  player.classList.remove("crash-image", "grabbing-board");
}

function showCrashSkaterImage() {
  setPlayerAnimation("fall", true);
  player.classList.remove("grabbing-board");
  player.classList.add("crash-image");
}

/* =================================================
   GROUND POSITION
================================================= */

function getGroundPosition() {
  return window.innerWidth <= 520
    ? MOBILE_GROUND_POSITION
    : DESKTOP_GROUND_POSITION;
}


/* =================================================
   START GAME
================================================= */

function startGame() {
  clearGame();

  score = 0;
  coinCount = 0;

  gameSpeed = STARTING_SPEED;

  playerHeight = 0;
  playerVelocity = 0;

  isJumping = false;
  isRidingRamp = false;
  rampLaunchActive = false;
  isGrinding = false;

  activeRamp = null;
  activeBench = null;

  rampRideStartTime = 0;
  rampRideStartHeight = 0;
  grindStartTime = 0;

  farCityPosition = 0;
  cityPosition = 0;
  streetPosition = 0;
  foregroundPosition = 0;

  if (scoreDisplay) {
    scoreDisplay.textContent = "0";
  }

  if (coinCountDisplay) {
    coinCountDisplay.textContent = "0";
  }

  resetScrollingLayers();
  resetRandomBuildings();
  hideGrabImage();
  showNormalSkaterImage();

  player.style.bottom =
    `${getGroundPosition()}px`;

player.classList.remove(
  "crashed",
  "crash-image",
  "jumping",
  "riding-ramp",
  "ramp-launch",
  "grinding",
  "grabbing-board"
);

showNormalSkaterImage();
hideGrabImage();

  if (coinEffect) {
    coinEffect.classList.remove("show");
  }

  if (startScreen) {
    startScreen.classList.add("hidden");
  }

  gameArea.classList.remove(
    "game-paused"
  );

  gameArea.classList.add(
    "game-running"
  );

  gameArea.focus();

  gameRunning = true;

  previousFrameTime =
    performance.now();

  scheduleNextObstacle();

  scoreTimer =
    window.setInterval(() => {
      if (!gameRunning) {
        return;
      }

      score += 1;

      if (scoreDisplay) {
        scoreDisplay.textContent =
          score;
      }

      gameSpeed = Math.min(
        MAXIMUM_SPEED,
        STARTING_SPEED +
          score * 0.022
      );
    }, 100);

  animationFrameId =
    requestAnimationFrame(gameLoop);
}


/* =================================================
   GAME LOOP
================================================= */

function gameLoop(currentTime) {
  if (!gameRunning) {
    return;
  }

  const deltaTime = Math.min(
    (
      currentTime -
      previousFrameTime
    ) / 16.67,
    2
  );

  previousFrameTime = currentTime;

  updateScrollingWorld(deltaTime);
  updateObstacles(deltaTime);

  checkRampLaunches();
  checkBenchGrinding(currentTime);

  updatePlayer(
    deltaTime,
    currentTime
  );

  updatePlayerAnimation(deltaTime);

  checkBenchJumpRewards();
  checkCollisions();

  animationFrameId =
    requestAnimationFrame(gameLoop);
}


/* =================================================
   PLAYER UPDATE
================================================= */

function updatePlayer(
  deltaTime,
  currentTime
) {
  if (
    isGrinding &&
    activeBench
  ) {
    updateBenchGrind(currentTime);
    return;
  }

  if (
    isRidingRamp &&
    activeRamp
  ) {
    updateRampRide(currentTime);
    return;
  }

  if (isJumping) {
    playerVelocity -=
      GRAVITY * deltaTime;

    playerHeight +=
      playerVelocity * deltaTime;

    if (playerHeight <= 0) {
      playerHeight = 0;
      playerVelocity = 0;

      isJumping = false;
      rampLaunchActive = false;

      player.classList.remove(
        "jumping",
        "ramp-launch"
      );

      hideGrabImage();
      setPlayerAnimation("ride", true);
    }
  }

  setPlayerHeight(playerHeight);
}


/* =================================================
   NORMAL JUMP
================================================= */

function jump() {
  if (
    !gameRunning ||
    isJumping ||
    isRidingRamp ||
    isGrinding
  ) {
    return;
  }

  isJumping = true;
  rampLaunchActive = false;

  playerVelocity =
    NORMAL_JUMP_POWER;

  player.classList.remove(
    "riding-ramp",
    "ramp-launch",
    "grinding"
  );

  player.classList.add("jumping");

  setPlayerAnimation("jump", true);
  scheduleGrabImage();
}


/* =================================================
   BOARD-GRAB IMAGE
================================================= */

function scheduleGrabImage() {
  clearTimeout(grabImageTimer);

  grabImageTimer =
    window.setTimeout(() => {
      if (
        gameRunning &&
        isJumping &&
        !isGrinding
      ) {
        showGrabImage();
      }
    }, GRAB_IMAGE_DELAY);
}


function showGrabImage() {
  if (!gameRunning || !isJumping) return;
  setPlayerAnimation("trick", true);
  player.classList.add("grabbing-board");
}


function hideGrabImage() {
  clearTimeout(grabImageTimer);
  grabImageTimer = null;
  player.classList.remove("grabbing-board");
}


/* =================================================
   PLAYER HEIGHT
================================================= */

function setPlayerHeight(height) {
  player.style.bottom =
    `${
      getGroundPosition() +
      height
    }px`;
}


/* =================================================
   RAMP DETECTION
================================================= */

function checkRampLaunches() {
  if (
    isRidingRamp ||
    isGrinding ||
    rampLaunchActive
  ) {
    return;
  }

  const playerRect =
    player.getBoundingClientRect();

  const boardArea = {
    left:
      playerRect.left +
      playerRect.width * 0.12,

    right:
      playerRect.right -
      playerRect.width * 0.04,

    top:
      playerRect.bottom -
      playerRect.height * 0.27,

    bottom:
      playerRect.bottom
  };

  for (const obstacle of obstacles) {
    if (
      obstacle.type !== "ramp" ||
      obstacle.activated
    ) {
      continue;
    }

    const rampRect =
      obstacle.element
        .getBoundingClientRect();

    const touchingRamp =
      boardArea.right >
        rampRect.left &&
      boardArea.left <
        rampRect.right &&
      boardArea.bottom >
        rampRect.top &&
      boardArea.top <
        rampRect.bottom;

    const closeToGround =
      playerHeight < 30;

    if (
      touchingRamp &&
      closeToGround
    ) {
      obstacle.activated = true;

      beginRampRide(obstacle);

      break;
    }
  }
}


/* =================================================
   BEGIN RAMP RIDE
================================================= */

function beginRampRide(ramp) {
  isRidingRamp = true;
  isJumping = false;
  isGrinding = false;

  rampLaunchActive = false;

  playerVelocity = 0;

  rampRideStartTime =
    performance.now();

  rampRideStartHeight =
    Math.max(playerHeight, 0);

  activeRamp = ramp;

  // Riding up the ramp earns one coin. Jumping completely over it earns none.
  giveObstacleReward(ramp, 1);

  hideGrabImage();

  player.classList.remove(
    "jumping",
    "ramp-launch",
    "grinding"
  );

  player.classList.add(
    "riding-ramp"
  );

  setPlayerAnimation("ride", true);
}


/* =================================================
   UPDATE RAMP RIDE
================================================= */

function updateRampRide(currentTime) {
  if (!activeRamp) {
    finishRampLaunch();
    return;
  }

  const rampRect =
    activeRamp.element
      .getBoundingClientRect();

  const playerRect =
    player.getBoundingClientRect();

  const boardCenterX =
    playerRect.left +
    playerRect.width * 0.55;

  const horizontalProgress =
    clamp(
      (
        boardCenterX -
        rampRect.left
      ) / rampRect.width,
      0,
      1
    );

  const timeProgress =
    clamp(
      (
        currentTime -
        rampRideStartTime
      ) / RAMP_RIDE_DURATION,
      0,
      1
    );

  const progress =
    Math.max(
      horizontalProgress,
      timeProgress * 0.82
    );

  const easedProgress =
    progress *
    progress *
    (3 - 2 * progress);

  playerHeight =
    rampRideStartHeight +
    RAMP_RIDE_HEIGHT *
      easedProgress;

  setPlayerHeight(playerHeight);

  if (
    horizontalProgress >= 0.91 ||
    timeProgress >= 1
  ) {
    finishRampLaunch();
  }
}


/* =================================================
   FINISH RAMP LAUNCH
================================================= */

function finishRampLaunch() {
  isRidingRamp = false;
  isJumping = true;

  rampLaunchActive = true;

  playerVelocity =
    RAMP_JUMP_POWER;

  activeRamp = null;

  player.classList.remove(
    "riding-ramp"
  );

  player.classList.add(
    "jumping",
    "ramp-launch"
  );

  setPlayerAnimation("trick", true);
  showGrabImage();
}


/* =================================================
   GRINDABLE OBSTACLE HELPERS
================================================= */

function isGrindObstacle(obstacleOrType) {
  const type =
    typeof obstacleOrType === "string"
      ? obstacleOrType
      : obstacleOrType?.type;

  return (
    type === "bench" ||
    type === "grind-bar" ||
    type === "grind-bench"
  );
}


/* =================================================
   BENCH GRIND DETECTION
================================================= */

function checkBenchGrinding(currentTime) {
  if (
    !gameRunning ||
    isGrinding ||
    isRidingRamp ||
    !isJumping
  ) {
    return;
  }

  const playerRect =
    player.getBoundingClientRect();

  const boardLeft =
    playerRect.left +
    playerRect.width * 0.08;

  const boardRight =
    playerRect.right -
    playerRect.width * 0.04;

  const boardBottom =
    playerRect.bottom -
    playerRect.height * 0.02;

  for (const obstacle of obstacles) {
    if (
      !isGrindObstacle(obstacle) ||
      obstacle.grindStarted ||
      obstacle.rewardGiven
    ) {
      continue;
    }

    const benchRect =
      obstacle.element
        .getBoundingClientRect();

    const horizontallyAboveBench =
      boardRight >
        benchRect.left + 12 &&
      boardLeft <
        benchRect.right - 12;

    const falling =
      playerVelocity <= 1;

    const nearBenchTop =
      boardBottom >=
        benchRect.top - 18 &&
      boardBottom <=
        benchRect.top + 16;

    if (
      horizontallyAboveBench &&
      falling &&
      nearBenchTop
    ) {
      startBenchGrind(
        obstacle,
        currentTime
      );

      break;
    }
  }
}


/* =================================================
   START BENCH GRIND
================================================= */

function startBenchGrind(
  bench,
  currentTime
) {
  isGrinding = true;
  isJumping = false;
  isRidingRamp = false;

  playerVelocity = 0;

  activeBench = bench;
  grindStartTime = currentTime;

  bench.grindStarted = true;

  hideGrabImage();

  player.classList.remove(
    "jumping",
    "ramp-launch",
    "riding-ramp"
  );

  player.classList.add(
    "grinding"
  );

  setPlayerAnimation("ride", true);

  setPlayerHeight(
    getBenchGrindHeight(bench)
  );
}


/* =================================================
   BENCH HEIGHT
================================================= */

function getBenchGrindHeight(bench) {
  const benchRect =
    bench.element
      .getBoundingClientRect();

  const gameRect =
    gameArea.getBoundingClientRect();

  const benchTopInsideGame =
    benchRect.top -
    gameRect.top;

  const groundY =
    gameArea.clientHeight -
    getGroundPosition();

  return Math.max(
    0,
    groundY -
      benchTopInsideGame -
      player.offsetHeight * 0.04
  );
}


/* =================================================
   UPDATE BENCH GRIND
================================================= */

function updateBenchGrind(currentTime) {
  if (!activeBench) {
    stopBenchGrind(false);
    return;
  }

  const benchRect =
    activeBench.element
      .getBoundingClientRect();

  const playerRect =
    player.getBoundingClientRect();

  setPlayerHeight(
    getBenchGrindHeight(activeBench)
  );

  const boardCenterX =
    playerRect.left +
    playerRect.width * 0.55;

  const reachedBenchEnd =
    benchRect.right <=
    boardCenterX + 8;

  if (reachedBenchEnd) {
    const grindDuration =
      currentTime -
      grindStartTime;

    stopBenchGrind(
      grindDuration >=
        BENCH_GRIND_MINIMUM_TIME
    );
  }
}


/* =================================================
   STOP BENCH GRIND
================================================= */

function stopBenchGrind(successful) {
  const finishedBench =
    activeBench;

  isGrinding = false;
  activeBench = null;

  player.classList.remove(
    "grinding"
  );

  isJumping = true;
  playerVelocity = 7;

  player.classList.add(
    "jumping"
  );

  setPlayerAnimation("jump", true);
  scheduleGrabImage();

  if (
    successful &&
    finishedBench
  ) {
    finishedBench.grindCompleted =
      true;

    giveObstacleReward(
      finishedBench,
      2
    );
  }
}


/* =================================================
   BENCH JUMP REWARD
================================================= */

function checkBenchJumpRewards() {
  const playerRect =
    player.getBoundingClientRect();

  obstacles.forEach((obstacle) => {
    if (
      !isGrindObstacle(obstacle) ||
      obstacle.rewardGiven ||
      obstacle.grindStarted
    ) {
      return;
    }

    const benchRect =
      obstacle.element
        .getBoundingClientRect();

    const completelyPassed =
      benchRect.right <
      playerRect.left;

    if (completelyPassed) {
      obstacle.jumpedOver = true;

      giveObstacleReward(
        obstacle,
        1
      );
    }
  });
}


/* =================================================
   SAFE OBSTACLE SPACING
================================================= */

function getMinimumObstacleGap() {
  const speedProgress =
    clamp(
      (
        gameSpeed -
        STARTING_SPEED
      ) /
      (
        MAXIMUM_SPEED -
        STARTING_SPEED
      ),
      0,
      1
    );

  let requiredGap =
    MINIMUM_OBSTACLE_GAP +
    HIGH_SPEED_EXTRA_GAP *
      speedProgress;

  const previousObstacle =
    obstacles[
      obstacles.length - 1
    ];

  if (previousObstacle) {
    if (
      previousObstacle.type ===
      "ramp"
    ) {
      requiredGap +=
        RAMP_EXTRA_GAP;
    }

    if (
      isGrindObstacle(previousObstacle)
    ) {
      requiredGap +=
        BENCH_EXTRA_GAP;
    }
  }

  return requiredGap;
}


function canSpawnObstacle() {
  if (obstacles.length === 0) {
    return true;
  }

  const newestObstacle =
    obstacles[
      obstacles.length - 1
    ];

  if (
    !newestObstacle ||
    !newestObstacle.element
  ) {
    return true;
  }

  const newestRect =
    newestObstacle.element
      .getBoundingClientRect();

  const gameRect =
    gameArea.getBoundingClientRect();

  const distanceFromSpawnEdge =
    gameRect.right -
    newestRect.right;

  return (
    distanceFromSpawnEdge >=
    getMinimumObstacleGap()
  );
}


/* =================================================
   CREATE OBSTACLE
================================================= */

function createObstacle() {
  if (!gameRunning) {
    return;
  }

  if (!canSpawnObstacle()) {
    clearTimeout(obstacleTimer);

    obstacleTimer =
      window.setTimeout(
        createObstacle,
        100
      );

    return;
  }

  const obstacleType =
    chooseObstacleType();

  const obstacleElement =
    document.createElement("div");

  obstacleElement.className =
    `obstacle ${obstacleType}`;

  const startingX =
    gameArea.clientWidth + 100;

  obstacleElement.style.left =
    `${startingX}px`;

  obstaclesContainer.appendChild(
    obstacleElement
  );

  obstacles.push({
    element: obstacleElement,
    x: startingX,
    type: obstacleType,

    cleared: false,
    activated: false,

    rewardGiven: false,

    grindStarted: false,
    grindCompleted: false,
    jumpedOver: false
  });

  scheduleNextObstacle();
}


/* =================================================
   SELECT OBSTACLE
================================================= */

function chooseObstacleType() {
  const randomNumber =
    Math.random();

  if (
    randomNumber <
    RAMP_CHANCE
  ) {
    return "ramp";
  }

  if (
    randomNumber <
    RAMP_CHANCE +
      BENCH_CHANCE
  ) {
    const grindObstacles = [
      "bench",
      "grind-bar"
    ];

    return grindObstacles[
      Math.floor(
        Math.random() *
        grindObstacles.length
      )
    ];
  }

  const regularObstacles = [
    "box",
    "trash-can",
    "hydrant"
  ];

  return regularObstacles[
    Math.floor(
      Math.random() *
      regularObstacles.length
    )
  ];
}


/* =================================================
   OBSTACLE TIMER
================================================= */

function scheduleNextObstacle() {
  clearTimeout(obstacleTimer);

  const speedProgress =
    clamp(
      (
        gameSpeed -
        STARTING_SPEED
      ) /
      (
        MAXIMUM_SPEED -
        STARTING_SPEED
      ),
      0,
      1
    );

  const minimumDelay =
    MINIMUM_OBSTACLE_DELAY -
    speedProgress * 100;

  const maximumDelay =
    MAXIMUM_OBSTACLE_DELAY -
    speedProgress * 250;

  const randomDelay =
    minimumDelay +
    Math.random() *
      (
        maximumDelay -
        minimumDelay
      );

  obstacleTimer =
    window.setTimeout(
      createObstacle,
      randomDelay
    );
}


/* =================================================
   MOVE OBSTACLES
================================================= */

function updateObstacles(deltaTime) {
  const playerRect =
    player.getBoundingClientRect();

  obstacles.forEach((obstacle) => {
    obstacle.x -=
      gameSpeed * deltaTime;

    obstacle.element.style.left =
      `${obstacle.x}px`;

    const obstacleRect =
      obstacle.element
        .getBoundingClientRect();

    const passedPlayer =
      !obstacle.cleared &&
      obstacleRect.right <
        playerRect.left;

    if (passedPlayer) {
      obstacle.cleared = true;

      const regularObstacle =
        obstacle.type === "box" ||
        obstacle.type === "trash-can" ||
        obstacle.type === "hydrant";

      if (
        regularObstacle &&
        !obstacle.rewardGiven
      ) {
        giveObstacleReward(
          obstacle,
          1
        );
      }
    }
  });

  obstacles =
    obstacles.filter((obstacle) => {
      const width =
        obstacle.element.offsetWidth;

      const offScreen =
        obstacle.x + width < -100;

      if (!offScreen) {
        return true;
      }

      obstacle.element.remove();

      if (
        activeRamp === obstacle
      ) {
        activeRamp = null;
        isRidingRamp = false;
      }

      if (
        activeBench === obstacle
      ) {
        activeBench = null;
        isGrinding = false;

        player.classList.remove(
          "grinding"
        );
      }

      return false;
    });
}


/* =================================================
   COLLISIONS
================================================= */

function checkCollisions() {
  if (
    isRidingRamp ||
    isGrinding
  ) {
    return;
  }

  const playerRect =
    player.getBoundingClientRect();

  const playerHitbox = {
    left:
      playerRect.left +
      playerRect.width * 0.27,

    right:
      playerRect.right -
      playerRect.width * 0.22,

    top:
      playerRect.top +
      playerRect.height * 0.16,

    bottom:
      playerRect.bottom -
      playerRect.height * 0.1
  };

  for (const obstacle of obstacles) {
    if (
      obstacle.type === "ramp"
    ) {
      continue;
    }

    const obstacleRect =
      obstacle.element
        .getBoundingClientRect();

    if (
      isGrindObstacle(obstacle)
    ) {
      const benchSideHitbox = {
        left:
          obstacleRect.left + 14,

        right:
          obstacleRect.right - 14,

        top:
          obstacleRect.top + 18,

        bottom:
          obstacleRect.bottom - 3
      };

      if (
        rectanglesOverlap(
          playerHitbox,
          benchSideHitbox
        )
      ) {
        endGame();
        return;
      }

      continue;
    }

    const obstacleHitbox = {
      left:
        obstacleRect.left + 12,

      right:
        obstacleRect.right - 12,

      top:
        obstacleRect.top + 10,

      bottom:
        obstacleRect.bottom - 5
    };

    if (
      rectanglesOverlap(
        playerHitbox,
        obstacleHitbox
      )
    ) {
      endGame();
      return;
    }
  }
}


/* =================================================
   RECTANGLE COLLISION
================================================= */

function rectanglesOverlap(
  first,
  second
) {
  return (
    first.right > second.left &&
    first.left < second.right &&
    first.bottom > second.top &&
    first.top < second.bottom
  );
}


/* =================================================
   REWARDS
================================================= */

function giveObstacleReward(
  obstacle,
  amount
) {
  if (
    !obstacle ||
    obstacle.rewardGiven
  ) {
    return;
  }

  obstacle.rewardGiven = true;

  coinCount += amount;

  if (coinCountDisplay) {
    coinCountDisplay.textContent =
      coinCount;
  }

  showCoinEffect(amount);
}


/* =================================================
   COIN EFFECT
================================================= */

function showCoinEffect(amount = 1) {
  if (!coinEffect) {
    return;
  }

  const amountDisplay =
    coinEffect.querySelector("span");

  if (amountDisplay) {
    amountDisplay.textContent =
      `+${amount}`;
  }

  coinEffect.classList.remove(
    "show"
  );

  void coinEffect.offsetWidth;

  coinEffect.classList.add(
    "show"
  );
}


/* =================================================
   SCROLLING WORLD
================================================= */

function updateScrollingWorld(
  deltaTime
) {
  farCityPosition =
    updateLayerPosition(
      farCityScroll,
      farCityPosition,
      gameSpeed *
        FAR_CITY_SPEED_RATIO *
        deltaTime
    );

  updateRandomBuildings(deltaTime);

  streetPosition =
    updateLayerPosition(
      streetScroll,
      streetPosition,
      gameSpeed *
        STREET_SPEED_RATIO *
        deltaTime
    );

  foregroundPosition =
    updateLayerPosition(
      foregroundScroll,
      foregroundPosition,
      gameSpeed *
        FOREGROUND_SPEED_RATIO *
        deltaTime
    );
}


/* =================================================
   UPDATE SCROLLING LAYER
================================================= */

function updateLayerPosition(
  element,
  currentPosition,
  movement
) {
  if (!element) {
    return currentPosition;
  }

  currentPosition -= movement;

  const resetWidth =
    Math.max(
      element.scrollWidth / 2,
      gameArea.clientWidth
    );

  if (
    currentPosition <=
    -resetWidth
  ) {
    currentPosition +=
      resetWidth;
  }

  element.style.transform =
    `translate3d(
      ${currentPosition}px,
      0,
      0
    )`;

  return currentPosition;
}


/* =================================================
   RESET SCROLLING
================================================= */

function resetScrollingLayers() {
  [
    farCityScroll,
    cityScroll,
    streetScroll,
    foregroundScroll
  ].forEach((layer) => {
    if (layer) {
      layer.style.transform =
        "translate3d(0, 0, 0)";
    }
  });
}


/* =================================================
   RANDOM MODULAR BUILDINGS
================================================= */

function randomBetween(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

function chooseBuildingAsset() {
  if (BUILDING_ASSETS.length === 1) {
    lastBuildingAssetIndex = 0;
    return BUILDING_ASSETS[0];
  }

  let index = lastBuildingAssetIndex;
  while (index === lastBuildingAssetIndex) {
    index = Math.floor(Math.random() * BUILDING_ASSETS.length);
  }

  lastBuildingAssetIndex = index;
  return BUILDING_ASSETS[index];
}

function createRandomBuilding(xPosition) {
  if (!cityScroll) return null;

  const asset = chooseBuildingAsset();
  const isMobile = window.innerWidth <= 520;
  const isPortrait =
    window.innerHeight > window.innerWidth;

  const baseHeight = isMobile
    ? asset.mobileHeight
    : asset.desktopHeight;

  const scaleVariation =
    randomBetween(0.9, 1.08);

  const height = Math.round(
    baseHeight * scaleVariation
  );

  const width = Math.round(
    height * asset.aspect
  );

  const image =
    document.createElement("img");

  image.className = "random-building";
  image.src = asset.src;
  image.alt = "";
  image.draggable = false;

  image.style.width = `${width}px`;
  image.style.height = `${height}px`;

  const buildingBottom = isPortrait
    ? PORTRAIT_BUILDING_BOTTOM
    : isMobile
      ? MOBILE_BUILDING_BOTTOM
      : DESKTOP_BUILDING_BOTTOM;

  image.style.bottom =
    `${buildingBottom}px`;

  image.style.setProperty(
    "--building-x",
    `${xPosition}px`
  );

  cityScroll.appendChild(image);

  const building = {
    element: image,
    x: xPosition,
    width
  };

  backgroundBuildings.push(building);

  return building;
}

function getLastBuildingEnd() {
  if (!backgroundBuildings.length) return -60;

  return Math.max(
    ...backgroundBuildings.map((building) => building.x + building.width)
  );
}

function fillBuildingLayer() {
  if (!cityScroll || !gameArea) return;

  const targetEnd = gameArea.clientWidth + BUILDING_BUFFER;
  let nextX = getLastBuildingEnd();

  while (nextX < targetEnd) {
    const gap = randomBetween(BUILDING_MINIMUM_GAP, BUILDING_MAXIMUM_GAP);
    const building = createRandomBuilding(nextX + gap);
    if (!building) break;
    nextX = building.x + building.width;
  }
}

function resetRandomBuildings() {
  if (!cityScroll) return;

  cityScroll.innerHTML = "";
  backgroundBuildings = [];
  lastBuildingAssetIndex = -1;

  createRandomBuilding(-80);
  fillBuildingLayer();
}

function updateRandomBuildings(deltaTime) {
  if (!cityScroll || !gameArea) return;

  const movement = gameSpeed * CITY_SPEED_RATIO * deltaTime;

  backgroundBuildings.forEach((building) => {
    building.x -= movement;
    building.element.style.setProperty("--building-x", `${building.x}px`);
  });

  backgroundBuildings = backgroundBuildings.filter((building) => {
    const visible = building.x + building.width > -120;
    if (!visible) building.element.remove();
    return visible;
  });

  fillBuildingLayer();
}


/* =================================================
   END GAME
================================================= */

function endGame() {
  if (!gameRunning) {
    return;
  }

  gameRunning = false;

  clearTimeout(obstacleTimer);
  clearTimeout(grabImageTimer);
  clearInterval(scoreTimer);

  cancelAnimationFrame(
    animationFrameId
  );

  isJumping = false;
  isRidingRamp = false;
  rampLaunchActive = false;
  isGrinding = false;

  activeRamp = null;
  activeBench = null;

  hideGrabImage();

  gameArea.classList.remove(
    "game-running"
  );

  gameArea.classList.add(
    "game-paused"
  );

  player.classList.remove(
    "jumping",
    "riding-ramp",
    "ramp-launch",
    "grinding",
    "grabbing-board"
  );

  player.classList.add(
    "crashed"
  );

  showCrashSkaterImage();

  const crashAnimationStart = performance.now();
  function playCrashAnimation(now) {
    updatePlayerAnimation((now - (playCrashAnimation.lastTime || crashAnimationStart)) / 16.67);
    playCrashAnimation.lastTime = now;
    if (!playerAnimationFinished && playerAnimation === "fall") {
      requestAnimationFrame(playCrashAnimation);
    }
  }
  requestAnimationFrame(playCrashAnimation);

  if (coinEffect) {
    coinEffect.classList.remove(
      "show"
    );
  }

  updateHighScore();

  window.setTimeout(() => {
    if (screenTitle) {
      screenTitle.textContent =
        "You Crashed!";
    }

    if (screenMessage) {
      screenMessage.textContent =
        `You scored ${score} points and collected ${coinCount} coins.`;
    }

    if (startButton) {
      startButton.textContent =
        "Ride Again";
    }

    if (startScreen) {
      startScreen.classList.remove(
        "hidden"
      );
    }
  }, 550);
}


/* =================================================
   HIGH SCORE
================================================= */

function updateHighScore() {
  const currentHighScore =
    Number(
      localStorage.getItem(
        "skateboardHighScore"
      )
    ) || 0;

  if (score <= currentHighScore) {
    return;
  }

  localStorage.setItem(
    "skateboardHighScore",
    score
  );

  if (highScoreDisplay) {
    highScoreDisplay.textContent =
      score;
  }
}


/* =================================================
   CLEAR GAME
================================================= */

function clearGame() {
  clearTimeout(obstacleTimer);
  clearTimeout(grabImageTimer);
  clearInterval(scoreTimer);

  if (animationFrameId !== null) {
    cancelAnimationFrame(
      animationFrameId
    );
  }

  obstacles.forEach((obstacle) => {
    obstacle.element.remove();
  });

  obstacles = [];

  if (obstaclesContainer) {
    obstaclesContainer.innerHTML = "";
  }

  activeRamp = null;
  activeBench = null;

  isJumping = false;
  isRidingRamp = false;
  isGrinding = false;
  rampLaunchActive = false;

  grindStartTime = 0;
  grabImageTimer = null;

  hideGrabImage();
}


/* =================================================
   HELPERS
================================================= */

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(value, minimum),
    maximum
  );
}


/* =================================================
   INPUT
================================================= */

function handleKeyboardInput(event) {
  const jumpKeys = [
    "Space",
    "ArrowUp",
    "KeyW"
  ];

  if (
    !jumpKeys.includes(
      event.code
    )
  ) {
    return;
  }

  event.preventDefault();

  jump();
}


function handleGameInput(event) {
  if (
    event.target.closest(
      "#start-button"
    )
  ) {
    return;
  }

  jump();
}


/* =================================================
   EVENTS
================================================= */

if (startButton) {
  startButton.addEventListener(
    "click",
    startGame
  );
}

if (gameArea) {
  gameArea.addEventListener(
    "pointerdown",
    handleGameInput
  );
}

window.addEventListener(
  "keydown",
  handleKeyboardInput
);


/* =================================================
   RESIZE
================================================= */

window.addEventListener(
  "resize",
  () => {
    setPlayerHeight(playerHeight);

    farCityPosition = 0;
    cityPosition = 0;
    streetPosition = 0;
    foregroundPosition = 0;

    resetScrollingLayers();
    resetRandomBuildings();
  }
);

// Display the new character and environment before the first game starts.
setPlayerAnimation("idle", true);
resetRandomBuildings();

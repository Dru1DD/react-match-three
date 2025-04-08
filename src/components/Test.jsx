import { useState, useEffect, useRef } from 'react';

  // Game constants and settings
const tileColors = [
    [255, 128, 128], 
    [128, 255, 128], 
    [128, 128, 255], 
    [255, 255, 128], 
    [255, 128, 255], 
    [128, 255, 255], 
    [255, 255, 255]
  ];

export default function TestGame() {
  // Canvas and game state references
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const requestRef = useRef(null);
  const lastFrameRef = useRef(0);
  
  // Game state
  const [score, setScore] = useState(0);
  const [fps, setFps] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showMoves, setShowMoves] = useState(false);
  
  
  // Game variables using refs to maintain state across renders
  const gameStateRef = useRef({
    level: { 
      x: 250, 
      y: 113, 
      columns: 8, 
      rows: 8, 
      tileWidth: 40, 
      tileHeight: 40, 
      tiles: [], 
      selectedTile: { 
        selected: false, 
        column: 0, 
        row: 0 
      } 
    },
    clusters: [],
    moves: [],
    currentMove: { 
      column1: 0, 
      row1: 0, 
      column2: 0, 
      row2: 0 
    },
    gameStates: { 
      init: 0, 
      ready: 1, 
      resolve: 2 
    },
    gamestate: 0, // init state
    animationState: 0,
    animationTime: 0,
    animationTimeTotal: 0.3,
    drag: false,
    fpsTime: 0,
    frameCount: 0
  });
  
  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    contextRef.current = context;
    
    // Initialize tiles array
    const gameState = gameStateRef.current;
    for (let i = 0; i < gameState.level.columns; i++) {
      gameState.level.tiles[i] = [];
      for (let j = 0; j < gameState.level.rows; j++) {
        gameState.level.tiles[i][j] = { type: 0, shift: 0 };
      }
    }
    
    // Start a new game
    try {
      newGame();
    } catch (error) {
      console.error('Error starting new game: ', error);
    }
    
    // Start the game loop
    requestRef.current = requestAnimationFrame(main);
    
    // Clean up the animation frame on unmount
    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []);
  
  // Main game loop
  const main = (tframe) => {
    requestRef.current = requestAnimationFrame(main);
    try {
      update(tframe);
      render();
    } catch (error) {
      console.error('Error in main game loop: ', error);
    }
  };
  
  // Update game state
  const update = (tframe) => {
    const gameState = gameStateRef.current;
    const dt = (tframe - lastFrameRef.current) / 1000;
    lastFrameRef.current = tframe;
    
    // Update FPS counter
    gameState.fpstime += dt;
    gameState.framecount++;
    
    if (gameState.fpstime > 0.25) {
      setFps(Math.round(gameState.framecount / gameState.fpstime));
      gameState.fpstime = 0;
      gameState.framecount = 0;
    }
    
    // Check game state and update accordingly
    if (gameState.gamestate === gameState.gameStates.ready) {
      if (gameState.moves.length <= 0) {
        setGameOver(true);
      }
    } else if (gameState.gamestate === gameState.gameStates.resolve) {
      gameState.animationtime += dt;
      
      if (gameState.animationState === 0) {
        if (gameState.animationtime > gameState.animationtimetotal) {
          findClusters();
          if (gameState.clusters.length > 0) {
            for (let i = 0; i < gameState.clusters.length; i++) {
              setScore(prevScore => prevScore + 100 * (gameState.clusters[i].length - 2));
            }
            removeClusters();
            gameState.animationState = 1;
          } else {
            gameState.gamestate = gameState.gameStates.ready;
          }
          gameState.animationtime = 0;
        }
      } else if (gameState.animationState === 1) {
        if (gameState.animationtime > gameState.animationtimetotal) {
          shiftTiles();
          gameState.animationState = 0;
          gameState.animationtime = 0;
          findClusters();
          if (gameState.clusters.length <= 0) {
            gameState.gamestate = gameState.gameStates.ready;
          }
        }
      } else if (gameState.animationState === 2) {
        if (gameState.animationtime > gameState.animationtimetotal) {
          swap(
            gameState.currentMove.column1, 
            gameState.currentMove.row1, 
            gameState.currentMove.column2, 
            gameState.currentMove.row2
          );
          findClusters();
          if (gameState.clusters.length > 0) {
            gameState.animationState = 0;
            gameState.animationtime = 0;
            gameState.gamestate = gameState.gameStates.resolve;
          } else {
            gameState.animationState = 3;
            gameState.animationtime = 0;
          }
          findMoves();
          findClusters();
        }
      } else if (gameState.animationState === 3) {
        if (gameState.animationtime > gameState.animationtimetotal) {
          swap(
            gameState.currentMove.column1, 
            gameState.currentMove.row1, 
            gameState.currentMove.column2, 
            gameState.currentMove.row2
          );
          gameState.gamestate = gameState.gameStates.ready;
        }
      }
      
      findMoves();
      findClusters();
    }
  };
  
  // Render the game
  const render = () => {
    const gameState = gameStateRef.current;
    const context = contextRef.current;
    const canvas = canvasRef.current;
    
    // Draw frame
    context.fillStyle = "#d0d0d0";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#e8eaec";
    context.fillRect(1, 1, canvas.width - 2, canvas.height - 2);
    context.fillStyle = "#303030";
    context.fillRect(0, 0, canvas.width, 65);
    
    // Draw title
    context.fillStyle = "#ffffff";
    context.font = "24px Verdana";
    context.fillText("Match3 Game - React Version", 10, 30);
    
    // Draw FPS counter
    context.fillStyle = "#ffffff";
    context.font = "12px Verdana";
    context.fillText("Fps: " + fps, 13, 50);
    
    // Draw score
    context.fillStyle = "#000000";
    context.font = "24px Verdana";
    drawCenterText("Score:", 30, gameState.level.y + 40, 150);
    drawCenterText(score.toString(), 30, gameState.level.y + 70, 150);
    
    // Draw level background
    const levelwidth = gameState.level.columns * gameState.level.tileWidth;
    const levelheight = gameState.level.rows * gameState.level.tileHeight;
    context.fillStyle = "#000000";
    context.fillRect(
      gameState.level.x - 4, 
      gameState.level.y - 4, 
      levelwidth + 8, 
      levelheight + 8
    );
    
    // Render tiles
    renderTiles();
    
    // Render clusters
    renderClusters();
    
    // Render available moves
    if (showMoves && gameState.clusters.length <= 0 && gameState.gamestate === gameState.gameStates.ready) {
      renderMoves();
    }
    
    // Draw game over message
    if (gameOver) {
      context.fillStyle = "rgba(0, 0, 0, 0.8)";
      context.fillRect(gameState.level.x, gameState.level.y, levelwidth, levelheight);
      context.fillStyle = "#ffffff";
      context.font = "24px Verdana";
      drawCenterText(
        "Game Over!", 
        gameState.level.x, 
        gameState.level.y + levelheight / 2 + 10, 
        levelwidth
      );
    }
  };
  
  // Helper function to draw centered text
  const drawCenterText = (text, x, y, width) => {
    const context = contextRef.current;
    const textdim = context.measureText(text);
    context.fillText(text, x + (width - textdim.width) / 2, y);
  };
  
  // Render tiles
  const renderTiles = () => {
    const gameState = gameStateRef.current;
    
    for (let i = 0; i < gameState.level.columns; i++) {
      for (let j = 0; j < gameState.level.rows; j++) {
        const shift = gameState.level.tiles[i][j].shift;
        const coord = getTileCoordinate(
          i, 
          j, 
          0, 
          (gameState.animationtime / gameState.animationtimetotal) * shift
        );
        
        if (gameState.level.tiles[i][j].type >= 0) {
          const col = tileColors[gameState.level.tiles[i][j].type];
          drawTile(coord.tilex, coord.tiley, col[0], col[1], col[2]);
        }
        
        if (gameState.level.selectedTile.selected) {
          if (gameState.level.selectedTile.column === i && gameState.level.selectedTile.row === j) {
            drawTile(coord.tilex, coord.tiley, 255, 0, 0);
          }
        }
      }
    }
    
    if (gameState.gamestate === gameState.gameStates.resolve && 
        (gameState.animationState === 2 || gameState.animationState === 3)) {
      const shiftx = gameState.currentMove.column2 - gameState.currentMove.column1;
      const shifty = gameState.currentMove.row2 - gameState.currentMove.row1;
      
      const coord1 = getTileCoordinate(gameState.currentMove.column1, gameState.currentMove.row1, 0, 0);
      const coord1shift = getTileCoordinate(
        gameState.currentMove.column1, 
        gameState.currentMove.row1, 
        (gameState.animationtime / gameState.animationtimetotal) * shiftx, 
        (gameState.animationtime / gameState.animationtimetotal) * shifty
      );
      
      const col1 = tileColors[gameState.level.tiles[gameState.currentMove.column1][gameState.currentMove.row1].type];
      
      const coord2 = getTileCoordinate(gameState.currentMove.column2, gameState.currentMove.row2, 0, 0);
      const coord2shift = getTileCoordinate(
        gameState.currentMove.column2, 
        gameState.currentMove.row2, 
        (gameState.animationtime / gameState.animationtimetotal) * -shiftx, 
        (gameState.animationtime / gameState.animationtimetotal) * -shifty
      );
      
      const col2 = tileColors[gameState.level.tiles[gameState.currentMove.column2][gameState.currentMove.row2].type];
      
      drawTile(coord1.tilex, coord1.tiley, 0, 0, 0);
      drawTile(coord2.tilex, coord2.tiley, 0, 0, 0);
      
      if (gameState.animationState === 2) {
        drawTile(coord1shift.tilex, coord1shift.tiley, col1[0], col1[1], col1[2]);
        drawTile(coord2shift.tilex, coord2shift.tiley, col2[0], col2[1], col2[2]);
      } else {
        drawTile(coord2shift.tilex, coord2shift.tiley, col2[0], col2[1], col2[2]);
        drawTile(coord1shift.tilex, coord1shift.tiley, col1[0], col1[1], col1[2]);
      }
    }
  };
  
  // Render clusters
  const renderClusters = () => {
    const gameState = gameStateRef.current;
    const context = contextRef.current;
    
    for (let i = 0; i < gameState.clusters.length; i++) {
      const coord = getTileCoordinate(gameState.clusters[i].column, gameState.clusters[i].row, 0, 0);
      
      if (gameState.clusters[i].horizontal) {
        context.fillStyle = "#00ff00";
        context.fillRect(
          coord.tilex + gameState.level.tileWidth / 2, 
          coord.tiley + gameState.level.tileHeight / 2 - 4, 
          (gameState.clusters[i].length - 1) * gameState.level.tileWidth, 
          8
        );
      } else {
        context.fillStyle = "#0000ff";
        context.fillRect(
          coord.tilex + gameState.level.tileWidth / 2 - 4, 
          coord.tiley + gameState.level.tileHeight / 2, 
          8, 
          (gameState.clusters[i].length - 1) * gameState.level.tileHeight
        );
      }
    }
  };
  
  // Render moves
  const renderMoves = () => {
    const gameState = gameStateRef.current;
    const context = contextRef.current;
    
    for (let i = 0; i < gameState.moves.length; i++) {
      const coord1 = getTileCoordinate(gameState.moves[i].column1, gameState.moves[i].row1, 0, 0);
      const coord2 = getTileCoordinate(gameState.moves[i].column2, gameState.moves[i].row2, 0, 0);
      
      context.strokeStyle = "#ff0000";
      context.beginPath();
      context.moveTo(
        coord1.tilex + gameState.level.tileWidth / 2, 
        coord1.tiley + gameState.level.tileHeight / 2
      );
      context.lineTo(
        coord2.tilex + gameState.level.tileWidth / 2, 
        coord2.tiley + gameState.level.tileHeight / 2
      );
      context.stroke();
    }
  };
  
  // Get tile coordinate
  const getTileCoordinate = (column, row, columnOffset, rowOffset) => {
    const gameState = gameStateRef.current;
    const tilex = gameState.level.x + (column + columnOffset) * gameState.level.tileWidth;
    const tiley = gameState.level.y + (row + rowOffset) * gameState.level.tileHeight;
    return { tilex, tiley };
  };
  
  // Draw tile
  const drawTile = (x, y, r, g, b) => {
    const gameState = gameStateRef.current;
    const context = contextRef.current;
    
    context.fillStyle = `rgb(${r}, ${g}, ${b})`;
    context.fillRect(
      x + 2, 
      y + 2, 
      gameState.level.tileWidth - 4, 
      gameState.level.tileHeight - 4
    );
  };
  
  // Start a new game
  const newGame = () => {
    const gameState = gameStateRef.current;
    
    setScore(0);
    setGameOver(false);
    gameState.gamestate = gameState.gameStates.ready;
    
    createLevel();
    findMoves();
    findClusters();
  };
  
  // Create a new level
  const createLevel = () => {
    const gameState = gameStateRef.current;
    let done = false;
    
    while (!done) {
      for (let i = 0; i < gameState.level.columns; i++) {
        for (let j = 0; j < gameState.level.rows; j++) {
          gameState.level.tiles[i][j].type = getRandomTile();
        }
      }
      
      resolveClusters();
      findMoves();
      
      if (gameState.moves.length > 0) {
        done = true;
      }
    }
  };
  
  // Get random tile
  const getRandomTile = () => {
    return Math.floor(Math.random() * tileColors.length);
  };
  
  // Resolve clusters
  const resolveClusters = () => {
    const gameState = gameStateRef.current;
    
    findClusters();
    while (gameState.clusters.length > 0) {
      removeClusters();
      shiftTiles();
      findClusters();
    }
  };
  
  // Find clusters
  const findClusters = () => {
    const gameState = gameStateRef.current;
    gameState.clusters = [];
    
    // Find horizontal clusters
    for (let j = 0; j < gameState.level.rows; j++) {
      let matchlength = 1;
      for (let i = 0; i < gameState.level.columns; i++) {
        let checkcluster = false;
        
        if (i === gameState.level.columns - 1) {
          checkcluster = true;
        } else {
          if (gameState.level.tiles[i][j].type === gameState.level.tiles[i + 1][j].type &&
              gameState.level.tiles[i][j].type !== -1) {
            matchlength++;
          } else {
            checkcluster = true;
          }
        }
        
        if (checkcluster) {
          if (matchlength >= 3) {
            gameState.clusters.push({
              column: i + 1 - matchlength,
              row: j,
              length: matchlength,
              horizontal: true
            });
          }
          
          matchlength = 1;
        }
      }
    }
    
    // Find vertical clusters
    for (let i = 0; i < gameState.level.columns; i++) {
      let matchlength = 1;
      for (let j = 0; j < gameState.level.rows; j++) {
        let checkcluster = false;
        
        if (j === gameState.level.rows - 1) {
          checkcluster = true;
        } else {
          if (gameState.level.tiles[i][j].type === gameState.level.tiles[i][j + 1].type &&
              gameState.level.tiles[i][j].type !== -1) {
            matchlength++;
          } else {
            checkcluster = true;
          }
        }
        
        if (checkcluster) {
          if (matchlength >= 3) {
            gameState.clusters.push({
              column: i,
              row: j + 1 - matchlength,
              length: matchlength,
              horizontal: false
            });
          }
          
          matchlength = 1;
        }
      }
    }
  };
  
  // Find moves
  const findMoves = () => {
    const gameState = gameStateRef.current;
    gameState.moves = [];
    
    // Check horizontal swaps
    for (let j = 0; j < gameState.level.rows; j++) {
      for (let i = 0; i < gameState.level.columns - 1; i++) {
        swap(i, j, i + 1, j);
        findClusters();
        swap(i, j, i + 1, j);
        
        if (gameState.clusters.length > 0) {
          gameState.moves.push({
            column1: i,
            row1: j,
            column2: i + 1,
            row2: j
          });
        }
      }
    }
    
    // Check vertical swaps
    for (let i = 0; i < gameState.level.columns; i++) {
      for (let j = 0; j < gameState.level.rows - 1; j++) {
        swap(i, j, i, j + 1);
        findClusters();
        swap(i, j, i, j + 1);
        
        if (gameState.clusters.length > 0) {
          gameState.moves.push({
            column1: i,
            row1: j,
            column2: i,
            row2: j + 1
          });
        }
      }
    }
    
    gameState.clusters = [];
  };
  
  // Loop through clusters and apply a function
  const loopClusters = (func) => {
    const gameState = gameStateRef.current;
    
    for (let i = 0; i < gameState.clusters.length; i++) {
      const cluster = gameState.clusters[i];
      let coffset = 0;
      let roffset = 0;
      
      for (let j = 0; j < cluster.length; j++) {
        func(i, cluster.column + coffset, cluster.row + roffset, cluster);
        
        if (cluster.horizontal) {
          coffset++;
        } else {
          roffset++;
        }
      }
    }
  };
  
  // Remove clusters
  const removeClusters = () => {
    const gameState = gameStateRef.current;
    
    loopClusters((index, column, row, cluster) => {
      gameState.level.tiles[column][row].type = -1;
    });
    
    for (let i = 0; i < gameState.level.columns; i++) {
      let shift = 0;
      for (let j = gameState.level.rows - 1; j >= 0; j--) {
        if (gameState.level.tiles[i][j].type === -1) {
          shift++;
          gameState.level.tiles[i][j].shift = 0;
        } else {
          gameState.level.tiles[i][j].shift = shift;
        }
      }
    }
  };
  
  // Shift tiles
  const shiftTiles = () => {
    const gameState = gameStateRef.current;
    
    for (let i = 0; i < gameState.level.columns; i++) {
      for (let j = gameState.level.rows - 1; j >= 0; j--) {
        if (gameState.level.tiles[i][j].type === -1) {
          gameState.level.tiles[i][j].type = getRandomTile();
        } else {
          const shift = gameState.level.tiles[i][j].shift;
          if (shift > 0) {
            swap(i, j, i, j + shift);
          }
        }
        
        gameState.level.tiles[i][j].shift = 0;
      }
    }
  };
  
  // Get mouse position
  const getMousePos = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
      y: Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
    };
  };
  
  // Get tile under mouse
  const getMouseTile = (pos) => {
    const gameState = gameStateRef.current;
    const tx = Math.floor((pos.x - gameState.level.x) / gameState.level.tileWidth);
    const ty = Math.floor((pos.y - gameState.level.y) / gameState.level.tileHeight);
    
    if (tx >= 0 && tx < gameState.level.columns && ty >= 0 && ty < gameState.level.rows) {
      return {
        valid: true,
        x: tx,
        y: ty
      };
    }
    
    return {
      valid: false,
      x: 0,
      y: 0
    };
  };
  
  // Check if tiles can be swapped
  const canSwap = (x1, y1, x2, y2) => {
    return (Math.abs(x1 - x2) === 1 && y1 === y2) || 
           (Math.abs(y1 - y2) === 1 && x1 === x2);
  };
  
  // Swap tiles
  const swap = (x1, y1, x2, y2) => {
    const gameState = gameStateRef.current;
    const typeswap = gameState.level.tiles[x1][y1].type;
    gameState.level.tiles[x1][y1].type = gameState.level.tiles[x2][y2].type;
    gameState.level.tiles[x2][y2].type = typeswap;
  };
  
  // Handle mouse swap
  const mouseSwap = (c1, r1, c2, r2) => {
    const gameState = gameStateRef.current;
    
    gameState.currentMove = {
      column1: c1,
      row1: r1,
      column2: c2,
      row2: r2
    };
    
    gameState.level.selectedTile.selected = false;
    gameState.animationState = 2;
    gameState.animationtime = 0;
    gameState.gamestate = gameState.gameStates.resolve;
  };
  
  // Event handlers
  const handleMouseDown = (e) => {
    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    const pos = getMousePos(canvas, e);
    
    // Check if click was on a button
    if (pos.x >= 30 && pos.x <= 180 && pos.y >= 240 && pos.y <= 290) {
      // New Game button
      newGame();
      return;
    }
    
    if (pos.x >= 30 && pos.x <= 180 && pos.y >= 300 && pos.y <= 350) {
      // Show Moves button
      setShowMoves(!showMoves);
      return;
    }
    
    if (!gameState.drag) {
      const mt = getMouseTile(pos);
      if (mt.valid) {
        let swapped = false;
        if (gameState.level.selectedTile.selected) {
          if (mt.x === gameState.level.selectedTile.column && mt.y === gameState.level.selectedTile.row) {
            gameState.level.selectedTile.selected = false;
            gameState.drag = true;
            return;
          } else if (canSwap(mt.x, mt.y, gameState.level.selectedTile.column, gameState.level.selectedTile.row)) {
            mouseSwap(mt.x, mt.y, gameState.level.selectedTile.column, gameState.level.selectedTile.row);
            swapped = true;
          }
        }
        
        if (!swapped) {
          gameState.level.selectedTile.column = mt.x;
          gameState.level.selectedTile.row = mt.y;
          gameState.level.selectedTile.selected = true;
        }
      } else {
        gameState.level.selectedTile.selected = false;
      }
      
      gameState.drag = true;
    }
  };
  
  const handleMouseMove = (e) => {
    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    
    if (gameState.drag && gameState.level.selectedTile.selected) {
      const pos = getMousePos(canvas, e);
      const mt = getMouseTile(pos);
      
      if (mt.valid) {
        if (canSwap(mt.x, mt.y, gameState.level.selectedTile.column, gameState.level.selectedTile.row)) {
          mouseSwap(mt.x, mt.y, gameState.level.selectedTile.column, gameState.level.selectedTile.row);
        }
      }
    }
  };
  
  const handleMouseUp = () => {
    gameStateRef.current.drag = false;
  };
  
  const handleMouseOut = () => {
    gameStateRef.current.drag = false;
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">React Match3 Game</h1>
      <div className="relative">
        <canvas 
          ref={canvasRef}
          width="640" 
          height="480" 
          className="border border-gray-400 shadow-lg"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseOut={handleMouseOut}
        />
      </div>
    </div>
  )
}

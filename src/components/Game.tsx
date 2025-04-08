import React, { useRef, useEffect, useState } from 'react';

interface Tile {
  type: number;
  x: number;
  y: number;
  selected: boolean;
  matched: boolean;
  offsetX?: number;
  offsetY?: number;
}

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boardSize] = useState({ width: 8, height: 8 });
  const [tileSize] = useState(60);
  const [board, setBoard] = useState<Tile[][]>([]);
  const [selectedTile, setSelectedTile] = useState<{x: number, y: number} | null>(null);
  const [score, setScore] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [swipeStart, setSwipeStart] = useState<{x: number, y: number} | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<{x: number, y: number} | null>(null);

  // Colors for different tile types
  const tileColors = [
    '#FF5733', // red
    '#33FF57', // green
    '#3357FF', // blue
    '#F3FF33', // yellow
    '#FF33F3', // pink
    '#33FFF3', // cyan
  ];

  // Initialize the game board
  useEffect(() => {
    initializeBoard();
  }, []);

  // Draw the board whenever it changes
  useEffect(() => {
    if (board.length > 0) {
      drawBoard();
    }
  }, [board, selectedTile]);

  const generateTiles = (): Tile[][] => {
    const newBoard: Tile[][] = [];
    const maxAttempts = 100; // Максимальное количество попыток генерации
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Создаем пустое поле
      for (let y = 0; y < boardSize.height; y++) {
        newBoard[y] = [];
        for (let x = 0; x < boardSize.width; x++) {
          newBoard[y][x] = {
            type: Math.floor(Math.random() * tileColors.length),
            x,
            y,
            selected: false,
            matched: false
          };
        }
      }

      // Проверяем наличие начальных совпадений
      let hasInitialMatches = false;
      for (let y = 0; y < boardSize.height; y++) {
        for (let x = 0; x < boardSize.width; x++) {
          const matches = findMatches(newBoard, x, y);
          if (matches.length >= 3) {
            hasInitialMatches = true;
            break;
          }
        }
        if (hasInitialMatches) break;
      }

      // Если нет начальных совпадений, возвращаем поле
      if (!hasInitialMatches) {
        return newBoard;
      }
    }

    // Если не удалось создать поле без совпадений, возвращаем последнюю попытку
    return newBoard;
  };

  const initializeBoard = () => {
    const newBoard = generateTiles();
    setBoard(newBoard);
  };

  const drawBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < boardSize.height; y++) {
      for (let x = 0; x < boardSize.width; x++) {
        const tile = board[y][x];
        
        // Calculate position
        const posX = x * tileSize + (tile.offsetX || 0);
        const posY = y * tileSize + (tile.offsetY || 0);
        
        // Draw tile background
        ctx.fillStyle = tileColors[tile.type];
        
        // Draw selected highlight
        if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 4;
          ctx.strokeRect(posX + 2, posY + 2, tileSize - 4, tileSize - 4);
        }
        
        // Draw matched highlight
        if (tile.matched) {
          ctx.globalAlpha = 0.6;
        } else {
          ctx.globalAlpha = 1.0;
        }
        
        // Draw the tile
        ctx.fillRect(posX + 4, posY + 4, tileSize - 8, tileSize - 8);
        ctx.globalAlpha = 1.0;
        
        // Draw tile border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(posX + 4, posY + 4, tileSize - 8, tileSize - 8);
      }
    }

    // Draw score
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 10, boardSize.height * tileSize + 30);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSwapping || isChecking) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / tileSize);
    const y = Math.floor((event.clientY - rect.top) / tileSize);

    if (x < 0 || x >= boardSize.width || y < 0 || y >= boardSize.height) return;

    setSwipeStart({ x, y });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!swipeStart || isSwapping || isChecking) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = Math.floor((event.clientX - rect.left) / tileSize);
    const currentY = Math.floor((event.clientY - rect.top) / tileSize);

    const dx = currentX - swipeStart.x;
    const dy = currentY - swipeStart.y;

    // Only allow horizontal or vertical swipes
    if (Math.abs(dx) > Math.abs(dy)) {
      setSwipeDirection({ x: Math.sign(dx), y: 0 });
    } else {
      setSwipeDirection({ x: 0, y: Math.sign(dy) });
    }

    // Update tile positions for animation
    const newBoard = [...board.map(row => [...row])];
    newBoard[swipeStart.y][swipeStart.x].offsetX = dx * tileSize;
    newBoard[swipeStart.y][swipeStart.x].offsetY = dy * tileSize;

    if (swipeDirection) {
      const targetX = swipeStart.x + swipeDirection.x;
      const targetY = swipeStart.y + swipeDirection.y;
      if (targetX >= 0 && targetX < boardSize.width && targetY >= 0 && targetY < boardSize.height) {
        newBoard[targetY][targetX].offsetX = -dx * tileSize;
        newBoard[targetY][targetX].offsetY = -dy * tileSize;
      }
    }

    setBoard(newBoard);
  };

  const handleMouseUp = () => {
    if (!swipeStart || !swipeDirection || isSwapping || isChecking) {
      setSwipeStart(null);
      setSwipeDirection(null);
      return;
    }

    const targetX = swipeStart.x + swipeDirection.x;
    const targetY = swipeStart.y + swipeDirection.y;

    if (targetX >= 0 && targetX < boardSize.width && targetY >= 0 && targetY < boardSize.height) {
      swapTiles(swipeStart.x, swipeStart.y, targetX, targetY);
    }

    setSwipeStart(null);
    setSwipeDirection(null);
  };

  const swapTiles = async (x1: number, y1: number, x2: number, y2: number) => {
    setIsSwapping(true);
    
    // Create a copy of the board
    const newBoard = [...board.map(row => [...row])];
    
    // Swap the tiles
    const temp = {...newBoard[y1][x1]};
    newBoard[y1][x1] = {...newBoard[y2][x2], x: x1, y: y1};
    newBoard[y2][x2] = {...temp, x: x2, y: y2};
    
    setBoard(newBoard);
    setSelectedTile(null);
    
    // Check for matches after swapping
    const matches1 = findMatches(newBoard, x1, y1);
    const matches2 = findMatches(newBoard, x2, y2);
    
    const allMatches = [...matches1];
    matches2.forEach(match => {
      if (!allMatches.some(m => m[0] === match[0] && m[1] === match[1])) {
        allMatches.push(match);
      }
    });
    
    if (allMatches.length > 0) {
      // Mark matched tiles
      allMatches.forEach(([mx, my]) => {
        newBoard[my][mx].matched = true;
      });
      
      setBoard(newBoard);
      
      // Wait a moment to show the matches
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Remove matched tiles and add score
      removeMatches(allMatches);
    } else {
      // If no matches, swap back
      const tempBack = {...newBoard[y1][x1]};
      newBoard[y1][x1] = {...newBoard[y2][x2], x: x1, y: y1};
      newBoard[y2][x2] = {...tempBack, x: x2, y: y2};
      
      setBoard(newBoard);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setIsSwapping(false);
  };

  const findMatches = (currentBoard: Tile[][], x: number, y: number): [number, number][] => {
    const type = currentBoard[y][x].type;
    const matches: [number, number][] = [];
    
    // Check horizontal matches
    const horizontalMatches: [number, number][] = [[x, y]];
    
    // Check left
    let checkX = x - 1;
    while (checkX >= 0 && currentBoard[y][checkX].type === type) {
      horizontalMatches.push([checkX, y]);
      checkX--;
    }
    
    // Check right
    checkX = x + 1;
    while (checkX < boardSize.width && currentBoard[y][checkX].type === type) {
      horizontalMatches.push([checkX, y]);
      checkX++;
    }
    
    if (horizontalMatches.length >= 3) {
      matches.push(...horizontalMatches);
    }
    
    // Check vertical matches
    const verticalMatches: [number, number][] = [[x, y]];
    
    // Check up
    let checkY = y - 1;
    while (checkY >= 0 && currentBoard[checkY][x].type === type) {
      verticalMatches.push([x, checkY]);
      checkY--;
    }
    
    // Check down
    checkY = y + 1;
    while (checkY < boardSize.height && currentBoard[checkY][x].type === type) {
      verticalMatches.push([x, checkY]);
      checkY++;
    }
    
    if (verticalMatches.length >= 3) {
      matches.push(...verticalMatches);
    }
    
    // Remove duplicates
    return Array.from(new Set(matches.map(m => `${m[0]},${m[1]}`)))
      .map(id => {
        const [mx, my] = id.split(',').map(Number);
        return [mx, my] as [number, number];
      });
  };

  const removeMatches = async (matches: [number, number][]) => {
    setIsChecking(true);
    
    // Add score
    setScore(prevScore => prevScore + matches.length * 10);
    
    // Create a copy of the board
    const newBoard = [...board.map(row => [...row])];
    
    // For each column, find all matched tiles and move tiles down
    const columns = new Set(matches.map(([x]) => x));
    
    columns.forEach(x => {
      const matchedInColumn = matches.filter(([mx]) => mx === x).map(([, my]) => my);
      
      if (matchedInColumn.length > 0) {
        // Sort matches from bottom to top
        matchedInColumn.sort((a, b) => b - a);
        
        // For each matched tile in this column
        matchedInColumn.forEach(y => {
          // Move all tiles above this one down
          for (let currentY = y; currentY > 0; currentY--) {
            newBoard[currentY][x] = {
              ...newBoard[currentY - 1][x],
              y: currentY,
              matched: false
            };
          }
          
          // Create a new random tile at the top
          newBoard[0][x] = {
            type: Math.floor(Math.random() * tileColors.length),
            x,
            y: 0,
            selected: false,
            matched: false
          };
        });
      }
    });
    
    setBoard(newBoard);
    
    // Check for new matches after tiles have fallen
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let foundNewMatches = false;
    const newMatches: [number, number][] = [];
    
    for (let y = 0; y < boardSize.height; y++) {
      for (let x = 0; x < boardSize.width; x++) {
        const tileMatches = findMatches(newBoard, x, y);
        if (tileMatches.length > 0) {
          foundNewMatches = true;
          tileMatches.forEach(match => {
            if (!newMatches.some(m => m[0] === match[0] && m[1] === match[1])) {
              newMatches.push(match);
            }
          });
        }
      }
    }
    
    if (foundNewMatches) {
      // Mark matched tiles
      newMatches.forEach(([mx, my]) => {
        newBoard[my][mx].matched = true;
      });
      
      setBoard(newBoard);
      
      // Wait a moment to show the matches
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Remove new matches
      removeMatches(newMatches);
    }
    
    setIsChecking(false);
  };

  return (
    <div className="game-container">
      <h1>Match 3 Game</h1>
      <canvas
        ref={canvasRef}
        width={boardSize.width * tileSize}
        height={boardSize.height * tileSize + 40}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="controls">
        <button onClick={initializeBoard}>Reset Game</button>
      </div>
    </div>
  );
};

export default Game;


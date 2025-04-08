import { useEffect, useRef } from 'react';

const tileColors = [
    [255, 128, 128],
    [128, 255, 128],
    [128, 128, 255],
    [255, 255, 128],
    [255, 128, 255],
    [128, 255, 255],
    [255, 255, 255]
];

const GAME_STATES = {
    INIT: 0,
    READY: 1,
    RESOLVE: 2
};

const levelConfig = {
    x: 250,
    y: 113,
    columns: 8,
    rows: 8,
    tileWidth: 40,
    tileHeight: 40,
    tiles: [],
    selectedTile: { selected: false, column: 0, row: 0 }
};

const animationTimeTotal = 0.3;

const GameField = () => {
    const canvasRef = useRef(null);
    const gameState = useRef({
        score: 0,
        showMoves: false,
        gameOver: false,
        gameState: GAME_STATES.INIT,
        level: {
            ...levelConfig,
            tiles: [],
            selectedTile: { selected: false, column: 0, row: 0 }
        },
        clusters: [],
        moves: [],
        currentMove: { column1: 0, row1: 0, column2: 0, row2: 0 },
        animationState: 0,
        animationTime: 0,
        drag: false
    });

    useEffect(() => {
        try {
            newGame();
        } catch (e) {
            console.error("Error initializing game:", e);
        }
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return;

        let animationFrameId;
        let lastFrame = 0;

        const gameLoop = (timestamp) => {
            if (!lastFrame) lastFrame = timestamp;
            const deltaTime = (timestamp - lastFrame) / 1000;
            lastFrame = timestamp;

            update(deltaTime);
            render();

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        animationFrameId = requestAnimationFrame(gameLoop);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [canvasRef]);

    const update = (deltaTime) => {
        if (gameState.current.gameState === GAME_STATES.READY) {
            if (gameState.current.moves.length <= 0) {
                gameState.current.gameOver = true;
                return;
            }
        } else if (gameState.current.gameState === GAME_STATES.RESOLVE) {
            gameState.current.animationTime += deltaTime;

            if (gameState.current.animationState === 0) {
                if (gameState.current.animationTime > animationTimeTotal) {
                    findClusters();

                    if (gameState.current.clusters.length > 0) {
                        // Add points to the score
                        gameState.current.clusters.forEach(cluster => {
                            gameState.current.score += 100 * (cluster.length - 2);
                        });

                        removeClusters();
                        gameState.current.animationState = 1;
                    } else {
                        gameState.current.gameState = GAME_STATES.READY;
                    }
                    gameState.current.animationTime = 0;
                }
            } else if (gameState.current.animationState === 1) {
                if (gameState.current.animationTime > animationTimeTotal) {
                    shiftTiles();
                    gameState.current.animationState = 0;
                    gameState.current.animationTime = 0;

                    findClusters();
                    if (gameState.current.clusters.length <= 0) {
                        gameState.current.gameState = GAME_STATES.READY;
                    }
                }
            } else if (gameState.current.animationState === 2) {
                if (gameState.current.animationTime > animationTimeTotal) {
                    swap(gameState.current.currentMove.column1, gameState.current.currentMove.row1, 
                         gameState.current.currentMove.column2, gameState.current.currentMove.row2);

                    findClusters();
                    if (gameState.current.clusters.length > 0) {
                        gameState.current.animationState = 0;
                        gameState.current.animationTime = 0;
                        gameState.current.gameState = GAME_STATES.RESOLVE;
                    } else {
                        gameState.current.animationState = 3;
                        gameState.current.animationTime = 0;
                    }
                }
            } else if (gameState.current.animationState === 3) {
                if (gameState.current.animationTime > animationTimeTotal) {
                    swap(gameState.current.currentMove.column1, gameState.current.currentMove.row1, 
                         gameState.current.currentMove.column2, gameState.current.currentMove.row2);
                    gameState.current.gameState = GAME_STATES.READY;
                    gameState.current.animationTime = 0;
                }
            }

            findMoves();
            findClusters();
        }
    };

    // Render game
    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw frame
        drawFrame(context);

        // Draw score
        context.fillStyle = "#000000";
        context.font = "24px Verdana";
        drawCenterText(context, "Score:", 30, gameState.current.level.y + 40, 150);
        drawCenterText(context, gameState.current.score.toString(), 30, gameState.current.level.y + 70, 150);

        // Draw level background
        const levelwidth = gameState.current.level.columns * gameState.current.level.tileWidth;
        const levelheight = gameState.current.level.rows * gameState.current.level.tileHeight;
        context.fillStyle = "#000000";
        context.fillRect(gameState.current.level.x - 4, gameState.current.level.y - 4, levelwidth + 8, levelheight + 8);

        // Render tiles
        if (gameState.current.level.tiles && gameState.current.level.tiles.length > 0) {
            renderTiles(context);
        }

        // Render clusters
        if (gameState.current.clusters && gameState.current.clusters.length > 0) {
            renderClusters(context);
        }

        // Render moves
        if (gameState.current.showMoves && gameState.current.clusters.length <= 0 && 
            gameState.current.gameState === GAME_STATES.READY && 
            gameState.current.moves && gameState.current.moves.length > 0) {
            renderMoves(context);
        }

        // Game Over overlay
        if (gameState.current.gameOver) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(gameState.current.level.x, gameState.current.level.y, levelwidth, levelheight);
            context.fillStyle = "#ffffff";
            context.font = "24px Verdana";
            drawCenterText(context, "Game Over!", gameState.current.level.x, gameState.current.level.y + levelheight / 2 + 10, levelwidth);
        }
    };

    // Helper functions
    const drawCenterText = (context, text, x, y, width) => {
        try {
            const textdim = context.measureText(text);
            context.fillText(text, x + (width - textdim.width) / 2, y);
        } catch (e) {
            console.error("Error in drawCenterText:", e);
        }
    };

    const drawFrame = (context) => {
        try {
            const canvas = canvasRef.current;
            context.fillStyle = "#d0d0d0";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = "#e8eaec";
            context.fillRect(1, 1, canvas.width - 2, canvas.height - 2);
            context.fillStyle = "#303030";
            context.fillRect(0, 0, canvas.width, 65);
            context.fillStyle = "#ffffff";
            context.font = "24px Verdana";
            context.fillText("Match3 Example - React", 10, 30);
        } catch (e) {
            console.error("Error in drawFrame:", e);
        }
    };

    // Game logic functions
    const getRandomTile = () => {
        try {
            return Math.floor(Math.random() * tileColors.length);
        } catch (e) {
            console.error("Error in getRandomTile:", e);
            return 0;
        }
    };

    const createLevel = () => {
        let done = false;
        
        // while(!done) {
            try {
                const newTiles = [];

                for( let i = 0; i < gameState.current.level.columns; i++) {
                    newTiles[i] = [];
                    for ( let j = 0; j < gameState.current.level.rows; j++) {
                        newTiles[i][j] = { type: 0, shift: 0}
                    };
                }

                for(let i = 0; i < gameState.current.level.columns; i++) {
                    for(let j = 0; j < gameState.current.level.rows; j++) {
                        newTiles[i][j].type = getRandomTile();
                    }
                }
                console.log("Tiles", newTiles);
                gameState.current.level.tiles = newTiles;
                
                console.log("levels", gameState.current.level);
                resolveClusters();
                findMoves();

                console.log("Moves", gameState.current.moves);
                if(gameState.current.moves.length > 0) {
                    done = true;
                }
            } catch (e) {
                console.log("Error in while cycle in createLevel function", e);
            }
        // }
    };

    const resetState = () => {
        gameState.current.score = 0;
        gameState.current.gameOver = false;
        gameState.current.gameState = GAME_STATES.READY;
        gameState.current.clusters = [];
        gameState.current.moves = [];
        gameState.current.currentMove = { column1: 0, row1: 0, column2: 0, row2: 0 };
        gameState.current.animationState = 0;
        gameState.current.animationTime = 0;
    }

    const init = () => {
        resetState();
        newGame();
    }


    const newGame = () => {
        try {
            resetState();
            gameState.current.gameState = GAME_STATES.READY;
            gameState.current.gameOver = false;

            createLevel();

            findMoves();
            findClusters();

            console.log("Moves after game start", gameState.current.moves);
        } catch (e) {
            console.error("Error in newGame:", e);
        }
    };

    const findClusters = () => {
        try {
            const newClusters = [];
            const visited = new Set();

            for (let i = 0; i < gameState.current.level.columns; i++) {
                for (let j = 0; j < gameState.current.level.rows; j++) {
                    if (visited.has(`${i},${j}`)) continue;

                    const tile = gameState.current.level.tiles[i]?.[j];
                    if (!tile) continue;

                    const cluster = findCluster(i, j, tile.type, visited);
                    if (cluster.length >= 3) {
                        newClusters.push({
                            column: i,
                            row: j,
                            length: cluster.length,
                            horizontal: cluster.horizontal
                        });
                    }
                }
            }

            gameState.current.clusters = newClusters;
        } catch (e) {
            console.error("Error in findClusters:", e);
        }
    };

    const findCluster = (x, y, type, visited) => {
        const cluster = [];
        const queue = [[x, y]];
        let horizontal = true;
        let vertical = true;

        while (queue.length > 0) {
            const [i, j] = queue.shift();
            const key = `${i},${j}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const tile = gameState.current.level.tiles[i]?.[j];
            if (!tile || tile.type !== type) continue;

            cluster.push([i, j]);

            // Check horizontal
            if (i > 0 && gameState.current.level.tiles[i - 1]?.[j]?.type === type) {
                queue.push([i - 1, j]);
            }
            if (i < gameState.current.level.columns - 1 && gameState.current.level.tiles[i + 1]?.[j]?.type === type) {
                queue.push([i + 1, j]);
            }

            // Check vertical
            if (j > 0 && gameState.current.level.tiles[i]?.[j - 1]?.type === type) {
                queue.push([i, j - 1]);
            }
            if (j < gameState.current.level.rows - 1 && gameState.current.level.tiles[i]?.[j + 1]?.type === type) {
                queue.push([i, j + 1]);
            }
        }

        if (cluster.length >= 3) {
            // Determine if cluster is horizontal or vertical
            const first = cluster[0];
            const last = cluster[cluster.length - 1];
            horizontal = first[0] !== last[0];
            vertical = first[1] !== last[1];
        }

        return {
            length: cluster.length,
            horizontal: horizontal && !vertical
        };
    };

    const findMoves = () => {
        try {
            const newMoves = [];

            for (let i = 0; i < gameState.current.level.columns; i++) {
                for (let j = 0; j < gameState.current.level.rows; j++) {
                    // Check horizontal swap
                    if (i < gameState.current.level.columns - 1) {
                        swap(i, j, i + 1, j);
                        findClusters();
                        if (gameState.current.clusters.length > 0) {
                            newMoves.push({
                                column1: i,
                                row1: j,
                                column2: i + 1,
                                row2: j
                            });
                        }
                        swap(i, j, i + 1, j);
                    }

                    // Check vertical swap
                    if (j < gameState.current.level.rows - 1) {
                        swap(i, j, i, j + 1);
                        findClusters();
                        if (gameState.current.clusters.length > 0) {
                            newMoves.push({
                                column1: i,
                                row1: j,
                                column2: i,
                                row2: j + 1
                            });
                        }
                        swap(i, j, i, j + 1);
                    }
                }
            }
            console.log("MOVES", newMoves);
            gameState.current.moves = newMoves;
        } catch (e) {
            console.error("Error in findMoves:", e);
        }
    };

    const swap = (x1, y1, x2, y2) => {
        try {
            if (!gameState.current.level.tiles[x1]?.[y1] || !gameState.current.level.tiles[x2]?.[y2]) return;

            gameState.current.level.tiles = [...gameState.current.level.tiles];
            const temp = gameState.current.level.tiles[x1][y1].type;
            gameState.current.level.tiles[x1][y1].type = gameState.current.level.tiles[x2][y2].type;
            gameState.current.level.tiles[x2][y2].type = temp;
        } catch (e) {
            console.error("Error in swap:", e);
        }
    };

    const getMouseTile = (pos) => {
        try {
            const tx = Math.floor((pos.x - gameState.current.level.x) / gameState.current.level.tileWidth);
            const ty = Math.floor((pos.y - gameState.current.level.y) / gameState.current.level.tileHeight);

            if (tx >= 0 && tx < gameState.current.level.columns && ty >= 0 && ty < gameState.current.level.rows) {
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
        } catch (e) {
            console.error("Error in getMouseTile:", e);
            return { valid: false, x: 0, y: 0 };
        }
    };

    const canSwap = (x1, y1, x2, y2) => {
        try {
            return (Math.abs(x1 - x2) === 1 && y1 === y2) ||
                (Math.abs(y1 - y2) === 1 && x1 === x2);
        } catch (e) {
            console.error("Error in canSwap:", e);
            return false;
        }
    };

    const mouseSwap = (c1, r1, c2, r2) => {
        try {
            gameState.current.currentMove = {
                column1: c1,
                row1: r1,
                column2: c2,
                row2: r2
            };

            gameState.current.level.selectedTile = { ...gameState.current.level.selectedTile, selected: false };

            gameState.current.animationState = 2;
            gameState.current.animationTime = 0;
            gameState.current.gameState = GAME_STATES.RESOLVE;
        } catch (e) {
            console.error("Error in mouseSwap:", e);
        }
    };

    // Mouse event handlers
    const handleMouseMove = (e) => {
        try {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const pos = {
                x: Math.round((e.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
                y: Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
            };

            if (gameState.current.drag && gameState.current.level.selectedTile.selected) {
                const mt = getMouseTile(pos);
                if (mt.valid && canSwap(mt.x, mt.y, gameState.current.level.selectedTile.column, gameState.current.level.selectedTile.row)) {
                    mouseSwap(mt.x, mt.y, gameState.current.level.selectedTile.column, gameState.current.level.selectedTile.row);
                }
            }
        } catch (e) {
            console.error("Error in handleMouseMove:", e);
        }
    };

    const handleMouseDown = (e) => {
        try {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const pos = {
                x: Math.round((e.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
                y: Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
            };

            // Проверяем, что игра в состоянии READY и нет активной анимации
            if (gameState.current.gameState === GAME_STATES.READY && 
                gameState.current.animationState === 0) {
                const mt = getMouseTile(pos);

                if (mt.valid) {
                    let swapped = false;
                    if (gameState.current.level.selectedTile.selected) {
                        if (mt.x === gameState.current.level.selectedTile.column && 
                            mt.y === gameState.current.level.selectedTile.row) {
                            gameState.current.level.selectedTile = { ...gameState.current.level.selectedTile, selected: false };
                            gameState.current.drag = true;
                            return;
                        } else if (canSwap(mt.x, mt.y, gameState.current.level.selectedTile.column, gameState.current.level.selectedTile.row)) {
                            mouseSwap(mt.x, mt.y, gameState.current.level.selectedTile.column, gameState.current.level.selectedTile.row);
                            swapped = true;
                        }
                    }

                    if (!swapped) {
                        gameState.current.level.selectedTile = {
                            column: mt.x,
                            row: mt.y,
                            selected: true
                        };
                    }
                } else {
                    gameState.current.level.selectedTile = { ...gameState.current.level.selectedTile, selected: false };
                }

                gameState.current.drag = true;
            }

            // Проверка кнопок
            if (pos.x >= 30 && pos.x < 180) {
                if (pos.y >= 240 && pos.y < 290) {
                    newGame();
                } else if (pos.y >= 300 && pos.y < 350) {
                    gameState.current.showMoves = !gameState.current.showMoves;
                    render();
                }
            }
        } catch (e) {
            console.error("Error in handleMouseDown:", e);
        }
    };

    const handleMouseUp = () => {
        try {
            gameState.current.drag = false;
            // Сбрасываем состояние выбранного тайла после отпускания кнопки мыши
            if (gameState.current.level.selectedTile.selected) {
                gameState.current.level.selectedTile = { ...gameState.current.level.selectedTile, selected: false };
            }
        } catch (e) {
            console.error("Error in handleMouseUp:", e);
        }
    };

    const handleMouseOut = () => {
        try {
            gameState.current.drag = false;
            // Сбрасываем состояние выбранного тайла при выходе за пределы canvas
            if (gameState.current.level.selectedTile.selected) {
                gameState.current.level.selectedTile = { ...gameState.current.level.selectedTile, selected: false };
            }
        } catch (e) {
            console.error("Error in handleMouseOut:", e);
        }
    };

    const renderTiles = (context) => {
        try {
            if (!gameState.current.level.tiles || !gameState.current.level.tiles.length) return;

            for (let i = 0; i < gameState.current.level.columns; i++) {
                for (let j = 0; j < gameState.current.level.rows; j++) {
                    const tile = gameState.current.level.tiles[i]?.[j];
                    if (!tile) continue;

                    // Плавная анимация перемещения тайлов
                    let x = gameState.current.level.x + i * gameState.current.level.tileWidth;
                    let y = gameState.current.level.y + j * gameState.current.level.tileHeight;

                    // Анимация сдвига тайлов
                    if (tile.shift > 0) {
                        const progress = gameState.current.animationTime / animationTimeTotal;
                        y += tile.shift * gameState.current.level.tileHeight * progress;
                    }

                    // Анимация обмена тайлов
                    if (gameState.current.animationState === 2 || gameState.current.animationState === 3) {
                        const move = gameState.current.currentMove;
                        if ((i === move.column1 && j === move.row1) || (i === move.column2 && j === move.row2)) {
                            const progress = gameState.current.animationTime / animationTimeTotal;
                            const dx = (move.column2 - move.column1) * gameState.current.level.tileWidth;
                            const dy = (move.row2 - move.row1) * gameState.current.level.tileHeight;
                            
                            if (i === move.column1 && j === move.row1) {
                                x += dx * progress;
                                y += dy * progress;
                            } else {
                                x -= dx * progress;
                                y -= dy * progress;
                            }
                        }
                    }

                    const color = tileColors[tile.type] || [255, 255, 255];
                    context.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                    context.fillRect(x, y, gameState.current.level.tileWidth - 2, gameState.current.level.tileHeight - 2);

                    if (gameState.current.level.selectedTile.selected &&
                        gameState.current.level.selectedTile.column === i &&
                        gameState.current.level.selectedTile.row === j) {
                        context.strokeStyle = "#ffffff";
                        context.lineWidth = 2;
                        context.strokeRect(x, y, gameState.current.level.tileWidth - 2, gameState.current.level.tileHeight - 2);
                    }
                }
            }
        } catch (e) {
            console.error("Error in renderTiles:", e);
        }
    };

    const getTileCoordinate = (column, row, columnoffset, rowoffset) => {
        try {
            const tilex = gameState.current.level.x + (column + columnoffset) * gameState.current.level.tileWidth;
            const tiley = gameState.current.level.y + (row + rowoffset) * gameState.current.level.tileHeight;
            return { tilex, tiley };
        } catch (e) {
            console.error("Error in getTileCoordinate:", e);
            return { tilex: 0, tiley: 0 };
        }
    };

    const drawTile = (context, x, y, r, g, b) => {
        try {
            context.fillStyle = `rgb(${r},${g},${b})`;
            context.fillRect(x + 2, y + 2, gameState.current.level.tileWidth - 4, gameState.current.level.tileHeight - 4);
        } catch (e) {
            console.error("Error in drawTile:", e);
        }
    };

    const renderClusters = (context) => {
        try {
            if (!gameState.current.clusters || !gameState.current.clusters.length) return;

            gameState.current.clusters.forEach(cluster => {
                if (!cluster) return;

                const x = gameState.current.level.x + cluster.column * gameState.current.level.tileWidth;
                const y = gameState.current.level.y + cluster.row * gameState.current.level.tileHeight;

                const width = cluster.horizontal ? cluster.length * gameState.current.level.tileWidth : gameState.current.level.tileWidth;
                const height = cluster.horizontal ? gameState.current.level.tileHeight : cluster.length * gameState.current.level.tileHeight;

                // Плавная анимация появления/исчезновения кластера
                let opacity = 0.3;
                if (gameState.current.animationState === 0) {
                    opacity = 0.3 * (gameState.current.animationTime / animationTimeTotal);
                } else if (gameState.current.animationState === 1) {
                    opacity = 0.3 * (1 - gameState.current.animationTime / animationTimeTotal);
                }

                context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                context.fillRect(x, y, width - 2, height - 2);
            });
        } catch (e) {
            console.error("Error in renderClusters:", e);
        }
    };

    const renderMoves = (context) => {
        try {
            if (!gameState.current.moves || !gameState.current.moves.length) return;

            gameState.current.moves.forEach(move => {
                if (!move) return;

                const x1 = gameState.current.level.x + move.column1 * gameState.current.level.tileWidth + gameState.current.level.tileWidth / 2;
                const y1 = gameState.current.level.y + move.row1 * gameState.current.level.tileHeight + gameState.current.level.tileHeight / 2;
                const x2 = gameState.current.level.x + move.column2 * gameState.current.level.tileWidth + gameState.current.level.tileWidth / 2;
                const y2 = gameState.current.level.y + move.row2 * gameState.current.level.tileHeight + gameState.current.level.tileHeight / 2;

                // Пульсирующая анимация линий
                const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
                context.strokeStyle = `rgba(0, 255, 0, ${pulse})`;
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.stroke();

                // Анимация точек на концах линий
                const radius = 4 * pulse;
                context.fillStyle = `rgba(0, 255, 0, ${pulse})`;
                context.beginPath();
                context.arc(x1, y1, radius, 0, Math.PI * 2);
                context.arc(x2, y2, radius, 0, Math.PI * 2);
                context.fill();
            });
        } catch (e) {
            console.error("Error in renderMoves:", e);
        }
    };

    const resolveClusters = () => {
        try {
            findClusters();
            console.log("Clusters", gameState.current.clusters);
            while (gameState.current.clusters.length > 0) {
                removeClusters();
                shiftTiles();
                findClusters();
            }
        } catch (e) {
            console.error("Error in resolveClusters:", e);
        }
    };

    const removeClusters = () => {
        try {
            // Change the type of the tiles to -1, indicating a removed tile
            gameState.current.clusters.forEach(cluster => {
                let coffset = 0;
                let roffset = 0;
                for (let j = 0; j < cluster.length; j++) {
                    gameState.current.level.tiles = [...gameState.current.level.tiles];
                    gameState.current.level.tiles[cluster.column + coffset][cluster.row + roffset].type = -1;
                }

                if (cluster.horizontal) {
                    coffset++;
                } else {
                    roffset++;
                }
            });

            // Calculate how much a tile should be shifted downwards
            for (let i = 0; i < gameState.current.level.columns; i++) {
                let shift = 0;
                for (let j = gameState.current.level.rows - 1; j >= 0; j--) {
                    if (gameState.current.level.tiles[i][j].type === -1) {
                        shift++;
                        gameState.current.level.tiles = [...gameState.current.level.tiles];
                        gameState.current.level.tiles[i][j].shift = 0;
                    } else {
                        gameState.current.level.tiles = [...gameState.current.level.tiles];
                        gameState.current.level.tiles[i][j].shift = shift;
                    }
                }
            }
        } catch (e) {
            console.error("Error in removeClusters:", e);
        }
    };

    const shiftTiles = () => {
        try {
            for (let i = 0; i < gameState.current.level.columns; i++) {
                for (let j = gameState.current.level.rows - 1; j >= 0; j--) {
                    if (gameState.current.level.tiles[i][j].type === -1) {
                        gameState.current.level.tiles = [...gameState.current.level.tiles];
                        gameState.current.level.tiles[i][j].type = getRandomTile();
                    } else {
                        const shift = gameState.current.level.tiles[i][j].shift;
                        if (shift > 0) {
                            swap(i, j, i, j + shift);
                        }
                    }

                    gameState.current.level.tiles = [...gameState.current.level.tiles];
                    gameState.current.level.tiles[i][j].shift = 0;
                }
            }
        } catch (e) {
            console.error("Error in shiftTiles:", e);
        }
    };

    return (
        <div className='relative'>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseOut={handleMouseOut}
            />
            <div className="absolute top-60 left-12 flex flex-col gap-4">
                <button
                    onClick={newGame}
                    className="w-[150px] h-[50px] bg-black text-white border-none cursor-pointer text-[18px] font-Verdana"
                >
                    New Game
                </button>
                <button
                    onClick={() => {
                        gameState.current.showMoves = !gameState.current.showMoves;
                        render();
                    }}
                    className="w-[150px] h-[50px] bg-black text-white border-none cursor-pointer text-[18px] font-Verdana"
                >
                    {gameState.current.showMoves ? 'Hide Moves' : 'Show Moves'}
                </button>
            </div>
        </div>
    );
};

export default GameField; 

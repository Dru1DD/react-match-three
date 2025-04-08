import { useEffect, useRef, useState } from 'react';

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

const Match3Game = () => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);

    const [showMoves, setShowMoves] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [gameState, setGameState] = useState(GAME_STATES.INIT);

    const [level, setLevel] = useState({
        ...levelConfig,
        tiles: [],
        selectedTile: { selected: false, column: 0, row: 0 }
    });

    const [clusters, setClusters] = useState([]);
    const [moves, setMoves] = useState([]);

    const [currentMove, setCurrentMove] = useState({ column1: 0, row1: 0, column2: 0, row2: 0 });

    const [animationState, setAnimationState] = useState(0);
    const [animationTime, setAnimationTime] = useState(0);

    
    const [drag, setDrag] = useState(false);

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
    }, [gameState, level, clusters, moves, currentMove, animationState, animationTime]);

    const update = (deltaTime) => {
        if (gameState === GAME_STATES.READY) {
            if (moves.length <= 0) {
                setGameOver(true);
            }

        } else if (gameState === GAME_STATES.RESOLVE) {
            setAnimationTime(prev => prev + deltaTime);

            if (animationState === 0) {
                if (animationTime > animationTimeTotal) {
                    findClusters();

                    if (clusters.length > 0) {
                        // Add points to the score
                        clusters.forEach(cluster => {
                            setScore(prev => prev + 100 * (cluster.length - 2));
                        });

                        removeClusters();
                        setAnimationState(1);
                    } else {
                        setGameState(GAME_STATES.READY);
                    }
                    setAnimationTime(0);
                }
            } else if (animationState === 1) {
                if (animationTime > animationTimeTotal) {
                    shiftTiles();
                    setAnimationState(0);
                    setAnimationTime(0);

                    findClusters();
                    if (clusters.length <= 0) {
                        setGameState(GAME_STATES.READY);
                    }
                }
            } else if (animationState === 2) {
                if (animationTime > animationTimeTotal) {
                    swap(currentMove.column1, currentMove.row1, currentMove.column2, currentMove.row2);

                    findClusters();
                    if (clusters.length > 0) {
                        setAnimationState(0);
                        setAnimationTime(0);
                        setGameState(GAME_STATES.RESOLVE);
                    } else {
                        setAnimationState(3);
                        setAnimationTime(0);
                    }

                    findMoves();
                    findClusters();
                }
            } else if (animationState === 3) {
                if (animationTime > animationTimeTotal) {
                    swap(currentMove.column1, currentMove.row1, currentMove.column2, currentMove.row2);
                    setGameState(GAME_STATES.READY);
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
        drawCenterText(context, "Score:", 30, level.y + 40, 150);
        drawCenterText(context, score.toString(), 30, level.y + 70, 150);

        // Draw level background
        const levelwidth = level.columns * level.tileWidth;
        const levelheight = level.rows * level.tileHeight;
        context.fillStyle = "#000000";
        context.fillRect(level.x - 4, level.y - 4, levelwidth + 8, levelheight + 8);

        // Render tiles
        if (level.tiles && level.tiles.length > 0) {
            renderTiles(context);
        }

        // Render clusters
        if (clusters && clusters.length > 0) {
            renderClusters(context);
        }

        // Render moves
        if (showMoves && clusters.length <= 0 && gameState === GAME_STATES.READY && moves && moves.length > 0) {
            renderMoves(context);
        }

        // Game Over overlay
        if (gameOver) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x, level.y, levelwidth, levelheight);
            context.fillStyle = "#ffffff";
            context.font = "24px Verdana";
            drawCenterText(context, "Game Over!", level.x, level.y + levelheight / 2 + 10, levelwidth);
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
       try {
        let done = false;
        while (!done) {
            const newTiles = [];
            for (let i = 0; i < level.columns; i++) {
                newTiles[i] = [];
                for (let j = 0; j < level.rows; j++) {
                    newTiles[i][j] = { type: getRandomTile(), shift: 0 };
                }
            }
            setLevel(prev => ({ ...prev, tiles: newTiles }));
            // resolveClusters();
            // findMoves();
            if (moves.length > 0) {
                done = true;
            }
        }
       } catch (e) {
        console.log("Error here in createLevel", e);
       }
    };

    const resetState = () => {
        setScore(0);
        setGameOver(false);
        setGameState(GAME_STATES.READY);
        setClusters([]);
        setMoves([]);
        setCurrentMove({ column1: 0, row1: 0, column2: 0, row2: 0 });
        setAnimationState(0);
        setAnimationTime(0);
    }

    const init = () => {
        const newTiles = Array(level.columns).fill().map(() => 
            Array(level.rows).fill().map(() => ({ 
                type: Math.floor(Math.random() * tileColors.length), 
                shift: 0 
            }))
        );

        setLevel(prev => ({ ...prev, tiles: newTiles }));
        newGame();
    }

    const newGame = () => {
        try {
            setScore(0);
            setGameOver(false);
            setGameState(GAME_STATES.READY)
            
            createLevel();

            findMoves();
            findClusters();

            console.log("Moves after game start", moves);
        } catch (e) {
            console.error("Error in newGame:", e);
        }
    };

    const findClusters = () => {
        try {
            const newClusters = [];
            const visited = new Set();

            for (let i = 0; i < level.columns; i++) {
                for (let j = 0; j < level.rows; j++) {
                    if (visited.has(`${i},${j}`)) continue;

                    const tile = level.tiles[i]?.[j];
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

            setClusters(newClusters);
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

            const tile = level.tiles[i]?.[j];
            if (!tile || tile.type !== type) continue;

            cluster.push([i, j]);

            // Check horizontal
            if (i > 0 && level.tiles[i-1]?.[j]?.type === type) {
                queue.push([i-1, j]);
            }
            if (i < level.columns-1 && level.tiles[i+1]?.[j]?.type === type) {
                queue.push([i+1, j]);
            }

            // Check vertical
            if (j > 0 && level.tiles[i]?.[j-1]?.type === type) {
                queue.push([i, j-1]);
            }
            if (j < level.rows-1 && level.tiles[i]?.[j+1]?.type === type) {
                queue.push([i, j+1]);
            }
        }

        if (cluster.length >= 3) {
            // Determine if cluster is horizontal or vertical
            const first = cluster[0];
            const last = cluster[cluster.length-1];
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

            for (let i = 0; i < level.columns; i++) {
                for (let j = 0; j < level.rows; j++) {
                    // Check horizontal swap
                    if (i < level.columns-1) {
                        swap(i, j, i+1, j);
                        findClusters();
                        if (clusters.length > 0) {
                            newMoves.push({
                                column1: i,
                                row1: j,
                                column2: i+1,
                                row2: j
                            });
                        }
                        swap(i, j, i+1, j);
                    }

                    // Check vertical swap
                    if (j < level.rows-1) {
                        swap(i, j, i, j+1);
                        findClusters();
                        if (clusters.length > 0) {
                            newMoves.push({
                                column1: i,
                                row1: j,
                                column2: i,
                                row2: j+1
                            });
                        }
                        swap(i, j, i, j+1);
                    }
                }
            }
            
            setMoves(newMoves);
        } catch (e) {
            console.error("Error in findMoves:", e);
        }
    };

    const swap = (x1, y1, x2, y2) => {
        try {
            if (!level.tiles[x1]?.[y1] || !level.tiles[x2]?.[y2]) return;

            setLevel(prev => {
                const newTiles = [...prev.tiles];
                const temp = newTiles[x1][y1].type;
                newTiles[x1][y1].type = newTiles[x2][y2].type;
                newTiles[x2][y2].type = temp;
                return { ...prev, tiles: newTiles };
            });
        } catch (e) {
            console.error("Error in swap:", e);
        }
    };

    const getMouseTile = (pos) => {
        try {
            const tx = Math.floor((pos.x - level.x) / level.tileWidth);
            const ty = Math.floor((pos.y - level.y) / level.tileHeight);

            if (tx >= 0 && tx < level.columns && ty >= 0 && ty < level.rows) {
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
            setCurrentMove({
                column1: c1,
                row1: r1,
                column2: c2,
                row2: r2
            });

            setLevel(prev => ({
                ...prev,
                selectedTile: { ...prev.selectedTile, selected: false }
            }));

            setAnimationState(2);
            setAnimationTime(0);
            setGameState(GAME_STATES.RESOLVE);
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

            if (drag && level.selectedTile.selected) {
                const mt = getMouseTile(pos);
                if (mt.valid && canSwap(mt.x, mt.y, level.selectedTile.column, level.selectedTile.row)) {
                    mouseSwap(mt.x, mt.y, level.selectedTile.column, level.selectedTile.row);
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

            console.log("Drag", drag);
            if (!drag) {
                const mt = getMouseTile(pos);

                if (mt.valid) {
                    let swapped = false;
                    if (level.selectedTile.selected) {
                        if (mt.x === level.selectedTile.column && mt.y === level.selectedTile.row) {
                            setLevel(prev => ({
                                ...prev,
                                selectedTile: { ...prev.selectedTile, selected: false }
                            }));
                            setDrag(true);
                            return;
                        } else if (canSwap(mt.x, mt.y, level.selectedTile.column, level.selectedTile.row)) {
                            mouseSwap(mt.x, mt.y, level.selectedTile.column, level.selectedTile.row);
                            swapped = true;
                        }
                    }

                    if (!swapped) {
                        setLevel(prev => ({
                            ...prev,
                            selectedTile: {
                                column: mt.x,
                                row: mt.y,
                                selected: true
                            }
                        }));
                    }
                } else {
                    setLevel(prev => ({
                        ...prev,
                        selectedTile: { ...prev.selectedTile, selected: false }
                    }));
                }

                setDrag(true);
            }

            // Check buttons
            if (pos.x >= 30 && pos.x < 180) {
                if (pos.y >= 240 && pos.y < 290) {
                    newGame();
                } else if (pos.y >= 300 && pos.y < 350) {
                    setShowMoves(!showMoves);
                }
            }
        } catch (e) {
            console.error("Error in handleMouseDown:", e);
        }
    };

    const handleMouseUp = () => {
        try {
            setDrag(true);
        } catch (e) {
            console.error("Error in handleMouseUp:", e);
        }
    };

    const handleMouseOut = () => {
        try {
            setDrag(false);
        } catch (e) {
            console.error("Error in handleMouseOut:", e);
        }
    };

    const renderTiles = (context) => {
        try {
            if (!level.tiles || !level.tiles.length) return;

            for (let i = 0; i < level.columns; i++) {
                for (let j = 0; j < level.rows; j++) {
                    const tile = level.tiles[i]?.[j];
                    if (!tile) continue;

                    const x = level.x + i * level.tileWidth;
                    const y = level.y + j * level.tileHeight;
                    const color = tileColors[tile.type] || [255, 255, 255];

                    context.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                    context.fillRect(x, y, level.tileWidth - 2, level.tileHeight - 2);

                    if (level.selectedTile.selected && 
                        level.selectedTile.column === i && 
                        level.selectedTile.row === j) {
                        context.strokeStyle = "#ffffff";
                        context.lineWidth = 2;
                        context.strokeRect(x, y, level.tileWidth - 2, level.tileHeight - 2);
                    }
                }
            }
        } catch (e) {
            console.error("Error in renderTiles:", e);
        }
    };

    const getTileCoordinate = (column, row, columnoffset, rowoffset) => {
        try {
            const tilex = level.x + (column + columnoffset) * level.tileWidth;
            const tiley = level.y + (row + rowoffset) * level.tileHeight;
            return { tilex, tiley };
        } catch (e) {
            console.error("Error in getTileCoordinate:", e);
            return { tilex: 0, tiley: 0 };
        }
    };

    const drawTile = (context, x, y, r, g, b) => {
        try {
            context.fillStyle = `rgb(${r},${g},${b})`;
            context.fillRect(x + 2, y + 2, level.tileWidth - 4, level.tileHeight - 4);
        } catch (e) {
            console.error("Error in drawTile:", e);
        }
    };

    const renderClusters = (context) => {
        try {
            if (!clusters || !clusters.length) return;

            clusters.forEach(cluster => {
                if (!cluster) return;

                const x = level.x + cluster.column * level.tileWidth;
                const y = level.y + cluster.row * level.tileHeight;
                const width = cluster.horizontal ? cluster.length * level.tileWidth : level.tileWidth;
                const height = cluster.horizontal ? level.tileHeight : cluster.length * level.tileHeight;

                context.fillStyle = "rgba(255, 255, 255, 0.3)";
                context.fillRect(x, y, width - 2, height - 2);
            });
        } catch (e) {
            console.error("Error in renderClusters:", e);
        }
    };

    const renderMoves = (context) => {
        try {
            if (!moves || !moves.length) return;

            moves.forEach(move => {
                if (!move) return;

                const x1 = level.x + move.column1 * level.tileWidth + level.tileWidth / 2;
                const y1 = level.y + move.row1 * level.tileHeight + level.tileHeight / 2;
                const x2 = level.x + move.column2 * level.tileWidth + level.tileWidth / 2;
                const y2 = level.y + move.row2 * level.tileHeight + level.tileHeight / 2;

                context.strokeStyle = "#00ff00";
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.stroke();
            });
        } catch (e) {
            console.error("Error in renderMoves:", e);
        }
    };

    const resolveClusters = () => {
        try {
            findClusters();

            while (clusters.length > 0) {
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
            clusters.forEach(cluster => {
                let coffset = 0;
                let roffset = 0;
                for (let j = 0; j < cluster.length; j++) {
                    setLevel(prev => {
                        const newTiles = [...prev.tiles];
                        newTiles[cluster.column + coffset][cluster.row + roffset].type = -1;
                        return { ...prev, tiles: newTiles };
                    });

                    if (cluster.horizontal) {
                        coffset++;
                    } else {
                        roffset++;
                    }
                }
            });

            // Calculate how much a tile should be shifted downwards
            for (let i = 0; i < level.columns; i++) {
                let shift = 0;
                for (let j = level.rows - 1; j >= 0; j--) {
                    if (level.tiles[i][j].type === -1) {
                        shift++;
                        setLevel(prev => {
                            const newTiles = [...prev.tiles];
                            newTiles[i][j].shift = 0;
                            return { ...prev, tiles: newTiles };
                        });
                    } else {
                        setLevel(prev => {
                            const newTiles = [...prev.tiles];
                            newTiles[i][j].shift = shift;
                            return { ...prev, tiles: newTiles };
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Error in removeClusters:", e);
        }
    };

    const shiftTiles = () => {
        try {
            for (let i = 0; i < level.columns; i++) {
                for (let j = level.rows - 1; j >= 0; j--) {
                    if (level.tiles[i][j].type === -1) {
                        setLevel(prev => {
                            const newTiles = [...prev.tiles];
                            newTiles[i][j].type = getRandomTile();
                            return { ...prev, tiles: newTiles };
                        });
                    } else {
                        const shift = level.tiles[i][j].shift;
                        if (shift > 0) {
                            swap(i, j, i, j + shift);
                        }
                    }

                    setLevel(prev => {
                        const newTiles = [...prev.tiles];
                        newTiles[i][j].shift = 0;
                        return { ...prev, tiles: newTiles };
                    });
                }
            }
        } catch (e) {
            console.error("Error in shiftTiles:", e);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseOut={handleMouseOut}
            />
            <div style={{ 
                position: 'absolute', 
                top: '240px', 
                left: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <button 
                    onClick={newGame}
                    style={{
                        width: '150px',
                        height: '50px',
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontFamily: 'Verdana'
                    }}
                >
                    New Game
                </button>
                <button 
                    onClick={() => setShowMoves(!showMoves)}
                    style={{
                        width: '150px',
                        height: '50px',
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontFamily: 'Verdana'
                    }}
                >
                    {showMoves ? 'Hide Moves' : 'Show Moves'}
                </button>
            </div>
        </div>
    );
};

export default Match3Game; 

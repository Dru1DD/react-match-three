// Basic coordinate type
interface Coordinate {
    x: number;
    y: number;
}

// Tile interface
interface Tile {
    type: number;
    shift: number;
}

// Selected tile information
interface SelectedTile {
    selected: boolean;
    column: number;
    row: number;
}

// Game level configuration and state
interface Level {
    x: number;
    y: number;
    columns: number;
    rows: number;
    tilewidth: number;
    tileheight: number;
    tiles: Tile[][];
    selectedtile: SelectedTile;
}

// Button interface
interface Button {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
}

// Move interface for tracking potential and current moves
interface Move {
    column1: number;
    row1: number;
    column2: number;
    row2: number;
}

// Cluster interface for matching tiles
interface Cluster {
    column: number;
    row: number;
    length: number;
    horizontal: boolean;
}

// Mouse tile position
interface MouseTile {
    valid: boolean;
    x: number;
    y: number;
}

// Tile coordinate in the game grid
interface TileCoordinate {
    tilex: number;
    tiley: number;
}

// Game states enum
enum GameState {
    Init = 0,
    Ready = 1,
    Resolve = 2
}

// Animation state types
type AnimationState = 0 | 1 | 2 | 3;

// Color definition as [r, g, b]
type Color = [number, number, number];

class Match3Game {
    // Canvas references
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    
    // Game timing
    private lastframe: number = 0;
    private fpstime: number = 0;
    private framecount: number = 0;
    private fps: number = 0;
    
    // Input
    private drag: boolean = false;
    
    // Level
    private level: Level = {
      x: 250,
      y: 113,
      columns: 8,
      rows: 8,
      tilewidth: 40,
      tileheight: 40,
      tiles: [],
      selectedtile: { selected: false, column: 0, row: 0 }
    };
    
    // Tiles
    private tilecolors: Color[] = [
      [255, 128, 128],
      [128, 255, 128],
      [128, 128, 255],
      [255, 255, 128],
      [255, 128, 255],
      [128, 255, 255],
      [255, 255, 255]
    ];
    
    // Clusters and moves
    private clusters: Cluster[] = [];
    private moves: Move[] = [];
    private currentmove: Move = { column1: 0, row1: 0, column2: 0, row2: 0 };
    
    // Game states
    private gamestate: GameState = GameState.Init;
    private score: number = 0;
    
    // Animation states
    private animationstate: AnimationState = 0;
    private animationtime: number = 0;
    private animationtimetotal: number = 0.3;
    
    // UI
    private showmoves: boolean = false;
    private gameover: boolean = false;
    private buttons: Button[] = [
      { x: 30, y: 240, width: 150, height: 50, text: "New Game" },
      { x: 30, y: 300, width: 150, height: 50, text: "Show Moves" }
    ];
    
    // Game update callback
    private updateCallback: () => void;
    
    constructor(canvas: HTMLCanvasElement, updateCallback: () => void) {
      this.canvas = canvas;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get 2D context from canvas');
      }
      
      this.context = context;
      this.updateCallback = updateCallback;
      
      // Initialize the level
      for (let i = 0; i < this.level.columns; i++) {
        this.level.tiles[i] = [];
        for (let j = 0; j < this.level.rows; j++) {
          this.level.tiles[i][j] = { type: 0, shift: 0 };
        }
      }
      
      // Add event listeners
      this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
      this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
      this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
      this.canvas.addEventListener("mouseout", this.onMouseOut.bind(this));
      
      // Start a new game
      this.newGame();
    }
    
    // Initialize a new game
    public newGame(): void {
      this.score = 0;
      this.gamestate = GameState.Ready;
      this.gameover = false;
      this.createLevel();
      this.findMoves();
      this.findClusters();
      this.updateCallback();
    }
    
    // Handle a button click event
    public handleClick(pos: Coordinate): void {
      // Check if a button was clicked
      for (let i = 0; i < this.buttons.length; i++) {
        if (pos.x >= this.buttons[i].x && pos.x < this.buttons[i].x + this.buttons[i].width &&
            pos.y >= this.buttons[i].y && pos.y < this.buttons[i].y + this.buttons[i].height) {
          if (i === 0) {
            // New Game
            this.newGame();
          } else if (i === 1) {
            // Show Moves
            this.showmoves = !this.showmoves;
          }
        }
      }
    }
    
    // Main update function
    public update(tframe: number): void {
      const dt = (tframe - this.lastframe) / 1000;
      this.lastframe = tframe;
      
      this.updateFps(dt);
      
      if (this.gamestate === GameState.Ready) {
        if (this.moves.length <= 0) {
          this.gameover = true;
        }
      } else if (this.gamestate === GameState.Resolve) {
        this.animationtime += dt;
        
        if (this.animationstate === 0) {
          if (this.animationtime > this.animationtimetotal) {
            this.findClusters();
            if (this.clusters.length > 0) {
              for (let i = 0; i < this.clusters.length; i++) {
                this.score += 100 * (this.clusters[i].length - 2);
              }
              this.removeClusters();
              this.animationstate = 1;
            } else {
              this.gamestate = GameState.Ready;
            }
            this.animationtime = 0;
          }
        } else if (this.animationstate === 1) {
          if (this.animationtime > this.animationtimetotal) {
            this.shiftTiles();
            this.animationstate = 0;
            this.animationtime = 0;
            this.findClusters();
            if (this.clusters.length <= 0) {
              this.gamestate = GameState.Ready;
            }
          }
        } else if (this.animationstate === 2) {
          if (this.animationtime > this.animationtimetotal) {
            this.swap(this.currentmove.column1, this.currentmove.row1, this.currentmove.column2, this.currentmove.row2);
            this.findClusters();
            if (this.clusters.length > 0) {
              this.animationstate = 0;
              this.animationtime = 0;
              this.gamestate = GameState.Resolve;
            } else {
              this.animationstate = 3;
              this.animationtime = 0;
            }
            this.findMoves();
            this.findClusters();
          }
        } else if (this.animationstate === 3) {
          if (this.animationtime > this.animationtimetotal) {
            this.swap(this.currentmove.column1, this.currentmove.row1, this.currentmove.column2, this.currentmove.row2);
            this.gamestate = GameState.Ready;
          }
        }
        
        this.findMoves();
        this.findClusters();
      }
      
      this.updateCallback();
    }
    
    // Render the game
    public render(): void {
      this.drawFrame();
      
      // Draw score
      this.context.fillStyle = "#000000";
      this.context.font = "24px Verdana";
      this.drawCenterText("Score:", 30, this.level.y + 40, 150);
      this.drawCenterText(this.score.toString(), 30, this.level.y + 70, 150);
      
      // Draw buttons
      this.drawButtons();
      
      // Draw level background
      const levelwidth = this.level.columns * this.level.tilewidth;
      const levelheight = this.level.rows * this.level.tileheight;
      this.context.fillStyle = "#000000";
      this.context.fillRect(this.level.x - 4, this.level.y - 4, levelwidth + 8, levelheight + 8);
      
      // Draw tiles
      this.renderTiles();
      
      // Draw clusters
      this.renderClusters();
      
      // Draw moves, when applicable
      if (this.showmoves && this.clusters.length <= 0 && this.gamestate === GameState.Ready) {
        this.renderMoves();
      }
      
      // Draw game over message
      if (this.gameover) {
        this.context.fillStyle = "rgba(0, 0, 0, 0.8)";
        this.context.fillRect(this.level.x, this.level.y, levelwidth, levelheight);
        this.context.fillStyle = "#ffffff";
        this.context.font = "24px Verdana";
        this.drawCenterText("Game Over!", this.level.x, this.level.y + levelheight / 2 + 10, levelwidth);
      }
    }
    
    // Get the current game score
    public getScore(): number {
      return this.score;
    }
    
    // Game logic methods
    private updateFps(dt: number): void {
      if (this.fpstime > 0.25) {
        this.fps = Math.round(this.framecount / this.fpstime);
        this.fpstime = 0;
        this.framecount = 0;
      }
      this.fpstime += dt;
      this.framecount++;
    }
    
    private drawCenterText(text: string, x: number, y: number, width: number): void {
      const textdim = this.context.measureText(text);
      this.context.fillText(text, x + (width - textdim.width) / 2, y);
    }
    
    private drawFrame(): void {
      this.context.fillStyle = "#d0d0d0";
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.fillStyle = "#e8eaec";
      this.context.fillRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
      this.context.fillStyle = "#303030";
      this.context.fillRect(0, 0, this.canvas.width, 65);
      this.context.fillStyle = "#ffffff";
      this.context.font = "24px Verdana";
      this.context.fillText("Match3 Game", 10, 30);
      this.context.fillStyle = "#ffffff";
      this.context.font = "12px Verdana";
      this.context.fillText("Fps: " + this.fps, 13, 50);
    }
    
    private drawButtons(): void {
      for (let i = 0; i < this.buttons.length; i++) {
        this.context.fillStyle = "#000000";
        this.context.fillRect(this.buttons[i].x, this.buttons[i].y, this.buttons[i].width, this.buttons[i].height);
        this.context.fillStyle = "#ffffff";
        this.context.font = "18px Verdana";
        const textdim = this.context.measureText(this.buttons[i].text);
        this.context.fillText(
          this.buttons[i].text,
          this.buttons[i].x + (this.buttons[i].width - textdim.width) / 2,
          this.buttons[i].y + 30
        );
      }
    }
    
    private renderTiles(): void {
      for (let i = 0; i < this.level.columns; i++) {
        for (let j = 0; j < this.level.rows; j++) {
          const shift = this.level.tiles[i][j].shift;
          const coord = this.getTileCoordinate(i, j, 0, (this.animationtime / this.animationtimetotal) * shift);
          
          if (this.level.tiles[i][j].type >= 0) {
            const col = this.tilecolors[this.level.tiles[i][j].type];
            this.drawTile(coord.tilex, coord.tiley, col[0], col[1], col[2]);
          }
          
          if (this.level.selectedtile.selected) {
            if (this.level.selectedtile.column === i && this.level.selectedtile.row === j) {
              this.drawTile(coord.tilex, coord.tiley, 255, 0, 0);
            }
          }
        }
      }
      
      if (this.gamestate === GameState.Resolve && (this.animationstate === 2 || this.animationstate === 3)) {
        const shiftx = this.currentmove.column2 - this.currentmove.column1;
        const shifty = this.currentmove.row2 - this.currentmove.row1;
        
        const coord1 = this.getTileCoordinate(this.currentmove.column1, this.currentmove.row1, 0, 0);
        const coord1shift = this.getTileCoordinate(
          this.currentmove.column1,
          this.currentmove.row1,
          (this.animationtime / this.animationtimetotal) * shiftx,
          (this.animationtime / this.animationtimetotal) * shifty
        );
        
        const col1 = this.tilecolors[this.level.tiles[this.currentmove.column1][this.currentmove.row1].type];
        
        const coord2 = this.getTileCoordinate(this.currentmove.column2, this.currentmove.row2, 0, 0);
        const coord2shift = this.getTileCoordinate(
          this.currentmove.column2,
          this.currentmove.row2,
          (this.animationtime / this.animationtimetotal) * -shiftx,
          (this.animationtime / this.animationtimetotal) * -shifty
        );
        
        const col2 = this.tilecolors[this.level.tiles[this.currentmove.column2][this.currentmove.row2].type];
        
        this.drawTile(coord1.tilex, coord1.tiley, 0, 0, 0);
        this.drawTile(coord2.tilex, coord2.tiley, 0, 0, 0);
        
        if (this.animationstate === 2) {
          this.drawTile(coord1shift.tilex, coord1shift.tiley, col1[0], col1[1], col1[2]);
          this.drawTile(coord2shift.tilex, coord2shift.tiley, col2[0], col2[1], col2[2]);
        } else {
          this.drawTile(coord2shift.tilex, coord2shift.tiley, col2[0], col2[1], col2[2]);
          this.drawTile(coord1shift.tilex, coord1shift.tiley, col1[0], col1[1], col1[2]);
        }
      }
    }
    
    private getTileCoordinate(column: number, row: number, columnoffset: number, rowoffset: number): TileCoordinate {
      const tilex = this.level.x + (column + columnoffset) * this.level.tilewidth;
      const tiley = this.level.y + (row + rowoffset) * this.level.tileheight;
      return { tilex, tiley };
    }
    
    private drawTile(x: number, y: number, r: number, g: number, b: number): void {
      this.context.fillStyle = `rgb(${r},${g},${b})`;
      this.context.fillRect(x + 2, y + 2, this.level.tilewidth - 4, this.level.tileheight - 4);
    }
    
    private renderClusters(): void {
      for (let i = 0; i < this.clusters.length; i++) {
        const coord = this.getTileCoordinate(this.clusters[i].column, this.clusters[i].row, 0, 0);
        
        if (this.clusters[i].horizontal) {
          this.context.fillStyle = "#00ff00";
          this.context.fillRect(
            coord.tilex + this.level.tilewidth / 2,
            coord.tiley + this.level.tileheight / 2 - 4,
            (this.clusters[i].length - 1) * this.level.tilewidth,
            8
          );
        } else {
          this.context.fillStyle = "#0000ff";
          this.context.fillRect(
            coord.tilex + this.level.tilewidth / 2 - 4,
            coord.tiley + this.level.tileheight / 2,
            8,
            (this.clusters[i].length - 1) * this.level.tileheight
          );
        }
      }
    }
    
    private renderMoves(): void {
      for (let i = 0; i < this.moves.length; i++) {
        const coord1 = this.getTileCoordinate(this.moves[i].column1, this.moves[i].row1, 0, 0);
        const coord2 = this.getTileCoordinate(this.moves[i].column2, this.moves[i].row2, 0, 0);
        
        this.context.strokeStyle = "#ff0000";
        this.context.beginPath();
        this.context.moveTo(coord1.tilex + this.level.tilewidth / 2, coord1.tiley + this.level.tileheight / 2);
        this.context.lineTo(coord2.tilex + this.level.tilewidth / 2, coord2.tiley + this.level.tileheight / 2);
        this.context.stroke();
      }
    }
    
    private createLevel(): void {
      let done = false;
      
      while (!done) {
        for (let i = 0; i < this.level.columns; i++) {
          for (let j = 0; j < this.level.rows; j++) {
            this.level.tiles[i][j].type = this.getRandomTile();
          }
        }
        
        this.resolveClusters();
        this.findMoves();
        
        if (this.moves.length > 0) {
          done = true;
        }
      }
    }
    
    private getRandomTile(): number {
      return Math.floor(Math.random() * this.tilecolors.length);
    }
    
    private resolveClusters(): void {
      this.findClusters();
      
      while (this.clusters.length > 0) {
        this.removeClusters();
        this.shiftTiles();
        this.findClusters();
      }
    }
    
    private findClusters(): void {
      this.clusters = [];
      
      // Find horizontal clusters
      for (let j = 0; j < this.level.rows; j++) {
        let matchlength = 1;
        
        for (let i = 0; i < this.level.columns; i++) {
          let checkcluster = false;
          
          if (i === this.level.columns - 1) {
            checkcluster = true;
          } else {
            if (this.level.tiles[i][j].type === this.level.tiles[i + 1][j].type &&
                this.level.tiles[i][j].type !== -1) {
              matchlength += 1;
            } else {
              checkcluster = true;
            }
          }
          
          if (checkcluster) {
            if (matchlength >= 3) {
              this.clusters.push({
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
      for (let i = 0; i < this.level.columns; i++) {
        let matchlength = 1;
        
        for (let j = 0; j < this.level.rows; j++) {
          let checkcluster = false;
          
          if (j === this.level.rows - 1) {
            checkcluster = true;
          } else {
            if (this.level.tiles[i][j].type === this.level.tiles[i][j + 1].type &&
                this.level.tiles[i][j].type !== -1) {
              matchlength += 1;
            } else {
              checkcluster = true;
            }
          }
          
          if (checkcluster) {
            if (matchlength >= 3) {
              this.clusters.push({
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
    }
    
    private findMoves(): void {
      this.moves = [];
      
      // Check horizontal swaps
      for (let j = 0; j < this.level.rows; j++) {
        for (let i = 0; i < this.level.columns - 1; i++) {
          this.swap(i, j, i + 1, j);
          this.findClusters();
          this.swap(i, j, i + 1, j);
          
          if (this.clusters.length > 0) {
            this.moves.push({ column1: i, row1: j, column2: i + 1, row2: j });
          }
        }
      }
      
      // Check vertical swaps
      for (let i = 0; i < this.level.columns; i++) {
        for (let j = 0; j < this.level.rows - 1; j++) {
          this.swap(i, j, i, j + 1);
          this.findClusters();
          this.swap(i, j, i, j + 1);
          
          if (this.clusters.length > 0) {
            this.moves.push({ column1: i, row1: j, column2: i, row2: j + 1 });
          }
        }
      }
      
      this.clusters = [];
    }
    
    private loopClusters(func: (index: number, column: number, row: number, cluster: Cluster) => void): void {
      for (let i = 0; i < this.clusters.length; i++) {
        const cluster = this.clusters[i];
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
    }
    
    private removeClusters(): void {
      this.loopClusters((column, row) => {
        this.level.tiles[column][row].type = -1;
      });
      
      for (let i = 0; i < this.level.columns; i++) {
        let shift = 0;
        
        for (let j = this.level.rows - 1; j >= 0; j--) {
          if (this.level.tiles[i][j].type === -1) {
            shift++;
            this.level.tiles[i][j].shift = 0;
          } else {
            this.level.tiles[i][j].shift = shift;
          }
        }
      }
    }
    
    private shiftTiles(): void {
      for (let i = 0; i < this.level.columns; i++) {
        for (let j = this.level.rows - 1; j >= 0; j--) {
          if (this.level.tiles[i][j].type === -1) {
            this.level.tiles[i][j].type = this.getRandomTile();
          } else {
            const shift = this.level.tiles[i][j].shift;
            
            if (shift > 0) {
              this.swap(i, j, i, j + shift);
            }
          }
          
          this.level.tiles[i][j].shift = 0;
        }
      }
    }
    
    private getMouseTile(pos: Coordinate): MouseTile {
      const tx = Math.floor((pos.x - this.level.x) / this.level.tilewidth);
      const ty = Math.floor((pos.y - this.level.y) / this.level.tileheight);
      
      if (tx >= 0 && tx < this.level.columns && ty >= 0 && ty < this.level.rows) {
        return { valid: true, x: tx, y: ty };
      }
      
      return { valid: false, x: 0, y: 0 };
    }
    
    private canSwap(x1: number, y1: number, x2: number, y2: number): boolean {
      if ((Math.abs(x1 - x2) === 1 && y1 === y2) || (Math.abs(y1 - y2) === 1 && x1 === x2)) {
        return true;
      }
      return false;
    }
    
    private swap(x1: number, y1: number, x2: number, y2: number): void {
      const typeswap = this.level.tiles[x1][y1].type;
      this.level.tiles[x1][y1].type = this.level.tiles[x2][y2].type;
      this.level.tiles[x2][y2].type = typeswap;
    }
    
    private mouseSwap(c1: number, r1: number, c2: number, r2: number): void {
      this.currentmove = { column1: c1, row1: r1, column2: c2, row2: r2 };
      this.level.selectedtile.selected = false;
      this.animationstate = 2;
      this.animationtime = 0;
      this.gamestate = GameState.Resolve;
    }
    
    // Mouse event handlers
    private onMouseMove(e: MouseEvent): void {
      const pos = this.getMousePos(e);
      
      if (this.drag && this.level.selectedtile.selected) {
        const mt = this.getMouseTile(pos);
        
        if (mt.valid) {
          if (this.canSwap(mt.x, mt.y, this.level.selectedtile.column, this.level.selectedtile.row)) {
            this.mouseSwap(mt.x, mt.y, this.level.selectedtile.column, this.level.selectedtile.row);
          }
        }
      }
    }
    
    private onMouseDown(e: MouseEvent): void {
      const pos = this.getMousePos(e);
      
      // Check if a button was clicked
      this.handleClick(pos);
      
      if (!this.drag) {
        const mt = this.getMouseTile(pos);
        
        if (mt.valid) {
          let swapped = false;
          
          if (this.level.selectedtile.selected) {
            if (mt.x === this.level.selectedtile.column && mt.y === this.level.selectedtile.row) {
              this.level.selectedtile.selected = false;
              this.drag = true;
              return;
            } else if (this.canSwap(mt.x, mt.y, this.level.selectedtile.column, this.level.selectedtile.row)) {
              this.mouseSwap(mt.x, mt.y, this.level.selectedtile.column, this.level.selectedtile.row);
              swapped = true;
            }
          }
          
          if (!swapped) {
            this.level.selectedtile.column = mt.x;
            this.level.selectedtile.row = mt.y;
            this.level.selectedtile.selected = true;
          }
        } else {
          this.level.selectedtile.selected = false;
        }
        
        this.drag = true;
      }
    }
    
    private onMouseUp(): void {
      this.drag = false;
    }
    
    private onMouseOut(): void {
      this.drag = false;
    }
    
    private getMousePos(e: MouseEvent): Coordinate {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: Math.round((e.clientX - rect.left) / (rect.right - rect.left) * this.canvas.width),
        y: Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * this.canvas.height)
      };
    }
  }
  
  export default Match3Game;

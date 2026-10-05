# Block Puzzle Kit

A block puzzle game for Godot 4.3+ (Forward+, Mobile, Compatibility): block sets with their boards,
a block shader, the rules and the boards that play them with their effects.

**The full pack:** **[Block Puzzle Kit](https://heyheythere.itch.io/block-puzzle-kit)** adds a falling-block game
with hold, ghost and wall kicks, and three more block sets, jelly, wood and neon, each in HD and
pixel art with its board. Same code: install it over this one.

**Try it first:** click *Run asset pack* above and play in your browser.

```gdscript
var board := BlockBoard.new()
board.mode = "sudoku"                                         # or "blast"
add_child(board)
board.cleared.connect(func(lines, streak): $Pop.play())
board.game_over.connect(_show_score)
```

## The art

`art/<set>/hd/` (128 x 128) and `art/<set>/pixel/` (16 x 16 pixel art; scale it by whole numbers
with nearest filtering), for the sets `glossy`, `jelly`, `wood`, `neon`:

- `<colour>.png` for `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`
- `board/cell.png`, `board/cell_alt.png` (the sudoku mode's other boxes), `board/frame.png` (a
  nine-patch, 28 px margins at 128)

`art/particles/`: `sparkle`, `glow`, `shard`, `ring`. The PNGs work in any engine.

## Use from code

```gdscript
var board := BlockBoard.new()
board.mode = "sudoku"
board.block_set = "wood"
add_child(board)
board.cleared.connect(func(lines, streak): $Pop.play())
board.game_over.connect(func(): print(board.grid.score))
```

- `BlockBoard` (Node2D): the drag-and-drop game, `mode` "blast" (8 x 8) or "sudoku" (9 x 9, boxes
  clear too). `block_set`, `pixel`, `cell_size`, `tray_side`, `tray_scale`, `drag_lift`, `speed`,
  `effects`; `start()`, `play_move()`, `put()`; signals `placed`, `cleared`, `score_changed`,
  `dealt`, `game_over`.
- `FallingBoard` (Node2D; not in Block Puzzle Kit Free): the falling-block game. Arrows or A/D move, Up/X turns, Z turns back,
  Down soft drops, Space hard drops, C/Shift holds; `keys = false` and `move()`, `turn()`,
  `drop()`, `hold()` for your own input. `start_level`, `next_count`, `show_ghost`,
  `repeat_delay`, `repeat_rate`; signals `locked`, `lines_cleared`, `score_changed`,
  `level_changed`, `held`, `game_over`.
- `BlockGrid`, `FallingGrid`: the rules with no drawing, to test or to run on a server.
  `BlockGrid.place()` returns what a placement did; `FallingGrid.tick()` and `hard_drop()` return
  events in order. `best_move()` and `best_place()` play a decent game.
- `BlockShapes`: the drag-and-drop shapes with how often each is dealt (add your own), and the
  seven tetrominoes with their wall kicks.

## The shader

`shaders/block.gdshader` works on any Sprite2D: a band of light (`shine`, 0 to 1 sweeps it across),
a white `flash`, a `lift` and a `grey`.

Open `demo/demo.tscn` to play.

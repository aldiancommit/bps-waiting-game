class_name BlockShapes
extends RefCounted
## The pieces. SHAPES are the drag-and-drop modes' (BlockGrid), as rows of `#`, each with how
## often it is dealt. TETROMINOES are the falling mode's seven (FallingGrid), in their spawn
## rotation, turned and kicked off walls by the Super Rotation System.

## name: [rows, weight]
const SHAPES := {
	"dot": [["#"], 2],
	"i2": [["##"], 4], "i2v": [["#", "#"], 4],
	"i3": [["###"], 5], "i3v": [["#", "#", "#"], 5],
	"i4": [["####"], 4], "i4v": [["#", "#", "#", "#"], 4],
	"i5": [["#####"], 2], "i5v": [["#", "#", "#", "#", "#"], 2],
	"o2": [["##", "##"], 6], "o3": [["###", "###", "###"], 2],
	"r23": [["##", "##", "##"], 2], "r32": [["###", "###"], 2],
	"c1": [["##", "#."], 3], "c2": [["##", ".#"], 3], "c3": [[".#", "##"], 3], "c4": [["#.", "##"], 3],
	"l1": [["#.", "#.", "##"], 2], "l2": [["###", "#.."], 2], "l3": [["##", ".#", ".#"], 2], "l4": [["..#", "###"], 2],
	"j1": [[".#", ".#", "##"], 2], "j2": [["#..", "###"], 2], "j3": [["##", "#.", "#."], 2], "j4": [["###", "..#"], 2],
	"t1": [["###", ".#."], 2], "t2": [[".#", "##", ".#"], 2], "t3": [[".#.", "###"], 2], "t4": [["#.", "##", "#."], 2],
	"s1": [[".##", "##."], 2], "s2": [["#.", "##", ".#"], 2],
	"z1": [["##.", ".##"], 2], "z2": [[".#", "##", "#."], 2],
	"v3": [["###", "#..", "#.."], 1], "v3b": [["###", "..#", "..#"], 1],
	"v3c": [["#..", "#..", "###"], 1], "v3d": [["..#", "..#", "###"], 1],
}

const TETROMINOES := ["I", "O", "T", "S", "Z", "J", "L"]
## Each tetromino's spawn rotation in its box, and its colour (BlockBoard.COLOURS' index).
const SPAWN := {
	"I": [["....", "####", "....", "...."], 4],
	"O": [["##", "##"], 2],
	"T": [[".#.", "###", "..."], 6],
	"S": [[".##", "##.", "..."], 3],
	"Z": [["##.", ".##", "..."], 0],
	"J": [["#..", "###", "..."], 5],
	"L": [["..#", "###", "..."], 1],
}
## Wall kicks, y down, by rotation from and to (0 spawn, 1 right, 2 twice, 3 left): the offsets
## tried in turn until the piece fits.
const KICKS := {
	"01": [Vector2i(0, 0), Vector2i(-1, 0), Vector2i(-1, -1), Vector2i(0, 2), Vector2i(-1, 2)],
	"10": [Vector2i(0, 0), Vector2i(1, 0), Vector2i(1, 1), Vector2i(0, -2), Vector2i(1, -2)],
	"12": [Vector2i(0, 0), Vector2i(1, 0), Vector2i(1, 1), Vector2i(0, -2), Vector2i(1, -2)],
	"21": [Vector2i(0, 0), Vector2i(-1, 0), Vector2i(-1, -1), Vector2i(0, 2), Vector2i(-1, 2)],
	"23": [Vector2i(0, 0), Vector2i(1, 0), Vector2i(1, -1), Vector2i(0, 2), Vector2i(1, 2)],
	"32": [Vector2i(0, 0), Vector2i(-1, 0), Vector2i(-1, 1), Vector2i(0, -2), Vector2i(-1, -2)],
	"30": [Vector2i(0, 0), Vector2i(-1, 0), Vector2i(-1, 1), Vector2i(0, -2), Vector2i(-1, -2)],
	"03": [Vector2i(0, 0), Vector2i(1, 0), Vector2i(1, -1), Vector2i(0, 2), Vector2i(1, 2)],
}
const KICKS_I := {
	"01": [Vector2i(0, 0), Vector2i(-2, 0), Vector2i(1, 0), Vector2i(-2, 1), Vector2i(1, -2)],
	"10": [Vector2i(0, 0), Vector2i(2, 0), Vector2i(-1, 0), Vector2i(2, -1), Vector2i(-1, 2)],
	"12": [Vector2i(0, 0), Vector2i(-1, 0), Vector2i(2, 0), Vector2i(-1, -2), Vector2i(2, 1)],
	"21": [Vector2i(0, 0), Vector2i(1, 0), Vector2i(-2, 0), Vector2i(1, 2), Vector2i(-2, -1)],
	"23": [Vector2i(0, 0), Vector2i(2, 0), Vector2i(-1, 0), Vector2i(2, -1), Vector2i(-1, 2)],
	"32": [Vector2i(0, 0), Vector2i(-2, 0), Vector2i(1, 0), Vector2i(-2, 1), Vector2i(1, -2)],
	"30": [Vector2i(0, 0), Vector2i(1, 0), Vector2i(-2, 0), Vector2i(1, 2), Vector2i(-2, -1)],
	"03": [Vector2i(0, 0), Vector2i(-1, 0), Vector2i(2, 0), Vector2i(-1, -2), Vector2i(2, 1)],
}

static var _cache := {}


## The cells of rows of `#`, from (0, 0) at the top left.
static func cells_of(rows: Array) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for y in rows.size():
		for x in rows[y].length():
			if rows[y][x] == "#":
				out.append(Vector2i(x, y))
	return out


## A drag-and-drop shape's cells.
static func shape(name: String) -> Array[Vector2i]:
	if not _cache.has(name):
		_cache[name] = cells_of(SHAPES[name][0])
	return _cache[name]


## How many cells across and down a set of cells spans.
static func extent(cells: Array) -> Vector2i:
	var e := Vector2i.ZERO
	for c: Vector2i in cells:
		e = Vector2i(maxi(e.x, c.x + 1), maxi(e.y, c.y + 1))
	return e


## A tetromino's cells in rotation `rot` (0 to 3, clockwise), in its box.
static func tetromino(kind: String, rot: int) -> Array[Vector2i]:
	var key := "%s%d" % [kind, posmod(rot, 4)]
	if not _cache.has(key):
		var rows: Array = SPAWN[kind][0]
		var n: int = rows.size()
		var cells := cells_of(rows)
		for i in posmod(rot, 4):
			cells.assign(cells.map(func(c: Vector2i) -> Vector2i: return Vector2i(n - 1 - c.y, c.x)))
		_cache[key] = cells
	return _cache[key]


static func kicks(kind: String, from: int, to: int) -> Array:
	if kind == "O":
		return [Vector2i.ZERO]
	return (KICKS_I if kind == "I" else KICKS)["%d%d" % [posmod(from, 4), posmod(to, 4)]]

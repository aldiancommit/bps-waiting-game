class_name BlockGrid
extends RefCounted
## A drag-and-drop block puzzle's rules with no drawing: three pieces dealt at a time, placed
## anywhere they fit; full rows and columns clear (and in "sudoku" mode, full 3 x 3 boxes); a new
## three when all are placed; over when none of what's left fits. BlockBoard draws it.

const EMPTY := -1
const MODES := {"blast": 8, "sudoku": 9}

var mode := "blast"
var size := 8
var colours := 8
## Per cell, y * size + x: a colour index or EMPTY.
var cells := PackedInt32Array()
## Three slots, each {shape, cells, colour} or null once placed.
var tray: Array = [null, null, null]
var score := 0
## Placements in a row that cleared something; a placement that clears nothing ends it.
var streak := 0
var over := false
## Deals only trays with a piece that fits, so the game ends on the player's moves and not the luck
## of the deal.
var fair := true
var rng := RandomNumberGenerator.new()


func setup(mode_name := "blast", seed_value := 0, board_size := 0) -> void:
	mode = mode_name
	size = board_size if board_size > 0 else MODES[mode]
	cells = PackedInt32Array()
	cells.resize(size * size)
	cells.fill(EMPTY)
	score = 0
	streak = 0
	over = false
	if seed_value:
		rng.seed = seed_value
	else:
		rng.randomize()
	deal()


func at(c: Vector2i) -> int:
	return cells[c.y * size + c.x]


func inside(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < size and c.y < size


func empty(c: Vector2i) -> bool:
	return inside(c) and cells[c.y * size + c.x] == EMPTY


## Whether a piece's cells, its top left at `pos`, land on empty cells.
func fits(piece_cells: Array, pos: Vector2i) -> bool:
	for c: Vector2i in piece_cells:
		if not empty(pos + c):
			return false
	return true


## Every position a piece fits at.
func places(piece_cells: Array) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	var e := BlockShapes.extent(piece_cells)
	for y in size - e.y + 1:
		for x in size - e.x + 1:
			if fits(piece_cells, Vector2i(x, y)):
				out.append(Vector2i(x, y))
	return out


func can_place(slot: int) -> bool:
	return tray[slot] != null and not places(tray[slot].cells).is_empty()


## Fills the tray with three new pieces.
func deal() -> void:
	for attempt in 30:
		for i in 3:
			var name := _pick()
			tray[i] = {"shape": name, "cells": BlockShapes.shape(name), "colour": rng.randi_range(0, colours - 1)}
		if not fair or range(3).any(can_place):
			break


func _pick() -> String:
	var total := 0
	for n: String in BlockShapes.SHAPES:
		total += BlockShapes.SHAPES[n][1]
	var r := rng.randi_range(1, total)
	for n: String in BlockShapes.SHAPES:
		r -= BlockShapes.SHAPES[n][1]
		if r <= 0:
			return n
	return "dot"


## The rows, columns and boxes that would be full with `piece_cells` at `pos`: {rows, cols, boxes}
## (box b is the one at column b % 3, row b / 3, in cells of 3).
func lines_with(piece_cells: Array, pos: Vector2i) -> Dictionary:
	var filled := {}
	for c: Vector2i in piece_cells:
		filled[pos + c] = true
	var full := func(c: Vector2i) -> bool: return filled.has(c) or at(c) != EMPTY
	var out := {"rows": [], "cols": [], "boxes": []}
	for i in size:
		if range(size).all(func(k: int) -> bool: return full.call(Vector2i(k, i))):
			out.rows.append(i)
		if range(size).all(func(k: int) -> bool: return full.call(Vector2i(i, k))):
			out.cols.append(i)
	if mode == "sudoku":
		for b in (size / 3) * (size / 3):
			var o := Vector2i(b % (size / 3), b / (size / 3)) * 3
			if range(9).all(func(k: int) -> bool: return full.call(o + Vector2i(k % 3, k / 3))):
				out.boxes.append(b)
	return out


## The cells a set of lines (lines_with's) covers, each once.
func line_cells(lines: Dictionary) -> Array[Vector2i]:
	var seen := {}
	for r: int in lines.rows:
		for k in size:
			seen[Vector2i(k, r)] = true
	for col: int in lines.cols:
		for k in size:
			seen[Vector2i(col, k)] = true
	for b: int in lines.boxes:
		var o := Vector2i(b % (size / 3), b / (size / 3)) * 3
		for k in 9:
			seen[o + Vector2i(k % 3, k / 3)] = true
	var out: Array[Vector2i] = []
	out.assign(seen.keys())
	return out


## Points for clearing `count` lines at once with `streak` clearing placements before it.
static func clear_points(count: int, streak_before: int) -> int:
	return 0 if count == 0 else 10 * count * (count + 1) / 2 * (1 + streak_before)


## Places the tray's piece in `slot` with its top left at `pos`. Returns what happened, or {} if it
## doesn't fit: {slot, pos, colour, placed (cells), rows, cols, boxes, cleared (Array of {cell,
## colour}), lines, streak, points, dealt (a new tray came), over}.
func place(slot: int, pos: Vector2i) -> Dictionary:
	var piece = tray[slot]
	if over or piece == null or not fits(piece.cells, pos):
		return {}
	var placed: Array[Vector2i] = []
	for c: Vector2i in piece.cells:
		cells[(pos + c).y * size + (pos + c).x] = piece.colour
		placed.append(pos + c)
	var lines := lines_with([], Vector2i.ZERO)
	var cleared := []
	for c in line_cells(lines):
		cleared.append({"cell": c, "colour": at(c)})
		cells[c.y * size + c.x] = EMPTY
	var count: int = lines.rows.size() + lines.cols.size() + lines.boxes.size()
	var points := placed.size() + clear_points(count, streak)
	streak = streak + 1 if count else 0
	score += points
	tray[slot] = null
	var dealt := tray.all(func(p) -> bool: return p == null)
	if dealt:
		deal()
	over = not range(3).any(can_place)
	return {"slot": slot, "pos": pos, "colour": piece.colour, "placed": placed, "rows": lines.rows, "cols": lines.cols,
		"boxes": lines.boxes, "cleared": cleared, "lines": count, "streak": streak, "points": points, "dealt": dealt, "over": over}


## The move a simple player would make: clear the most, leave the fewest single gaps and keep the
## board open. {slot, pos}, or {} with nothing to place.
func best_move() -> Dictionary:
	var best := {}
	var best_value := -INF
	for slot in 3:
		if tray[slot] == null:
			continue
		for pos in places(tray[slot].cells):
			var v := _value(tray[slot].cells, pos)
			if v > best_value:
				best_value = v
				best = {"slot": slot, "pos": pos}
	return best


func _value(piece_cells: Array, pos: Vector2i) -> float:
	var after := cells.duplicate()
	for c: Vector2i in piece_cells:
		after[(pos + c).y * size + (pos + c).x] = 0
	var lines := lines_with(piece_cells, pos)
	for c in line_cells(lines):
		after[c.y * size + c.x] = EMPTY
	var count: int = lines.rows.size() + lines.cols.size() + lines.boxes.size()
	var free := func(c: Vector2i) -> bool: return inside(c) and after[c.y * size + c.x] == EMPTY
	var gaps := 0  # empty cells boxed in on all four sides
	var edges := 0  # borders between empty and filled: the fewer, the tidier
	var filled := 0
	for y in size:
		for x in size:
			var c := Vector2i(x, y)
			if not free.call(c):
				filled += 1
				continue
			var shut := 0
			for d: Vector2i in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
				if not free.call(c + d):
					shut += 1
					edges += 1
			gaps += int(shut == 4)
	return count * 60.0 + piece_cells.size() * 2.0 - gaps * 30.0 - edges * 1.5 - filled * 0.5

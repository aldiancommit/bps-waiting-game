class_name BlockBoard
extends Node2D
## Plays a BlockGrid on screen: drag a piece from the tray onto the board. While it's held, where it
## would land shows, and the rows, columns and boxes it would fill light up; placed, they clear with
## a flash and a burst. Its top left corner is the board's; the tray sits to its right or below.

signal placed(slot: int, pos: Vector2i)
signal cleared(lines: int, streak: int)
signal score_changed(score: int)
signal dealt
signal game_over

const SETS := ["glossy", "jelly", "wood", "neon"]
const COLOURS := ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"]
const TINTS := [Color(1.0, 0.32, 0.34), Color(1.0, 0.62, 0.2), Color(1.0, 0.88, 0.3), Color(0.4, 0.95, 0.45),
	Color(0.3, 0.9, 1.0), Color(0.35, 0.6, 1.0), Color(0.75, 0.45, 1.0), Color(1.0, 0.5, 0.8)]
const SHADER := preload("shaders/block.gdshader")
## The frame's nine-patch margin, in pixels of the 128 px HD art.
const FRAME_MARGIN := 28.0

@export_enum("blast", "sudoku") var mode := "blast"
@export_enum("glossy", "jelly", "wood", "neon") var block_set := "glossy":
	set(v): block_set = v; _retexture()
## The 16 px pixel art, drawn with nearest filtering, in place of the HD art.
@export var pixel := false:
	set(v): pixel = v; _retexture()
@export var cell_size := 64.0
@export_enum("right", "below") var tray_side := "right"
## The resting tray pieces' size, as a share of the board's.
@export_range(0.3, 1.0) var tray_scale := 0.55
## How many cells above the pointer a dragged piece rides, so a finger doesn't hide it.
@export var drag_lift := 0.0
## 0 deals a new game each start.
@export var seed_value := 0
## Bursts, flashes and score popups; the blocks still clear without them.
@export var effects := true
## A rounded border round the board (art/<set>/*/board/frame.png as a nine-patch).
@export var frame := true
## A block now and then catches the light.
@export var idle_shine := true
@export var autostart := true
## Animation speed: 2 plays twice as fast.
@export_range(0.25, 4.0) var speed := 1.0

var grid := BlockGrid.new()
var busy := false
var _back: Node2D
var _blocks: Node2D
var _ghost: Node2D
var _tray: Node2D
var _fx: Node2D
var _sprites := {}  # cell -> Sprite2D
var _pieces: Array = [null, null, null]  # slot -> Node2D, its blocks as children
var _drag := -1
var _grab := Vector2.ZERO
var _aim := Vector2i(-1, -1)
var _lit: Array[Sprite2D] = []
var _textures := {}
var _shine_in := 1.0


static func art_dir() -> String:
	return SHADER.resource_path.get_base_dir().get_base_dir() + "/art"


static func block_path(set_name: String, colour: int, pixel_art := false) -> String:
	return "%s/%s/%s/%s.png" % [art_dir(), set_name, "pixel" if pixel_art else "hd", COLOURS[colour]]


## A board tile: "cell", "cell_alt" or "frame".
static func board_path(set_name: String, name: String, pixel_art := false) -> String:
	return "%s/%s/%s/board/%s.png" % [art_dir(), set_name, "pixel" if pixel_art else "hd", name]


## Whether a block set is in the project, in HD or pixel.
static func has_set(set_name: String, pixel_art := false) -> bool:
	return ResourceLoader.exists(block_path(set_name, 0, pixel_art))


## A set's texture, falling back to its HD art, then to glossy, where one is missing.
static func texture_of(set_name: String, pixel_art: bool, path_of: Callable) -> Texture2D:
	for p: String in [path_of.call(set_name, pixel_art), path_of.call(set_name, false), path_of.call("glossy", false)]:
		if ResourceLoader.exists(p):
			return load(p)
	return null


func _ready() -> void:
	for layer in ["_back", "_blocks", "_ghost", "_tray", "_fx"]:
		var n := Node2D.new()
		n.name = layer.trim_prefix("_").capitalize()
		add_child(n)
		set(layer, n)
	if autostart:
		start.call_deferred()


## Starts a new game in `mode`.
func start() -> void:
	busy = false
	_drag = -1
	grid.setup(mode, seed_value)
	for layer: Node2D in [_back, _blocks, _ghost, _tray, _fx]:
		for c in layer.get_children():
			c.queue_free()
	_sprites.clear()
	_pieces = [null, null, null]
	_lit.clear()
	if frame:
		_add_frame()
	for y in grid.size:
		for x in grid.size:
			var s := Sprite2D.new()
			s.set_meta("art", "cell_alt" if _alt(Vector2i(x, y)) else "cell")
			s.position = cell_centre(Vector2i(x, y))
			_back.add_child(s)
			_dress_tile(s)
	_deal_tray()
	score_changed.emit(0)


## Sets a block of `colour` on `c`, or clears it with BlockGrid.EMPTY: a level's starting board, a
## booster. Nothing clears until the next placement.
func put(c: Vector2i, colour: int) -> void:
	grid.cells[c.y * grid.size + c.x] = colour
	if _sprites.has(c):
		_sprites[c].queue_free()
		_sprites.erase(c)
	if colour != BlockGrid.EMPTY:
		_sprites[c] = _block(colour, cell_centre(c))
		_blocks.add_child(_sprites[c])
	_dim_tray()


func _alt(c: Vector2i) -> bool:
	if mode == "sudoku":
		return (c.x / 3 + c.y / 3) % 2 == 1
	return false


func board_size() -> Vector2:
	return Vector2(grid.size, grid.size) * cell_size


func cell_centre(c: Vector2i) -> Vector2:
	return (Vector2(c) + Vector2(0.5, 0.5)) * cell_size


## The box a tray slot's piece rests in.
func tray_rect(slot: int) -> Rect2:
	var b := board_size()
	var gap := cell_size * 0.6
	if tray_side == "below":
		var w := b.x / 3.0
		return Rect2(Vector2(w * slot, b.y + gap), Vector2(w, cell_size * 5.2 * tray_scale))
	var h := b.y / 3.0
	return Rect2(Vector2(b.x + gap, h * slot), Vector2(cell_size * 5.2 * tray_scale, h))


## The whole area the board and tray draw in.
func full_size() -> Vector2:
	var r := tray_rect(2)
	return Vector2(maxf(board_size().x, r.end.x), maxf(board_size().y, r.end.y))


func _texture(colour: int) -> Texture2D:
	var key := "%s/%s/%d" % [block_set, pixel, colour]
	if not _textures.has(key):
		_textures[key] = texture_of(block_set, pixel, func(s: String, p: bool) -> String: return block_path(s, colour, p))
	return _textures[key]


func _board_texture(name: String) -> Texture2D:
	var key := "%s/%s/%s" % [block_set, pixel, name]
	if not _textures.has(key):
		_textures[key] = texture_of(block_set, pixel, func(s: String, p: bool) -> String: return board_path(s, name, p))
	return _textures[key]


func _filter() -> CanvasItem.TextureFilter:
	return CanvasItem.TEXTURE_FILTER_NEAREST if pixel else CanvasItem.TEXTURE_FILTER_LINEAR


func _dress_tile(s: Sprite2D) -> void:
	s.texture = _board_texture(s.get_meta("art"))
	s.texture_filter = _filter()
	if s.texture:
		s.scale = Vector2.ONE * cell_size / s.texture.get_width()


func _block(colour: int, at: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.material = ShaderMaterial.new()
	s.material.shader = SHADER
	s.set_meta("colour", colour)
	s.position = at
	_dress_block(s)
	return s


func _dress_block(s: Sprite2D) -> void:
	s.texture = _texture(s.get_meta("colour"))
	s.texture_filter = _filter()
	if s.texture:
		s.set_meta("base", cell_size / s.texture.get_width())
		s.scale = Vector2.ONE * s.get_meta("base")


func _add_frame() -> void:
	var tex := _board_texture("frame")
	if tex == null:
		return
	var f := NinePatchRect.new()
	f.texture = tex
	var m := FRAME_MARGIN * tex.get_width() / 128.0
	f.patch_margin_left = ceili(m)
	f.patch_margin_top = ceili(m)
	f.patch_margin_right = ceili(m)
	f.patch_margin_bottom = ceili(m)
	var k := cell_size * 0.42 / m  # the frame's border as wide as 0.42 of a cell
	var pad := cell_size * 0.36
	f.position = Vector2(-pad, -pad)
	f.scale = Vector2.ONE * k
	f.size = (board_size() + Vector2(pad, pad) * 2.0) / k
	f.texture_filter = _filter()
	f.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_back.add_child(f)
	_back.move_child(f, 0)


func _retexture() -> void:
	_textures.clear()
	if not is_inside_tree() or _back == null:
		return
	for s: Node in _back.get_children():
		if s is NinePatchRect:
			s.queue_free()
		else:
			_dress_tile(s)
	if frame:
		_add_frame()
	for layer: Node2D in [_blocks, _ghost]:
		for s: Sprite2D in layer.get_children():
			_dress_block(s)
	for p in _pieces:
		if p:
			for s: Sprite2D in p.get_children():
				_dress_block(s)


# ---------- the tray ----------

func _deal_tray() -> void:
	for slot in 3:
		if _pieces[slot]:
			_pieces[slot].queue_free()
		_pieces[slot] = null
		var piece = grid.tray[slot]
		if piece == null:
			continue
		var n := Node2D.new()
		var e := Vector2(BlockShapes.extent(piece.cells))
		for c: Vector2i in piece.cells:
			n.add_child(_block(piece.colour, (Vector2(c) + Vector2(0.5, 0.5) - e / 2.0) * cell_size))
		n.position = tray_rect(slot).get_center()
		n.scale = Vector2.ONE * tray_scale * 0.1
		n.set_meta("e", e)
		_tray.add_child(n)
		_pieces[slot] = n
		var t := n.create_tween()
		t.tween_property(n, "scale", Vector2.ONE * tray_scale, _t(0.25)).set_delay(_t(0.07 * slot)).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	_dim_tray()
	dealt.emit()


## Greys the tray's pieces that fit nowhere.
func _dim_tray() -> void:
	for slot in 3:
		if _pieces[slot]:
			_pieces[slot].modulate = Color.WHITE if grid.can_place(slot) else Color(0.55, 0.55, 0.6, 0.7)


# ---------- input ----------

func _unhandled_input(event: InputEvent) -> void:
	if busy or grid.over:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var at := to_local(get_global_mouse_position())
		if event.pressed and _drag < 0:
			for slot in 3:
				if _pieces[slot] and tray_rect(slot).has_point(at):
					get_viewport().set_input_as_handled()
					_pick(slot, at)
					return
		elif not event.pressed and _drag >= 0:
			get_viewport().set_input_as_handled()
			_drop()
	elif event is InputEventMouseMotion and _drag >= 0:
		_hold_at(to_local(get_global_mouse_position()))


func _pick(slot: int, at: Vector2) -> void:
	_drag = slot
	var n: Node2D = _pieces[slot]
	n.z_index = 5
	_grab = Vector2(0, -drag_lift * cell_size)
	n.create_tween().tween_property(n, "scale", Vector2.ONE, _t(0.1))
	_hold_at(at)


## Where a held piece's top left cell would go with the piece's middle at `centre`.
func aim_at(slot: int, centre: Vector2) -> Vector2i:
	var e: Vector2 = _pieces[slot].get_meta("e")
	return Vector2i(((centre - e * cell_size / 2.0) / cell_size).round())


func _hold_at(at: Vector2) -> void:
	var n: Node2D = _pieces[_drag]
	n.position = at + _grab
	_show_aim(_drag, aim_at(_drag, n.position))


## Shows where the piece in `slot` would land at `pos` and lights what it would clear; (-1, -1) or a
## place it doesn't fit clears the preview.
func _show_aim(slot: int, pos: Vector2i) -> void:
	var piece = grid.tray[slot]
	var ok: bool = piece != null and grid.fits(piece.cells, pos)
	if ok and pos == _aim:
		return
	_aim = pos if ok else Vector2i(-1, -1)
	for c in _ghost.get_children():
		c.queue_free()
	for s in _lit:
		if is_instance_valid(s):
			s.material.set_shader_parameter("lift", 0.0)
	_lit.clear()
	if not ok:
		return
	var lines := grid.lines_with(piece.cells, pos)
	var lit := {}
	for c in grid.line_cells(lines):
		lit[c] = true
	for c: Vector2i in piece.cells:
		var g := _block(piece.colour, cell_centre(pos + c))
		g.modulate.a = 0.9 if lit.has(pos + c) else 0.38
		_ghost.add_child(g)
	for c: Vector2i in lit:
		if _sprites.has(c):
			var s: Sprite2D = _sprites[c]
			s.material.set_shader_parameter("lift", 0.35)
			_lit.append(s)


func _drop() -> void:
	var slot := _drag
	_drag = -1
	var n: Node2D = _pieces[slot]
	n.z_index = 0
	if _aim.x >= 0:
		await _commit(slot, _aim, n)
		return
	_show_aim(slot, Vector2i(-1, -1))
	var t := n.create_tween().set_parallel()
	t.tween_property(n, "position", tray_rect(slot).get_center(), _t(0.18)).set_trans(Tween.TRANS_QUAD)
	t.tween_property(n, "scale", Vector2.ONE * tray_scale, _t(0.18))


## Plays a move as if the player dragged it: the piece in `slot` flies to `pos` and is placed.
## Returns once the board has settled; false if it doesn't fit.
func play_move(slot: int, pos: Vector2i) -> bool:
	var piece = grid.tray[slot]
	if busy or piece == null or not grid.fits(piece.cells, pos):
		return false
	var n: Node2D = _pieces[slot]
	var e: Vector2 = n.get_meta("e")
	var to := Vector2(pos) * cell_size + e * cell_size / 2.0
	n.z_index = 5
	var t := n.create_tween().set_parallel()
	t.tween_property(n, "position", to, _t(0.32)).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	t.tween_property(n, "scale", Vector2.ONE, _t(0.32))
	t.tween_method(func(_v: float) -> void: _show_aim(slot, pos), 0.0, 1.0, _t(0.32))
	await t.finished
	await get_tree().create_timer(_t(0.12)).timeout
	await _commit(slot, pos, n)
	return true


func _commit(slot: int, pos: Vector2i, n: Node2D) -> void:
	busy = true
	_show_aim(slot, Vector2i(-1, -1))
	var ev := grid.place(slot, pos)
	n.queue_free()
	_pieces[slot] = null
	for c: Vector2i in ev.placed:
		var s := _block(ev.colour, cell_centre(c))
		_blocks.add_child(s)
		_sprites[c] = s
		var base: float = s.get_meta("base")
		s.scale = Vector2.ONE * base * 1.12
		s.create_tween().tween_property(s, "scale", Vector2.ONE * base, _t(0.14)).set_trans(Tween.TRANS_BACK)
	placed.emit(slot, pos)
	if ev.lines:
		await _clear(ev)
	score_changed.emit(grid.score)
	if ev.dealt:
		_deal_tray()
	else:
		_dim_tray()
	if ev.over:
		await _end()
	busy = false


func _clear(ev: Dictionary) -> void:
	var middle := Vector2.ZERO
	for c: Vector2i in ev.placed:
		middle += cell_centre(c)
	middle /= ev.placed.size()
	await get_tree().create_timer(_t(0.08)).timeout
	var longest := 0.0
	for item: Dictionary in ev.cleared:
		var c: Vector2i = item.cell
		var s: Sprite2D = _sprites.get(c)
		_sprites.erase(c)
		if s == null:
			continue
		var wait := _t(cell_centre(c).distance_to(middle) / cell_size * 0.035)
		longest = maxf(longest, wait)
		var base: float = s.get_meta("base")
		var t := s.create_tween()
		t.tween_interval(wait)
		t.tween_method(func(v: float) -> void: s.material.set_shader_parameter("flash", v), 0.0, 0.85, _t(0.06))
		t.parallel().tween_property(s, "scale", Vector2.ONE * base * 1.15, _t(0.06))
		t.tween_property(s, "scale", Vector2.ZERO, _t(0.16)).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)
		t.tween_callback(s.queue_free)
		if effects:
			_burst.call_deferred(cell_centre(c), TINTS[item.colour], "shard" if randf() < 0.5 else "sparkle", 3, wait)
	if effects:
		_flash_lines(ev)
		_popup(middle, ev.points, ev.lines, ev.streak)
	cleared.emit(ev.lines, ev.streak)
	await get_tree().create_timer(longest + _t(0.24)).timeout


func _end() -> void:
	await get_tree().create_timer(_t(0.3)).timeout
	var cells := _sprites.keys()
	cells.sort_custom(func(a: Vector2i, b: Vector2i) -> bool: return a.y * 100 + a.x < b.y * 100 + b.x)
	for i in cells.size():
		var s: Sprite2D = _sprites[cells[i]]
		s.create_tween().tween_method(func(v: float) -> void: s.material.set_shader_parameter("grey", v), 0.0, 1.0, _t(0.3)).set_delay(_t(0.012 * i))
	await get_tree().create_timer(_t(0.3 + 0.012 * cells.size())).timeout
	game_over.emit()


func _t(seconds: float) -> float:
	return seconds / speed


func _process(delta: float) -> void:
	if not idle_shine or busy or _sprites.is_empty():
		return
	_shine_in -= delta
	if _shine_in <= 0.0:
		_shine_in = randf_range(0.5, 1.4)
		shine(_sprites.values().pick_random())


## Sweeps a band of light across a block.
func shine(s: Sprite2D, time := 0.5) -> void:
	var t := s.create_tween()
	t.tween_method(func(v: float) -> void: s.material.set_shader_parameter("shine", v), -0.2, 1.2, time)


# ---------- effects ----------

func _particle(name: String) -> Texture2D:
	return load(art_dir() + "/particles/%s.png" % name)


func _additive() -> CanvasItemMaterial:
	var m := CanvasItemMaterial.new()
	m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	return m


func _burst(at: Vector2, tint: Color, texture: String, amount: int, delay := 0.0) -> void:
	if delay > 0.0:
		await get_tree().create_timer(delay).timeout
	var p := burst(at, tint, texture, amount, cell_size / 64.0, _t(0.6))
	_fx.add_child(p)
	p.emitting = true


## A one-shot spray of a particle (art/particles/), `k` its size and speed, gone when it ends.
static func burst(at: Vector2, tint: Color, texture: String, amount: int, k := 1.0, life := 0.6) -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.position = at
	p.texture = load(art_dir() + "/particles/%s.png" % texture)
	p.one_shot = true
	p.emitting = false
	p.amount = amount
	p.lifetime = life
	p.explosiveness = 1.0
	p.spread = 180.0
	p.direction = Vector2.UP
	p.initial_velocity_min = 80.0 * k
	p.initial_velocity_max = 220.0 * k
	p.gravity = Vector2(0, 520.0 * k)
	p.angular_velocity_min = -360.0
	p.angular_velocity_max = 360.0
	p.scale_amount_min = 0.14 * k
	p.scale_amount_max = 0.32 * k
	p.color = tint
	var fade := Gradient.new()
	fade.set_color(0, Color.WHITE)
	fade.set_color(1, Color(1, 1, 1, 0))
	p.color_ramp = fade
	if texture != "shard":
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		p.material = m
	p.finished.connect(p.queue_free)
	return p


## A glow along each cleared row and column, and over each box.
func _flash_lines(ev: Dictionary) -> void:
	var b := board_size()
	var tint: Color = TINTS[ev.colour].lightened(0.45)
	var bars := []
	for r: int in ev.rows:
		bars.append(Rect2(0, r * cell_size, b.x, cell_size))
	for c: int in ev.cols:
		bars.append(Rect2(c * cell_size, 0, cell_size, b.y))
	for box: int in ev.boxes:
		var o := Vector2(box % (grid.size / 3), box / (grid.size / 3)) * 3.0 * cell_size
		bars.append(Rect2(o, Vector2.ONE * 3.0 * cell_size))
	for r: Rect2 in bars:
		var g := Sprite2D.new()
		g.texture = _particle("glow")
		g.material = _additive()
		g.modulate = tint
		g.position = r.get_center()
		g.scale = r.size * 1.25 / 64.0
		_fx.add_child(g)
		var t := g.create_tween()
		t.tween_property(g, "modulate:a", 0.0, _t(0.45)).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		t.parallel().tween_property(g, "scale", g.scale * Vector2(1.06, 0.4) if r.size.x > r.size.y else g.scale * Vector2(0.4, 1.06), _t(0.45))
		t.tween_callback(g.queue_free)


const PRAISE := ["", "", "Good!", "Great!", "Excellent!", "Amazing!", "Unbelievable!"]


func _popup(at: Vector2, points: int, lines: int, streak: int) -> void:
	var words: String = PRAISE[mini(lines, PRAISE.size() - 1)]
	var text := "+%d" % points
	if streak > 1:
		text += "\nCombo x%d" % streak
	if words != "":
		text = words + "\n" + text
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", roundi(cell_size * (0.42 + 0.05 * mini(lines, 4))))
	l.add_theme_color_override("font_color", Color(1, 0.97, 0.85))
	l.add_theme_color_override("font_outline_color", Color(0.1, 0.08, 0.22))
	l.add_theme_constant_override("outline_size", roundi(cell_size * 0.12))
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.size = Vector2(cell_size * 5.0, cell_size * 2.4)
	l.pivot_offset = l.size / 2.0
	l.position = (at - l.size / 2.0).clamp(Vector2.ZERO, board_size() - l.size)
	l.z_index = 10
	_fx.add_child(l)
	l.scale = Vector2.ONE * 0.4
	var t := l.create_tween()
	t.tween_property(l, "scale", Vector2.ONE, _t(0.18)).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	t.tween_property(l, "position:y", l.position.y - cell_size * 0.6, _t(0.6)).set_trans(Tween.TRANS_QUAD)
	t.parallel().tween_property(l, "modulate:a", 0.0, _t(0.3)).set_delay(_t(0.35))
	t.tween_callback(l.queue_free)

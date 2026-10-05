extends Node2D
## Block Puzzle Kit's demo: each mode on its board, the score and best beside it, and the block set,
## pixel art and mode picked from the panel. Modes whose scripts aren't in the project don't show.

const FALLING := "res://addons/block_puzzle_kit/falling_board.gd"
const MODES := {"blast": "Blast", "sudoku": "Sudoku", "falling": "Falling"}
const SET_NAMES := {"glossy": "Glossy", "jelly": "Jelly", "wood": "Wood", "neon": "Neon"}
const HELP := {"blast": "Drag a piece onto the board. Fill a row or a column to clear it.",
	"sudoku": "Fill a row, a column or a 3 x 3 box to clear it.",
	"falling": "Left, right: move   Up: turn   Z: turn back\nDown: drop a row   Space: drop   C: hold"}
const TEXT := Color(0.96, 0.96, 1.0)
const DIM := Color(0.68, 0.72, 0.92)
const AREA := Rect2(470, 0, 810, 720)  # where the boards go

var mode := "blast"
var block_set := "glossy"
var pixel := false
var board: Node2D
var best := {}
var score_label: Label
var best_label: Label
var lines_label: Label
var help_label: Label
var mode_buttons := {}
var set_buttons := {}
var pixel_check: CheckButton
var banner: PanelContainer
var banner_label: Label


func _ready() -> void:
	var back := TextureRect.new()
	var g := GradientTexture2D.new()
	g.gradient = Gradient.new()
	g.gradient.set_color(0, Color(0.16, 0.14, 0.36))
	g.gradient.set_color(1, Color(0.04, 0.05, 0.14))
	g.fill_from = Vector2(0.3, 0)
	g.fill_to = Vector2(0.6, 1)
	back.texture = g
	back.size = get_viewport_rect().size
	var under := CanvasLayer.new()
	under.layer = -1
	under.add_child(back)
	add_child(under)
	_build_ui()
	start(mode)


## Starts a new game of `m`: "blast", "sudoku" or "falling".
func start(m: String) -> void:
	mode = m
	banner.hide()
	if board:
		board.queue_free()
	if m == "falling":
		board = load(FALLING).new()
		board.cell_size = 32.0
		board.lines_cleared.connect(func(_l: int, _c: int) -> void: _show_lines())
		board.level_changed.connect(func(_l: int) -> void: _show_lines())
		var w: float = 10 * 32.0 + 2 * (32.0 * 5.7)
		board.position = Vector2(AREA.position.x + (AREA.size.x - w) / 2.0 + 32.0 * 5.7, (720 - 640) / 2.0)
	else:
		board = BlockBoard.new()
		board.mode = m
		board.cell_size = 64.0 if m == "blast" else 58.0
		board.tray_scale = 0.5
		var n := 8 if m == "blast" else 9
		var w: float = n * board.cell_size + board.cell_size * (0.6 + 5.2 * board.tray_scale)
		board.position = Vector2(AREA.position.x + (AREA.size.x - w) / 2.0, (720 - n * board.cell_size) / 2.0)
	board.block_set = block_set
	board.pixel = pixel
	board.score_changed.connect(_on_score)
	board.game_over.connect(_end)
	add_child(board)
	for k: String in mode_buttons:
		mode_buttons[k].set_pressed_no_signal(k == m)
	help_label.text = HELP[m]
	lines_label.visible = m == "falling"
	_on_score(0)
	_show_lines.call_deferred()


func _theme() -> Theme:
	var t := Theme.new()
	t.default_font_size = 18
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		var sb := StyleBoxFlat.new()
		sb.bg_color = {"normal": Color(0.24, 0.26, 0.56), "hover": Color(0.32, 0.36, 0.7), "pressed": Color(0.42, 0.5, 0.92),
			"focus": Color(0, 0, 0, 0), "disabled": Color(0.2, 0.2, 0.3)}[state]
		sb.set_corner_radius_all(10)
		sb.content_margin_left = 14
		sb.content_margin_right = 14
		sb.content_margin_top = 7
		sb.content_margin_bottom = 7
		if state == "focus":
			sb.draw_center = false
		t.set_stylebox(state, "Button", sb)
	t.set_color("font_color", "Label", TEXT)
	t.set_color("font_color", "Button", TEXT)
	t.set_color("font_color", "CheckButton", TEXT)
	return t


func _label(text: String, size: int, colour := TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", colour)
	return l


func _build_ui() -> void:
	var ui := CanvasLayer.new()
	add_child(ui)
	var root := Control.new()
	root.theme = _theme()
	root.size = get_viewport_rect().size
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(root)
	var col := VBoxContainer.new()
	col.position = Vector2(48, 48)
	col.custom_minimum_size.x = 380
	col.add_theme_constant_override("separation", 14)
	root.add_child(col)
	col.add_child(_label("Block Puzzle Kit", 40))

	var modes := HBoxContainer.new()
	modes.add_theme_constant_override("separation", 10)
	col.add_child(modes)
	for m: String in MODES:
		if m == "falling" and not ResourceLoader.exists(FALLING):
			continue
		var b := Button.new()
		b.text = MODES[m]
		b.toggle_mode = true
		b.focus_mode = Control.FOCUS_NONE
		b.pressed.connect(start.bind(m))
		modes.add_child(b)
		mode_buttons[m] = b

	var stats := HBoxContainer.new()
	stats.add_theme_constant_override("separation", 40)
	col.add_child(stats)
	for item: Array in [["SCORE", "score_label"], ["BEST", "best_label"]]:
		var v := VBoxContainer.new()
		v.add_child(_label(item[0], 16, DIM))
		var l := _label("0", 52)
		v.add_child(l)
		set(item[1], l)
		stats.add_child(v)
	lines_label = _label("", 20, DIM)
	col.add_child(lines_label)

	col.add_child(_label("BLOCKS", 16, DIM))
	var sets := HBoxContainer.new()
	sets.add_theme_constant_override("separation", 10)
	col.add_child(sets)
	for s: String in SET_NAMES:
		if not BlockBoard.has_set(s):
			continue
		var b := Button.new()
		b.icon = load(BlockBoard.block_path(s, 5))
		b.expand_icon = true
		b.custom_minimum_size = Vector2(60, 60)
		b.tooltip_text = SET_NAMES[s]
		b.toggle_mode = true
		b.focus_mode = Control.FOCUS_NONE
		b.button_pressed = s == block_set
		b.pressed.connect(_pick_set.bind(s))
		sets.add_child(b)
		set_buttons[s] = b
	pixel_check = CheckButton.new()
	pixel_check.text = "Pixel art"
	pixel_check.focus_mode = Control.FOCUS_NONE
	pixel_check.visible = BlockBoard.has_set("glossy", true)
	pixel_check.toggled.connect(func(on: bool) -> void:
		pixel = on
		board.pixel = on)
	col.add_child(pixel_check)

	var restart := Button.new()
	restart.text = "New game"
	restart.focus_mode = Control.FOCUS_NONE
	restart.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	restart.pressed.connect(func() -> void: start(mode))
	col.add_child(restart)
	help_label = _label("", 17, DIM)
	help_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	help_label.custom_minimum_size.x = 380
	col.add_child(help_label)

	banner = PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.05, 0.06, 0.16, 0.92)
	sb.set_corner_radius_all(18)
	sb.set_content_margin_all(28)
	banner.add_theme_stylebox_override("panel", sb)
	var bv := VBoxContainer.new()
	bv.add_theme_constant_override("separation", 16)
	banner_label = _label("", 34)
	banner_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bv.add_child(banner_label)
	var again := Button.new()
	again.text = "Play again"
	again.pressed.connect(func() -> void: start(mode))
	bv.add_child(again)
	banner.add_child(bv)
	root.add_child(banner)
	banner.hide()


func _pick_set(s: String) -> void:
	block_set = s
	board.block_set = s
	for k: String in set_buttons:
		set_buttons[k].set_pressed_no_signal(k == s)


func _on_score(score: int) -> void:
	score_label.text = str(score)
	best[mode] = maxi(best.get(mode, 0), score)
	best_label.text = str(best[mode])


func _show_lines() -> void:
	if mode == "falling" and board:
		lines_label.text = "LINES %d    LEVEL %d" % [board.grid.lines, board.grid.level]


func _end() -> void:
	await get_tree().create_timer(0.5).timeout
	banner_label.text = "No room left\n%s points" % score_label.text if mode != "falling" else "Game over\n%s points" % score_label.text
	banner.reset_size()
	banner.position = Vector2(AREA.get_center().x, 360) - banner.size / 2.0
	banner.show()

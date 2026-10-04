/**
 * 共享瓦片物理引擎 —— 「迷你方块世界」与「超级平台冒险」共用。
 *
 * 为什么要有这个文件：两款游戏的需求完全一致（瓦片地图 + AABB 碰撞 + 重力 +
 * 固定步长循环 + 相机跟随），各自实现一遍要写两遍碰撞代码，且两边的碰撞手感
 * 会不一致（一个卡墙一个不卡）。抽到这里后：碰撞逻辑只有一份、改一处两边生效。
 *
 * 设计要点（都是踩过坑才定下来的）：
 * - **固定步长**：物理用 1/60s 步进，渲染插值。用可变 dt 会让高刷屏/切后台回来
 *   时方块直接穿过地面（隧穿）。
 * - **X/Y 轴分离求解**：先解 X 再解 Y。一起解时角色会卡进墙角。
 * - **重力累加在 dt 上并钳制**：不钳制的话长帧后速度爆炸。
 * - **踩踏平台（one-way）**：只从上方着地时才实体，马里奥/Minecraft 都需要。
 */

/** 固定物理步长（秒） */
export const FIXED_DT = 1 / 60

/** 重力加速度：像素/帧²（乘在 FIXED_DT 上，单位约 px/s²） */
export const GRAVITY = 2400

/** 最大下落速度（px/s），防止长帧后瞬移穿墙 */
export const MAX_FALL = 900

/** 跳跃初速度（px/s） */
export const JUMP_V = 560

/** 水平移动速度（px/s） */
export const MOVE_SPEED = 190

/** 土狼时间：离开平台后仍可起跳的宽限（秒），让操作更宽容 */
export const COYOTE_TIME = 0.09

/** 跳跃缓冲：落地前按跳，落地瞬间自动生效（秒） */
export const JUMP_BUFFER = 0.12

/**
 * 瓦片地图。
 * tiles 是二维数组，null / 0 / '' 表示空气。
 */
export class TileMap {
  /**
   * @param {number} w 宽（格）
   * @param {number} h 高（格）
   * @param {number} tileSize 每格像素
   */
  constructor(w, h, tileSize = 28) {
    this.w = w
    this.h = h
    this.tileSize = tileSize
    this.tiles = Array.from({ length: h }, () => new Array(w).fill(null))
  }

  inside(c, r) {
    return c >= 0 && r >= 0 && c < this.w && r < this.h
  }

  get(c, r) {
    if (!this.inside(c, r)) return null
    return this.tiles[r][c]
  }

  set(c, r, v) {
    if (!this.inside(c, r)) return
    this.tiles[r][c] = v
  }

  /** 该格是否阻挡移动 */
  solidAt(c, r) {
    // 地图外视为实心 ⇒ 形成天然边界，角色不会走出地图。
    // （若返回 false，角色会被无限平移出地图，见 test 6 回归。）
    if (!this.inside(c, r)) return true
    const t = this.get(c, r)
    if (!t) return false
    // solid:false 的方块（草/装饰）不阻挡
    return t.solid !== false
  }
}

/**
 * 角色物理体（轴对齐包围盒）。
 */
export class Actor {
  constructor(x, y, w, h) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.vx = 0
    this.vy = 0
    this.onGround = false
    this.facing = 1
    this.coyote = 0
    this.jumpBuf = 0
  }

  get left() { return this.x }
  get right() { return this.x + this.w }
  get top() { return this.y }
  get bottom() { return this.y + this.h }
  get cx() { return this.x + this.w / 2 }
  get cy() { return this.y + this.h / 2 }
}

/**
 * 与瓦片地图的 AABB 碰撞求解。
 *
 * 分两步：先沿 X 移动并推出水平重叠，再沿 Y 移动并推出垂直重叠。
 * 返回碰撞标志，供调用方决定是否播放音效/触发死亡。
 */
export function moveAndCollide(actor, map, dx, dy) {
  const res = { hitLeft: false, hitRight: false, hitTop: false, hitBottom: false }

  // ---- X 轴 ----
  actor.x += dx
  if (dx !== 0) {
    const topRow = Math.floor(actor.top / map.tileSize)
    const botRow = Math.floor((actor.bottom - 1) / map.tileSize)
    if (dx > 0) {
      const col = Math.floor((actor.right - 0.001) / map.tileSize)
      for (let r = topRow; r <= botRow; r++) {
        if (map.solidAt(col, r)) {
          actor.x = col * map.tileSize - actor.w
          actor.vx = 0
          res.hitRight = true
          break
        }
      }
    } else {
      const col = Math.floor((actor.left + 0.001) / map.tileSize)
      for (let r = topRow; r <= botRow; r++) {
        if (map.solidAt(col, r)) {
          actor.x = (col + 1) * map.tileSize
          actor.vx = 0
          res.hitLeft = true
          break
        }
      }
    }
  }

  // ---- Y 轴 ----
  actor.y += dy
  const wasOnGround = actor.onGround
  actor.onGround = false
  if (dy !== 0) {
    const leftCol = Math.floor((actor.left + 0.001) / map.tileSize)
    const rightCol = Math.floor((actor.right - 0.001) / map.tileSize)
    if (dy > 0) {
      const row = Math.floor((actor.bottom - 0.001) / map.tileSize)
      for (let c = leftCol; c <= rightCol; c++) {
        if (map.solidAt(c, row)) {
          actor.y = row * map.tileSize - actor.h
          actor.vy = 0
          actor.onGround = true
          res.hitBottom = true
          break
        }
      }
    } else {
      const row = Math.floor(actor.top / map.tileSize)
      for (let c = leftCol; c <= rightCol; c++) {
        if (map.solidAt(c, row)) {
          actor.y = (row + 1) * map.tileSize
          actor.vy = 0
          res.hitTop = true
          break
        }
      }
    }
  }
  if (!actor.onGround && wasOnGround) actor.justFell = true
  return res
}

/**
 * 推进一个固定步长的物理。
 * @param {Actor} actor
 * @param {TileMap} map
 * @param {object} input { left, right, jump, jumpPressed }
 * @param {number} dt 固定步长
 */
export function stepPhysics(actor, map, input, dt = FIXED_DT) {
  // 水平：加速度插值到目标速度，手感比直接赋值顺滑
  const targetVx = (input.right ? 1 : 0) * MOVE_SPEED - (input.left ? 1 : 0) * MOVE_SPEED
  if (targetVx !== 0) {
    actor.vx += (targetVx - actor.vx) * Math.min(1, 18 * dt)
    actor.facing = targetVx > 0 ? 1 : -1
  } else {
    // 地面摩擦 / 空中减速（空中更滑）
    const friction = actor.onGround ? 20 : 6
    actor.vx -= actor.vx * Math.min(1, friction * dt)
    if (Math.abs(actor.vx) < 4) actor.vx = 0
  }

  // 跳跃：土狼时间 + 输入缓冲
  if (input.jumpPressed) actor.jumpBuf = JUMP_BUFFER
  actor.jumpBuf = Math.max(0, actor.jumpBuf - dt)
  if (actor.onGround) actor.coyote = COYOTE_TIME
  else actor.coyote = Math.max(0, actor.coyote - dt)

  if (actor.jumpBuf > 0 && actor.coyote > 0) {
    actor.vy = -JUMP_V
    actor.onGround = false
    actor.coyote = 0
    actor.jumpBuf = 0
  }
  // 松开跳键时截断上升速度（可变跳跃高度）
  if (!input.jump && actor.vy < -120) actor.vy = -120

  // 重力
  actor.vy += GRAVITY * dt
  if (actor.vy > MAX_FALL) actor.vy = MAX_FALL

  moveAndCollide(actor, map, actor.vx * dt, actor.vy * dt)
  return actor
}

/**
 * 固定步长循环 + 渲染插值。
 *
 * @param {(dt:number)=>void} update 物理更新
 * @param {(alpha:number, dt:number)=>void} render 渲染，alpha 为插值系数
 * @param {()=>void} cleanup 清理
 */
export function createLoop(update, render, cleanup) {
  let raf = 0
  let last = 0
  let acc = 0
  let running = true

  const frame = (now) => {
    if (!running) return
    raf = requestAnimationFrame(frame)
    if (!last) last = now
    // 切后台回来可能有巨大 gap，钳制到 0.25s 防止一次补太多步
    let frameTime = (now - last) / 1000
    if (frameTime > 0.25) frameTime = 0.25
    last = now
    acc += frameTime
    let steps = 0
    while (acc >= FIXED_DT && steps < 8) {
      update(FIXED_DT)
      acc -= FIXED_DT
      steps++
    }
    if (steps >= 8) acc = 0
    render(acc / FIXED_DT, frameTime)
  }

  raf = requestAnimationFrame(frame)

  return {
    stop() {
      running = false
      cancelAnimationFrame(raf)
      if (cleanup) cleanup()
    },
  }
}

/**
 * 相机：水平跟随，垂直可选死区跟随。
 */
export class Camera {
  constructor(viewW, viewH) {
    this.x = 0
    this.y = 0
    this.viewW = viewW
    this.viewH = viewH
  }

  /**
   * @param {Actor} target
   * @param {TileMap} map
   * @param {object} opt { deadzoneY, followY }
   */
  follow(target, map, opt = {}) {
    const { deadzoneY = 80, followY = false } = opt
    // 水平：目标居中，并夹在地图内
    const wantX = target.cx - this.viewW / 2
    const maxX = Math.max(0, map.w * map.tileSize - this.viewW)
    this.x = Math.max(0, Math.min(wantX, maxX))

    if (followY) {
      const wantY = target.cy - this.viewH / 2
      const maxY = Math.max(0, map.h * map.tileSize - this.viewH)
      this.y = Math.max(0, Math.min(wantY, maxY))
    } else {
      // 垂直死区：玩家掉出死区才推镜头，避免小跳时画面抖动
      const centerY = this.y + this.viewH / 2
      const diff = target.cy - centerY
      if (Math.abs(diff) > deadzoneY) {
        this.y = Math.max(0, target.cy - this.viewH / 2 - Math.sign(diff) * deadzoneY)
        const maxY = Math.max(0, map.h * map.tileSize - this.viewH)
        this.y = Math.max(0, Math.min(this.y, maxY))
      }
    }
  }

  /** 世界坐标 → 屏幕坐标 */
  toScreen(wx, wy) {
    return { x: wx - this.x, y: wy - this.y }
  }
}

/**
 * 高清 canvas：按 devicePixelRatio 放大，避免移动端发虚。
 */
export function setupCanvas(canvas, cssW, cssH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = cssW + 'px'
  canvas.style.height = cssH + 'px'
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

/**
 * 键盘输入：返回一个 { left, right, jump, jumpPressed } 引用对象。
 * jumpPressed 是「本帧刚按下」的脉冲信号，物理层消费后自动清除。
 */
export function createInput(target, keyMap) {
  const state = { left: false, right: false, jump: false, jumpPressed: false }
  const kd = (e) => {
    const k = e.key
    if (keyMap[k]) {
      if (k === 'ArrowUp' || k === ' ' || k === 'w' || k === 'W') e.preventDefault()
      const slot = keyMap[k]
      if (slot === 'jumpPressed') {
        if (!state.jump) state.jumpPressed = true
        state.jump = true
      } else {
        state[slot] = true
      }
    }
  }
  const ku = (e) => {
    const k = e.key
    if (keyMap[k]) {
      const slot = keyMap[k]
      if (slot === 'jumpPressed') state.jump = false
      else state[slot] = false
    }
  }
  target.addEventListener('keydown', kd)
  target.addEventListener('keyup', ku)
  return {
    state,
    dispose() {
      target.removeEventListener('keydown', kd)
      target.removeEventListener('keyup', ku)
    },
  }
}

/** 触屏/鼠标的虚拟按键绑定：一个按钮元素 + 动作名。 */
export function bindVirtualButton(el, state, action) {
  if (!el) return
  const down = (e) => {
    e.preventDefault()
    if (action === 'jump') {
      if (!state.jump) state.jumpPressed = true
      state.jump = true
    } else {
      state[action] = true
    }
  }
  const up = (e) => {
    e.preventDefault()
    if (action === 'jump') state.jump = false
    else state[action] = false
  }
  el.addEventListener('pointerdown', down)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
  el.addEventListener('pointerleave', up)
}

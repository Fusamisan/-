// 書き取りパッド: Apple Pencil / 指でなぞり、お手本との重なりで採点する
export const GLYPH_FONT = '"Arial Hebrew", "Noto Sans Hebrew", "DejaVu Sans", "Times New Roman", sans-serif';

export class WritingPad {
  constructor(host, opts = {}) {
    this.host = host;
    this.opts = { pencilOnly: false, showGuide: true, ...opts };
    this.strokes = [];
    this.current = null;
    this.char = 'א';

    this.guide = document.createElement('canvas');
    this.ink = document.createElement('canvas');
    this.guide.className = 'pad-layer';
    this.ink.className = 'pad-layer pad-ink';
    host.append(this.guide, this.ink);

    this.ink.addEventListener('pointerdown', e => this.down(e));
    this.ink.addEventListener('pointermove', e => this.move(e));
    this.ink.addEventListener('pointerup', e => this.up(e));
    this.ink.addEventListener('pointercancel', e => this.up(e));
    // iPadでスクロールや拡大が起きないようにする
    this.ink.addEventListener('touchstart', e => e.preventDefault(), { passive: false });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
  }

  destroy() { this.ro.disconnect(); }

  set(opts) { Object.assign(this.opts, opts); this.drawGuide(); }

  setLetter(char) { this.char = char; this.clear(); }

  clear() { this.strokes = []; this.current = null; this.drawGuide(); this.redrawInk(); }

  undo() { this.strokes.pop(); this.redrawInk(); }

  get isEmpty() { return this.strokes.length === 0; }

  resize() {
    const r = this.host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width; this.h = r.height;
    const dpr = window.devicePixelRatio || 1;
    for (const c of [this.guide, this.ink]) {
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      c.style.width = r.width + 'px';
      c.style.height = r.height + 'px';
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.drawGuide();
    this.redrawInk();
  }

  // お手本文字の位置とサイズ（キャンバスのCSSピクセル基準）
  glyphLayout(ctx, w, h) {
    const size = Math.min(w, h) * 0.72;
    ctx.font = `${size}px ${GLYPH_FONT}`;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(this.char);
    const gw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const gh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const x = w / 2 - gw / 2 + m.actualBoundingBoxLeft;
    const y = h / 2 - gh / 2 + m.actualBoundingBoxAscent;
    return { size, x, y };
  }

  inkWidth() { return Math.min(this.w, this.h) * 0.045; }

  drawGuide() {
    if (!this.w) return;
    const ctx = this.guide.getContext('2d');
    const { w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const css = getComputedStyle(document.documentElement);
    // 補助線
    ctx.strokeStyle = css.getPropertyValue('--pad-line').trim() || '#ddd';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!this.opts.showGuide) return;
    const { x, y } = this.glyphLayout(ctx, w, h);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = css.getPropertyValue('--pad-guide').trim() || 'rgba(0,0,0,.12)';
    ctx.fillText(this.char, x, y);
  }

  redrawInk() {
    if (!this.w) return;
    const ctx = this.ink.getContext('2d');
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#123';
    for (const s of this.strokes) this.paintStroke(ctx, s, 0);
  }

  paintStroke(ctx, s, extra = 0, from = 1) {
    const base = this.inkWidth();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(s[0].x, s[0].y, (base * s[0].p + extra) / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      return;
    }
    for (let i = Math.max(1, from); i < s.length; i++) {
      const a = s[i - 1], b = s[i];
      ctx.lineWidth = base * (a.p + b.p) / 2 + extra;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  point(e) {
    const r = this.ink.getBoundingClientRect();
    // ペンは筆圧で太さを変える（0.6〜1.3倍）。指は一定。
    const p = e.pointerType === 'pen' && e.pressure > 0 ? 0.6 + e.pressure * 0.7 : 1;
    return { x: e.clientX - r.left, y: e.clientY - r.top, p };
  }

  down(e) {
    if (this.opts.pencilOnly && e.pointerType !== 'pen') return;
    e.preventDefault();
    this.ink.setPointerCapture(e.pointerId);
    this.pointerId = e.pointerId;
    this.current = [this.point(e)];
    this.strokes.push(this.current);
    const ctx = this.ink.getContext('2d');
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#123';
    this.paintStroke(ctx, this.current);
  }

  move(e) {
    if (!this.current || e.pointerId !== this.pointerId) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const start = this.current.length;
    for (const ev of (evs.length ? evs : [e])) this.current.push(this.point(ev));
    this.paintStroke(this.ink.getContext('2d'), this.current, 0, start);
  }

  up(e) {
    if (e.pointerId !== this.pointerId) return;
    this.current = null;
    this.pointerId = null;
    this.opts.onStroke?.();
  }

  // 採点: お手本の面積をどれだけ覆えたか（網羅率）と、はみ出しの少なさ（精度）のF値
  score() {
    if (this.isEmpty || !this.w) return 0;
    const N = 160;
    const k = N / Math.max(this.w, this.h);
    const W = Math.round(this.w * k), H = Math.round(this.h * k);
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d'); };

    const glyph = mk(), glyphWide = mk(), ink = mk(), inkWide = mk();
    for (const g of [glyph, glyphWide]) {
      g.scale(k, k);
      const { x, y } = this.glyphLayout(g, this.w, this.h);
      g.fillStyle = '#000';
      g.fillText(this.char, x, y);
    }
    const tol = this.inkWidth() * 1.6;
    glyphWide.strokeStyle = '#000';
    glyphWide.lineWidth = tol;
    glyphWide.lineJoin = 'round';
    {
      const { x, y } = this.glyphLayout(glyphWide, this.w, this.h);
      glyphWide.strokeText(this.char, x, y);
    }
    for (const [g, extra] of [[ink, 0], [inkWide, tol]]) {
      g.scale(k, k);
      g.strokeStyle = '#000';
      for (const s of this.strokes) this.paintStroke(g, s, extra);
    }

    const A = d => d.getImageData(0, 0, W, H).data;
    const gA = A(glyph), gwA = A(glyphWide), iA = A(ink), iwA = A(inkWide);
    let gTot = 0, gHit = 0, iTot = 0, iHit = 0;
    for (let i = 3; i < gA.length; i += 4) {
      if (gA[i] > 100) { gTot++; if (iwA[i] > 100) gHit++; }
      if (iA[i] > 100) { iTot++; if (gwA[i] > 100) iHit++; }
    }
    if (!gTot || !iTot) return 0;
    const recall = gHit / gTot, precision = iHit / iTot;
    const f = (2 * recall * precision) / (recall + precision || 1);
    return Math.round(Math.min(1, Math.pow(f, 0.8) * 1.05) * 100);
  }
}

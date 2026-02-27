
interface Page {
  emoji: string
  title: string
  text: string
}

const PAGES: Page[] = [
  {
    emoji: '🐀',
    title: 'Il était une fois...',
    text: 'Dans les égouts de Paris vivait Rémi, un rat pas comme les autres. Pendant que ses frères fouillaient les poubelles, lui rêvait de haute cuisine...'
  },
  {
    emoji: '👨‍🍳',
    title: 'Le Grand Rêve',
    text: 'Rémi adorait le grand chef Gusteau et sa devise : "Tout le monde peut cuisiner !". Chaque nuit, il s\'entraînait en secret sur des restes trouvés dans la ville lumière...'
  },
  {
    emoji: '🏙️',
    title: 'Paris by Night',
    text: 'Un soir, une tempête sépara Rémi de sa famille. Il se retrouva seul sous les toits du célèbre restaurant "Chez Gusteau", au cœur de Paris...'
  },
  {
    emoji: '🍽️',
    title: 'La Mission',
    text: 'Pour prouver son talent, Rémi doit préparer la recette légendaire de Gusteau. Mais les 5 ingrédients sont éparpillés aux quatre coins de Paris !'
  },
  {
    emoji: '😾',
    title: 'Le Danger',
    text: 'Les chats du quartier et les inspecteurs sanitaires font leur ronde. Un seul faux pas et c\'en est fini du rêve de Rémi ! Sauras-tu l\'aider ?'
  },
  {
    emoji: '🎮',
    title: 'À Toi de Jouer !',
    text: 'Collecte les 5 ingrédients légendaires cachés dans les rues de Paris. Évite les chats. Tu as 3 minutes. Bonne chance, Chef !'
  }
]

const RIGHT_PANELS = [
  { art: '🗼\n🏛️🏠🏰\n🌉🌙⭐', caption: 'Paris, la Ville Lumière' },
  { art: '🍲\n🔥🧑‍🍳✨\n📖⭐🌟', caption: '"Tout le monde peut cuisiner"' },
  { art: '🌧️\n🏠🐀🏠\n💨🌃🌙', caption: 'Perdu dans la nuit parisienne' },
  { art: '🧀 🍅\n🧈 🌿\n    🍄', caption: 'Les 5 ingrédients légendaires' },
  { art: '😾🚨\n🐀💨\n🏃‍♂️⚡', caption: 'Attention aux gardes !' },
  { art: '🎮\n⌨️🖱️\n🏆✨', caption: 'WASD · ESPACE pour sauter' }
]

export class StoryBook {
  private container: HTMLElement
  private currentPage = 0
  private isFlipping = false
  private onComplete: () => void

  constructor(onComplete: () => void) {
    this.onComplete = onComplete
    this.container = document.createElement('div')
    this.container.id = 'storybook'
    this.injectStyles()
    document.body.appendChild(this.container)
    this.render()
  }

  private injectStyles(): void {
    if (document.getElementById('storybook-styles')) return
    const style = document.createElement('style')
    style.id = 'storybook-styles'
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Crimson+Text:ital@0;1&display=swap');

      #storybook {
        position: fixed; inset: 0; z-index: 500;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(ellipse at center, #1a0800 0%, #050200 100%);
        font-family: 'Crimson Text', Georgia, serif;
        transition: opacity 0.8s;
      }

      .sb-wrapper {
        position: relative;
        width: min(740px, 92vw);
      }

      .sb-skip {
        position: absolute; top: -44px; right: 0;
        background: none; border: none;
        color: rgba(255,215,0,0.35); font-size: 0.8rem;
        cursor: pointer; letter-spacing: 2px;
        font-family: 'Crimson Text', serif;
        transition: color 0.3s;
      }
      .sb-skip:hover { color: rgba(255,215,0,0.8); }

      .sb-book {
        display: flex;
        height: min(440px, 72vh);
        border-radius: 4px;
        overflow: hidden;
        box-shadow:
          0 30px 60px rgba(0,0,0,0.8),
          0 0 0 1px rgba(255,215,0,0.1),
          inset 0 0 60px rgba(0,0,0,0.3);
        position: relative;
      }

      /* Spine */
      .sb-spine {
        width: 24px; flex-shrink: 0;
        background: linear-gradient(to right, #2a1508, #5a3018, #2a1508);
        border-left: 1px solid rgba(255,215,0,0.2);
        border-right: 1px solid rgba(255,215,0,0.2);
        z-index: 2;
        box-shadow: 2px 0 10px rgba(0,0,0,0.4), -2px 0 10px rgba(0,0,0,0.4);
      }

      /* Pages */
      .sb-page {
        flex: 1;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 28px 22px;
        box-sizing: border-box;
        position: relative;
        cursor: pointer;
        background: linear-gradient(160deg, #1a0d02 0%, #0d0700 100%);
        overflow: hidden;
        transition: background 0.5s;
      }

      /* Paper lines texture */
      .sb-page::before {
        content: '';
        position: absolute; inset: 0;
        background: repeating-linear-gradient(
          transparent, transparent 30px,
          rgba(255,215,0,0.03) 30px, rgba(255,215,0,0.03) 31px
        );
        pointer-events: none;
      }

      /* Corner decoration */
      .sb-page::after {
        content: '❧';
        position: absolute; bottom: 14px; right: 18px;
        color: rgba(255,215,0,0.15); font-size: 1.4rem;
        pointer-events: none;
      }

      .sb-page-left { border-right: 1px solid rgba(255,215,0,0.08); }
      .sb-page-right { border-left: 1px solid rgba(255,215,0,0.08); }
      .sb-page-right::after { right: auto; left: 18px; content: '❦'; }

      .sb-page-num {
        position: absolute; top: 14px;
        font-size: 0.65rem; color: rgba(255,215,0,0.25);
        letter-spacing: 3px; text-transform: uppercase;
      }

      .sb-emoji {
        font-size: clamp(2.8rem, 7vw, 4.5rem);
        margin-bottom: 14px;
        animation: sbFloat 3s ease-in-out infinite;
        filter: drop-shadow(0 6px 12px rgba(0,0,0,0.6));
      }
      @keyframes sbFloat {
        0%,100% { transform: translateY(0) rotate(-1deg); }
        50%      { transform: translateY(-10px) rotate(1deg); }
      }

      .sb-title {
        font-family: 'Playfair Display', serif;
        font-size: clamp(1rem, 2.8vw, 1.4rem);
        font-weight: 700;
        color: #FFD700;
        text-align: center;
        margin-bottom: 12px;
        text-shadow: 0 0 20px rgba(255,215,0,0.3);
        line-height: 1.2;
      }

      .sb-divider {
        width: 50px; height: 1px;
        background: linear-gradient(to right, transparent, rgba(255,215,0,0.4), transparent);
        margin: 0 auto 12px;
      }

      .sb-text {
        font-size: clamp(0.82rem, 1.8vw, 0.97rem);
        color: rgba(255,220,160,0.82);
        text-align: center; line-height: 1.85;
        font-style: italic; max-width: 270px;
      }

      /* Right illustration panel */
      .sb-art {
        font-size: clamp(1.6rem, 4vw, 2.4rem);
        line-height: 2; text-align: center;
        margin-bottom: 14px;
        white-space: pre;
      }

      .sb-caption {
        color: rgba(255,215,0,0.35);
        font-size: 0.72rem; letter-spacing: 1.5px;
        text-align: center; font-style: italic;
      }

      /* Flip hint */
      .sb-hint {
        position: absolute; bottom: 18px; left: 50%;
        transform: translateX(-50%);
        color: rgba(255,215,0,0.22);
        font-size: 0.68rem; letter-spacing: 2px;
        animation: sbBlink 2s ease-in-out infinite;
        white-space: nowrap;
      }
      @keyframes sbBlink {
        0%,100% { opacity: 0.3; } 50% { opacity: 0.9; }
      }

      /* Page flip animation */
      @keyframes sbFlipOut {
        0%   { opacity: 1; transform: rotateY(0deg) scaleX(1); }
        50%  { opacity: 0.3; transform: rotateY(-20deg) scaleX(0.85); }
        100% { opacity: 0; transform: rotateY(-30deg) scaleX(0.7); }
      }
      @keyframes sbFlipIn {
        0%   { opacity: 0; transform: rotateY(30deg) scaleX(0.7); }
        50%  { opacity: 0.3; transform: rotateY(20deg) scaleX(0.85); }
        100% { opacity: 1; transform: rotateY(0deg) scaleX(1); }
      }
      .sb-page.flip-out { animation: sbFlipOut 0.35s ease-in forwards; }
      .sb-page.flip-in  { animation: sbFlipIn  0.35s ease-out forwards; }

      /* Navigation */
      .sb-nav {
        display: flex; align-items: center;
        justify-content: center; gap: 18px;
        margin-top: 28px;
      }

      .sb-btn {
        background: rgba(255,215,0,0.08);
        border: 1px solid rgba(255,215,0,0.25);
        color: #FFD700; padding: 10px 22px;
        border-radius: 30px;
        font-family: 'Playfair Display', serif;
        font-size: 0.88rem; cursor: pointer;
        transition: all 0.25s; letter-spacing: 1px;
      }
      .sb-btn:hover:not(:disabled) {
        background: rgba(255,215,0,0.18);
        border-color: rgba(255,215,0,0.5);
        transform: scale(1.04);
      }
      .sb-btn:disabled { opacity: 0.25; cursor: not-allowed; }

      .sb-btn.play {
        background: linear-gradient(135deg, #FFD700, #FF8C00);
        color: #1a0800; font-weight: bold; border: none;
        padding: 12px 32px; font-size: 0.95rem;
        box-shadow: 0 4px 20px rgba(255,165,0,0.45);
        animation: sbPulse 1.5s ease-in-out infinite;
      }
      @keyframes sbPulse {
        0%,100% { box-shadow: 0 4px 20px rgba(255,165,0,0.4); }
        50%      { box-shadow: 0 4px 35px rgba(255,165,0,0.8); }
      }

      .sb-dots {
        display: flex; gap: 7px; align-items: center;
      }
      .sb-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(255,215,0,0.18);
        transition: all 0.3s;
      }
      .sb-dot.on {
        background: #FFD700; transform: scale(1.5);
        box-shadow: 0 0 8px rgba(255,215,0,0.6);
      }
    `
    document.head.appendChild(style)
  }

  private render(): void {
    const p = PAGES[this.currentPage]
    const r = RIGHT_PANELS[this.currentPage]
    const isLast = this.currentPage === PAGES.length - 1

    this.container.innerHTML = `
      <div class="sb-wrapper">
        <button class="sb-skip" id="sb-skip">PASSER L'HISTOIRE ›</button>

        <div class="sb-book">
          <!-- Left: story -->
          <div class="sb-page sb-page-left" id="sb-left">
            <span class="sb-page-num">— ${this.currentPage + 1} / ${PAGES.length} —</span>
            <div class="sb-emoji">${p.emoji}</div>
            <div class="sb-title">${p.title}</div>
            <div class="sb-divider"></div>
            <div class="sb-text">${p.text}</div>
            ${!isLast ? '<div class="sb-hint">cliquer → page suivante</div>' : ''}
          </div>

          <!-- Spine -->
          <div class="sb-spine"></div>

          <!-- Right: illustration -->
          <div class="sb-page sb-page-right" id="sb-right">
            <span class="sb-page-num"></span>
            <div class="sb-art">${r.art}</div>
            <div class="sb-divider"></div>
            <div class="sb-caption">${r.caption}</div>
          </div>
        </div>

        <div class="sb-nav">
          <button class="sb-btn" id="sb-prev" ${this.currentPage === 0 ? 'disabled' : ''}>← Précédent</button>
          <div class="sb-dots">
            ${PAGES.map((_, i) => `<div class="sb-dot ${i === this.currentPage ? 'on' : ''}"></div>`).join('')}
          </div>
          <button class="sb-btn ${isLast ? 'play' : ''}" id="sb-next">
            ${isLast ? '🎮 JOUER !' : 'Suivant →'}
          </button>
        </div>
      </div>
    `

    document.getElementById('sb-next')?.addEventListener('click', () => {
      isLast ? this.close() : this.goTo(this.currentPage + 1)
    })
    document.getElementById('sb-prev')?.addEventListener('click', () => {
      if (this.currentPage > 0) this.goTo(this.currentPage - 1)
    })
    document.getElementById('sb-skip')?.addEventListener('click', () => this.close())

    // Click right page = next
    document.getElementById('sb-right')?.addEventListener('click', () => {
      if (!isLast) this.goTo(this.currentPage + 1)
    })
    // Click left page = prev
    document.getElementById('sb-left')?.addEventListener('click', () => {
      if (this.currentPage > 0) this.goTo(this.currentPage - 1)
    })
  }

  private goTo(index: number): void {
    if (this.isFlipping) return
    this.isFlipping = true
    const forward = index > this.currentPage

    const el = document.getElementById(forward ? 'sb-left' : 'sb-right')
    el?.classList.add('flip-out')

    setTimeout(() => {
      this.currentPage = index
      this.isFlipping = false
      this.render()
      // Animate in
      const newEl = document.getElementById(forward ? 'sb-left' : 'sb-right')
      newEl?.classList.add('flip-in')
      setTimeout(() => newEl?.classList.remove('flip-in'), 350)
    }, 350)
  }

  private close(): void {
    this.container.style.opacity = '0'
    setTimeout(() => {
      this.container.remove()
      this.onComplete()
    }, 800)
  }
}
/**
 * MobileJoystick.ts
 * Contrôles tactiles pour mobile — zéro dépendance externe
 *
 * Layout :
 *  ┌─────────────────────────────────┐
 *  │                    [⏸]  [🔊]   │
 *  │                                 │
 *  │                   ← swipe droit │
 *  │                     pour caméra │
 *  │  [joystick]                     │
 *  │  bas-gauche      [🦘 SAUT]      │
 *  └─────────────────────────────────┘
 *
 * Usage dans GameEngine.ts :
 *   this.joystick = new MobileJoystick(() => this.rat.jump())
 *   // dans la loop :
 *   const { dx, dz } = this.joystick.getMovement()
 *   const cam = this.joystick.consumeCameraInput()
 *   this.cameraYaw   -= cam.dyaw
 *   this.cameraPitch += cam.dpitch
 */

export interface JoystickMovement {
  dx: number   // -1 à 1 (gauche/droite)
  dz: number   // -1 à 1 (avant/arrière)
}

export class MobileJoystick {
  // ── État mouvement (joystick gauche) ──────────────────────────────────────
  private moveX = 0
  private moveZ = 0

  // ── État caméra (swipe zone droite) ───────────────────────────────────────
  private cameraDeltaYaw   = 0
  private cameraDeltaPitch = 0

  // ── Callback saut ─────────────────────────────────────────────────────────
  private onJump?: () => void

  // ── DOM ───────────────────────────────────────────────────────────────────
  private container!:    HTMLDivElement
  private joystickBase!: HTMLDivElement
  private joystickKnob!: HTMLDivElement
  private jumpBtn!:      HTMLDivElement
  private _cameraZone!:  HTMLDivElement

  // ── Touch tracking ────────────────────────────────────────────────────────
  private joystickTouchId: number | null = null
  private cameraTouchId:   number | null = null
  private joystickOriginX = 0
  private joystickOriginY = 0
  private cameraLastX     = 0
  private cameraLastY     = 0

  private readonly JOYSTICK_RADIUS = 55   // px — rayon max du knob
  private readonly BASE_SIZE       = 130  // px — diamètre de la base

  constructor(onJump?: () => void) {
    this.onJump = onJump

    // Afficher uniquement sur mobile/tactile
    if (!this.isTouchDevice()) return

    this.buildDOM()
    this.bindEvents()
  }

  // ── Détection mobile ──────────────────────────────────────────────────────
  private isTouchDevice(): boolean {
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  }

  // ── Construction du DOM ───────────────────────────────────────────────────
  private buildDOM(): void {
    // Conteneur global
    this.container = document.createElement('div')
    this.container.id = 'mobile-controls'
    Object.assign(this.container.style, {
      position:      'fixed',
      inset:         '0',
      zIndex:        '50',
      pointerEvents: 'none',
    })

    // ── Joystick base ──────────────────────────────────────────────────────
    this.joystickBase = document.createElement('div')
    Object.assign(this.joystickBase.style, {
      position:       'absolute',
      bottom:         '110px',
      left:           '30px',
      width:          `${this.BASE_SIZE}px`,
      height:         `${this.BASE_SIZE}px`,
      borderRadius:   '50%',
      background:     'rgba(255,255,255,0.08)',
      border:         '2px solid rgba(255,215,0,0.4)',
      backdropFilter: 'blur(4px)',
      pointerEvents:  'all',
      touchAction:    'none',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
    })

    // ── Joystick knob ──────────────────────────────────────────────────────
    this.joystickKnob = document.createElement('div')
    Object.assign(this.joystickKnob.style, {
      width:          '52px',
      height:         '52px',
      borderRadius:   '50%',
      background:     'radial-gradient(circle at 35% 35%, rgba(255,215,0,0.9), rgba(200,130,0,0.7))',
      boxShadow:      '0 0 18px rgba(255,165,0,0.6)',
      pointerEvents:  'none',
      fontSize:       '1.4rem',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      transition:     'box-shadow 0.1s',
    })
    this.joystickKnob.textContent = '🐀'
    this.joystickBase.appendChild(this.joystickKnob)

    // ── Zone caméra (moitié droite de l'écran) ─────────────────────────────
    this._cameraZone = document.createElement('div')
    Object.assign(this._cameraZone.style, {
      position:      'absolute',
      top:           '0',
      right:         '0',
      width:         '50%',
      height:        '100%',
      pointerEvents: 'all',
      touchAction:   'none',
    })

    // Label caméra discret
    const cameraHint = document.createElement('div')
    Object.assign(cameraHint.style, {
      position:      'absolute',
      bottom:        '150px',
      right:         '20px',
      color:         'rgba(255,215,0,0.2)',
      fontSize:      '0.65rem',
      letterSpacing: '1px',
      pointerEvents: 'none',
      textAlign:     'right',
    })
    cameraHint.textContent = '⟵ GLISSER POUR CAMÉRA'
    this._cameraZone.appendChild(cameraHint)

    // ── Bouton saut ────────────────────────────────────────────────────────
    this.jumpBtn = document.createElement('div')
    Object.assign(this.jumpBtn.style, {
      position:       'absolute',
      bottom:         '110px',
      right:          '30px',
      width:          '72px',
      height:         '72px',
      borderRadius:   '50%',
      background:     'radial-gradient(circle, rgba(255,100,50,0.85), rgba(180,50,0,0.65))',
      border:         '2px solid rgba(255,150,80,0.5)',
      boxShadow:      '0 0 20px rgba(255,80,0,0.4)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       '1.8rem',
      pointerEvents:  'all',
      touchAction:    'none',
      userSelect:     'none',
      backdropFilter: 'blur(4px)',
      transition:     'transform 0.08s, box-shadow 0.08s',
    })
    this.jumpBtn.textContent = '🦘'

    // Label "SAUT"
    const jumpLabel = document.createElement('div')
    Object.assign(jumpLabel.style, {
      position:      'absolute',
      bottom:        '82px',
      right:         '30px',
      width:         '72px',
      textAlign:     'center',
      color:         'rgba(255,150,80,0.45)',
      fontSize:      '0.6rem',
      letterSpacing: '2px',
      pointerEvents: 'none',
    })
    jumpLabel.textContent = 'SAUT'

    // Assemblage
    this.container.appendChild(this.joystickBase)
    this.container.appendChild(this._cameraZone)
    this.container.appendChild(this.jumpBtn)
    this.container.appendChild(jumpLabel)
    document.body.appendChild(this.container)
  }

  // ── Bind des événements touch ─────────────────────────────────────────────
  private bindEvents(): void {
    // ── Joystick : touchstart ──────────────────────────────────────────────
    this.joystickBase.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.changedTouches[0]
      this.joystickTouchId = touch.identifier
      const rect = this.joystickBase.getBoundingClientRect()
      this.joystickOriginX = rect.left + rect.width  / 2
      this.joystickOriginY = rect.top  + rect.height / 2
    }, { passive: false })

    // ── touchmove global (gère joystick + caméra en même temps) ───────────
    window.addEventListener('touchmove', (e) => {
      e.preventDefault()
      for (const touch of Array.from(e.changedTouches)) {

        // Joystick move
        if (touch.identifier === this.joystickTouchId) {
          const dx = touch.clientX - this.joystickOriginX
          const dy = touch.clientY - this.joystickOriginY
          const dist = Math.sqrt(dx*dx + dy*dy)
          const clamped = Math.min(dist, this.JOYSTICK_RADIUS)
          const angle = Math.atan2(dy, dx)

          // Déplacer le knob visuellement
          const kx = Math.cos(angle) * clamped
          const ky = Math.sin(angle) * clamped
          this.joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`

          // Normaliser -1..1
          this.moveX =  (clamped / this.JOYSTICK_RADIUS) * Math.cos(angle)
          this.moveZ =  (clamped / this.JOYSTICK_RADIUS) * Math.sin(angle)
        }

        // Caméra swipe
        if (touch.identifier === this.cameraTouchId) {
          this.cameraDeltaYaw   -= (touch.clientX - this.cameraLastX) * 0.007
          this.cameraDeltaPitch += (touch.clientY - this.cameraLastY) * 0.005
          this.cameraLastX = touch.clientX
          this.cameraLastY = touch.clientY
        }
      }
    }, { passive: false })

    // ── touchend global ────────────────────────────────────────────────────
    window.addEventListener('touchend', (e) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === this.joystickTouchId) {
          this.joystickTouchId = null
          this.moveX = 0
          this.moveZ = 0
          this.joystickKnob.style.transform = 'translate(0,0)'
        }
        if (touch.identifier === this.cameraTouchId) {
          this.cameraTouchId = null
        }
      }
    })

    // ── Zone caméra : touchstart ───────────────────────────────────────────
    this._cameraZone.addEventListener('touchstart', (e) => {
      e.preventDefault()
      // Ne pas intercepter si le joystick prend déjà ce touch
      if (this.joystickTouchId !== null) return
      const touch = e.changedTouches[0]
      this.cameraTouchId = touch.identifier
      this.cameraLastX   = touch.clientX
      this.cameraLastY   = touch.clientY
    }, { passive: false })

    // ── Bouton saut ───────────────────────────────────────────────────────
    this.jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.jumpBtn.style.transform = 'scale(0.88)'
      this.jumpBtn.style.boxShadow = '0 0 8px rgba(255,80,0,0.3)'
      this.onJump?.()
    }, { passive: false })

    this.jumpBtn.addEventListener('touchend', () => {
      this.jumpBtn.style.transform = 'scale(1)'
      this.jumpBtn.style.boxShadow = '0 0 20px rgba(255,80,0,0.4)'
    })
  }

  // ── API publique ──────────────────────────────────────────────────────────

  /**
   * Vecteur de mouvement normalisé.
   * Injecté dans Rat.update() via rat.setJoystickInput(dx, dz)
   */
  getMovement(): JoystickMovement {
    return { dx: this.moveX, dz: this.moveZ }
  }

  /**
   * Delta caméra accumulé depuis le dernier appel — consomme et reset.
   * Appeler une fois par frame dans GameEngine.loop()
   */
  consumeCameraInput(): { dyaw: number; dpitch: number } {
    const out = { dyaw: this.cameraDeltaYaw, dpitch: this.cameraDeltaPitch }
    this.cameraDeltaYaw   = 0
    this.cameraDeltaPitch = 0
    return out
  }

  hide(): void { if (this.container) this.container.style.display = 'none' }
  show(): void { if (this.container) this.container.style.display = 'block' }
  destroy(): void { this.container?.remove() }
}
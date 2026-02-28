import * as THREE from 'three'

/**
 * SoundManager — gestion audio complète avec spatialisation 3D (THREE.PositionalAudio)
 *
 * Architecture :
 *  - AudioListener attaché à la caméra → "oreilles" du joueur
 *  - PositionalAudio attaché aux chats → son atténué par la distance
 *  - HTMLAudioElement pour la musique d'ambiance (non-spatiale)
 *  - ZzFX synthétisé pour les SFX légers (collect, damage, win, lose)
 */
export class SoundManager {
  // ── Contexte Web Audio API ─────────────────────────────────────────────────
  private ctx: AudioContext | null = null
  private enabled = false

  // ── Listener THREE.js (attaché à la caméra dans GameEngine) ──────────────
  public listener: THREE.AudioListener

  // ── Buffer du miaulement (chargé une seule fois, partagé entre chats) ─────
  private meowBuffer: AudioBuffer | null = null
  private meowLoading = false

  // ── Musiques d'ambiance (non-spatiales) ───────────────────────────────────
  private menuMusic: HTMLAudioElement
  private gameMusic: HTMLAudioElement

  constructor() {
    // Créer le listener THREE.js — sera attaché à la caméra par GameEngine
    this.listener = new THREE.AudioListener()

    // Musiques
    this.menuMusic = new Audio('/sounds/Parisian.mp3')
    this.menuMusic.loop = true
    this.menuMusic.volume = 0.6

    this.gameMusic = new Audio('/sounds/Meanwhile in Bavaria.mp3')
    this.gameMusic.loop = true
    this.gameMusic.volume = 0.5

    // Déverrouillage AudioContext sur première interaction utilisateur
    const unlock = () => {
      this.ensureContext()
      this.loadMeowBuffer() // précharger le buffer dès que possible
    }
    window.addEventListener('keydown',    unlock, { once: true })
    window.addEventListener('click',      unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
  }

  // ── Initialisation du contexte ─────────────────────────────────────────────
  private ensureContext(): void {
    if (!this.ctx) {
      // Réutiliser le contexte interne du listener THREE.js
      this.ctx = this.listener.context as AudioContext
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    this.enabled = true
  }

  // ── Préchargement du buffer WAV du miaulement ──────────────────────────────
  private async loadMeowBuffer(): Promise<void> {
    if (this.meowBuffer || this.meowLoading || !this.ctx) return
    this.meowLoading = true
    try {
      const resp = await fetch('/sounds/412017__skymary__cat-meow-short.wav')
      const arrayBuffer = await resp.arrayBuffer()
      this.meowBuffer = await this.ctx.decodeAudioData(arrayBuffer)
      console.log('🐱 Meow buffer loaded for spatial audio')
    } catch (e) {
      console.warn('Could not load meow buffer:', e)
    }
    this.meowLoading = false
  }

  // ── API publique : créer un PositionalAudio pour un chat ──────────────────
  /**
   * Crée un THREE.PositionalAudio à attacher au mesh du chat.
   * Appelé dans Cat.ts lors de la construction.
   *
   * @param refDistance  distance en dessous de laquelle le volume est maximal (défaut: 4)
   * @param maxDistance  distance au-delà de laquelle le son est inaudible (défaut: 20)
   */
  createCatPositionalAudio(refDistance = 4, maxDistance = 20): THREE.PositionalAudio {
    const sound = new THREE.PositionalAudio(this.listener)
    sound.setRefDistance(refDistance)
    sound.setMaxDistance(maxDistance)
    sound.setRolloffFactor(2)         // atténuation quadratique (réaliste)
    sound.setDistanceModel('inverse') // modèle WebAudio standard
    sound.setVolume(0.9)
    return sound
  }

  /**
   * Joue le miaulement spatialisé sur un PositionalAudio existant.
   * Utilise le buffer préchargé → pas de latence réseau.
   */
  playCatMeowSpatial(positionalAudio: THREE.PositionalAudio): void {
    if (!this.enabled) return
    if (!this.meowBuffer) {
      // Si le buffer n'est pas encore prêt, on charge et on retente
      this.ensureContext()
      this.loadMeowBuffer().then(() => this.playCatMeowSpatial(positionalAudio))
      return
    }
    if (positionalAudio.isPlaying) positionalAudio.stop()
    positionalAudio.setBuffer(this.meowBuffer)
    positionalAudio.play()
  }

  /**
   * Joue un grondement grave en boucle (mode chase).
   * Généré par ZzFX → zéro fichier externe.
   * Note : ce son est spatialisé via PannerNode manuel.
   */
  playCatGrowlSpatial(positionalAudio: THREE.PositionalAudio, catPos: THREE.Vector3, cameraPos: THREE.Vector3): void {
    if (!this.enabled || !this.ctx) return
    const dist = catPos.distanceTo(cameraPos)
    if (dist > 20) return // trop loin, pas la peine
    const vol = Math.max(0, 1 - dist / 20) * 0.4
    this.zzfx(vol, 0.1, 60, 0, 0.05, 0.15, 1, 0.3, -1)
  }

  // ── Musiques d'ambiance ────────────────────────────────────────────────────
  playMenuMusic(): void {
    this.ensureContext()
    if (!this.menuMusic.paused) return
    this.gameMusic.pause()
    this.gameMusic.currentTime = 0
    this.menuMusic.currentTime = 0
    this.menuMusic.play()
      .then(() => console.log('🎵 Menu music started'))
      .catch(err => console.warn('Audio blocked:', err))
  }

  playGameMusic(): void {
    if (this.menuMusic.paused) {
      this.gameMusic.play().catch(() => {})
    } else {
      this.fadeOut(this.menuMusic, 600, () => {
        this.gameMusic.play().catch(() => {})
      })
    }
  }

  pauseGameMusic(): void {
    this.gameMusic.pause()
    this.menuMusic.pause()
  }

  resumeGameMusic(): void {
    this.gameMusic.play().catch(() => {})
  }

  stopMusic(): void {
    this.fadeOut(this.menuMusic, 500)
    this.fadeOut(this.gameMusic, 500)
  }

  private fadeOut(audio: HTMLAudioElement, duration: number, onDone?: () => void): void {
    if (audio.paused) { onDone?.(); return }
    const steps = 20
    const interval = duration / steps
    const volumeStep = audio.volume / steps
    const fade = setInterval(() => {
      if (audio.volume > volumeStep) {
        audio.volume = Math.max(0, audio.volume - volumeStep)
      } else {
        audio.pause()
        audio.currentTime = 0
        audio.volume = 0.6
        clearInterval(fade)
        onDone?.()
      }
    }, interval)
  }

  // ── SFX ZzFX (synthétisés, non-spatiaux) ─────────────────────────────────
  playCollect(): void {
    this.zzfx(1,   0, 523, 0,    0.05, 0.2,  0, 1.5)
    setTimeout(() => this.zzfx(1, 0, 784,  0, 0.03, 0.15, 0, 2),   100)
    setTimeout(() => this.zzfx(1, 0, 1047, 0, 0.02, 0.2,  0, 3),   200)
  }

  playDamage(): void {
    this.zzfx(2, 0.3, 80, 0, 0, 0.3, 1, 0.5, -4, 0, 0, 0, 0, 0.8)
  }

  playWin(): void {
    this.stopMusic()
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      setTimeout(() => this.zzfx(1.2, 0, freq, 0, 0.1, 0.3, 0, 2), i * 160)
    })
  }

  playLose(): void {
    this.stopMusic()
    const notes = [400, 300, 200, 130]
    notes.forEach((freq, i) => {
      setTimeout(() => this.zzfx(1, 0.05, freq, 0, 0.05, 0.25, 0, 0.7, -1), i * 200)
    })
  }

  // ── ZzFX engine interne ───────────────────────────────────────────────────
  private zzfx(
    volume = 1, randomness = 0.05, frequency = 220,
    attack = 0, sustain = 0, release = 0.1,
    shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
    pitchJump = 0, pitchJumpTime = 0, repeatTime = 0,
    noise = 0, modulation = 0
  ): void {
    if (!this.enabled) return
    this.ensureContext()
    if (!this.ctx) return
    const ctx = this.ctx
    try {
      const sr = ctx.sampleRate
      frequency *= (1 + randomness * 2 * Math.random() - randomness) * Math.PI * 2 / sr
      slide     *= 500 * Math.PI ** 2 / sr ** 2

      const attack_s  = (attack  * sr + 9) | 0
      const sustain_s = (sustain * sr)     | 0
      const release_s = (release * sr)     | 0
      const length    = attack_s + sustain_s + release_s

      const buffer = ctx.createBuffer(1, length, sr)
      const data   = buffer.getChannelData(0)
      let b = 0

      for (let i = 0; i < length; i++) {
        const env =
          i < attack_s             ? i / attack_s :
          i < attack_s + sustain_s ? 1 :
          (length - i) / release_s

        frequency += slide
        b += frequency

        const wave =
          shape === 0 ? Math.sin(b) :
          shape === 1 ? Math.sign(Math.sin(b)) :
          shape === 3 ? (b / Math.PI % 2 + 2) % 2 - 1 :
          Math.sin(b)

        const nse = noise ? 1 - noise + noise * Math.random() * 2 : 1
        data[i] = wave * env * nse * 0.3 * volume
      }

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start()
    } catch (e) {}
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────
  toggle(): void {
    this.enabled = !this.enabled
    if (!this.enabled) {
      this.menuMusic.pause()
      this.gameMusic.pause()
    }
  }

  isEnabled(): boolean { return this.enabled }
}
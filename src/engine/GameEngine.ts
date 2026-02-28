import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js'
import { PhysicsWorld } from './PhysicsWorld'
import { Rat } from '../entities/Rat'
import { Cat } from '../entities/Cat'
import { Ingredient, INGREDIENTS_DATA } from '../entities/Ingredient'
import { ParisMap } from '../map/ParisMap'
import { HUD } from '../../../three_vite_ts/ui/HUD'
import { SoundManager } from './SoundManager'

export class GameEngine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private timer: THREE.Timer

  private physics: PhysicsWorld
  private rat!: Rat
  private cats: Cat[] = []
  private ingredients: Ingredient[] = []
  private map!: ParisMap
  private hud: HUD
  private sound!: SoundManager

  private gameState: 'intro' | 'playing' | 'win' | 'lose' = 'intro'
  private timeLeft      = 120
  private totalGameTime = 120
  private score         = 0
  private collectedCount = 0
  private difficulty    = 1.0

  private cameraYaw      = 0
  private cameraPitch    = 0.35
  private cameraDistance = 7
  private isDragging     = false
  private lastMouseX     = 0
  private lastMouseY     = 0

  private collectParticles: THREE.Points[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x2a1a0a, 30, 100)
    this.scene.background = new THREE.Color(0x1a1008)

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200)
    this.timer   = new THREE.Timer()
    this.physics = new PhysicsWorld()
    this.hud     = new HUD()

    this.setupLighting()
    this.setupEventListeners()
  }

  private setupLighting(): void {
    this.scene.add(new THREE.AmbientLight(0xffd0a0, 0.6))

    const sun = new THREE.DirectionalLight(0xffbb66, 1.5)
    sun.position.set(30, 50, 20)
    sun.castShadow = true
    sun.shadow.mapSize.width  = 2048
    sun.shadow.mapSize.height = 2048
    sun.shadow.camera.near   = 0.5
    sun.shadow.camera.far    = 150
    sun.shadow.camera.left   = -60
    sun.shadow.camera.right  =  60
    sun.shadow.camera.top    =  60
    sun.shadow.camera.bottom = -60
    sun.shadow.bias          = -0.001
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0x8899ff, 0.3)
    fill.position.set(-20, 15, -20)
    this.scene.add(fill)

    this.scene.add(new THREE.HemisphereLight(0xff9933, 0x223311, 0.4))
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })

    const canvas = this.renderer.domElement
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { this.isDragging = true; this.lastMouseX = e.clientX; this.lastMouseY = e.clientY }
    })
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.cameraYaw   -= (e.clientX - this.lastMouseX) * 0.005
        this.cameraPitch  = Math.max(0.1, Math.min(1.0, this.cameraPitch + (e.clientY - this.lastMouseY) * 0.005))
        this.lastMouseX   = e.clientX
        this.lastMouseY   = e.clientY
      }
    })
    window.addEventListener('mouseup', () => { this.isDragging = false })
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    canvas.addEventListener('wheel', (e) => {
      this.cameraDistance = Math.max(3, Math.min(15, this.cameraDistance + e.deltaY * 0.01))
    })
  }

  async init(): Promise<void> {
    this.sound = new SoundManager()

    this.map = new ParisMap(this.scene, this.physics)
    this.map.build()

    this.rat = new Rat(this.physics)
    this.scene.add(this.rat.mesh)

    // Ingredients
    const spawnPositions = this.map.getIngredientSpawnPositions()
    for (let i = 0; i < INGREDIENTS_DATA.length; i++) {
      const ing = new Ingredient({ ...INGREDIENTS_DATA[i], position: spawnPositions[i] })
      this.ingredients.push(ing)
      this.scene.add(ing.mesh)
    }

    // Patrol cats — 3 from map routes
    for (const route of this.map.getCatPatrolRoutes()) {
      const cat = new Cat(this.physics, route)
      this.cats.push(cat)
      this.scene.add(cat.mesh)
    }



    // Ambush cats — pace a small loop near each archway
    for (const pos of this.map.getAmbushPositions()) {
      const r    = 0.9
      const loop = [
        new THREE.Vector3(pos.x + r, 0.5, pos.z),
        new THREE.Vector3(pos.x,     0.5, pos.z + r),
        new THREE.Vector3(pos.x - r, 0.5, pos.z),
        new THREE.Vector3(pos.x,     0.5, pos.z - r),
      ]
      const ambush = new Cat(this.physics, loop)
      ambush.difficultyMult = 1.3
      this.cats.push(ambush)
      this.scene.add(ambush.mesh)
    }

    this.createCollectParticlePool()
    this.playIntroCameraAnimation()
  }

  private playIntroCameraAnimation(): void {
    const startPos = { x: 20, y: 15, z: 20 }
    const endPos   = { x:  0, y:  8, z: 12 }
    this.camera.position.set(startPos.x, startPos.y, startPos.z)
    this.camera.lookAt(0, 0, 0)
    new TWEEN.Tween(startPos)
      .to(endPos, 3000)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => { this.camera.position.set(startPos.x, startPos.y, startPos.z); this.camera.lookAt(0, 0, 0) })
      .start()
  }

  private playCollectAnimation(position: THREE.Vector3, color: number): void {
    const geo = new THREE.SphereGeometry(0.3, 8, 8)
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, wireframe: true })
    const ring = new THREE.Mesh(geo, mat)
    ring.position.copy(position)
    this.scene.add(ring)
    const scaleObj = { s: 0.3, opacity: 0.8 }
    new TWEEN.Tween(scaleObj)
      .to({ s: 3.0, opacity: 0 }, 600)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => { ring.scale.setScalar(scaleObj.s); mat.opacity = scaleObj.opacity })
      .onComplete(() => { this.scene.remove(ring); geo.dispose(); mat.dispose() })
      .start()
    this.playCameraShake(0.15, 300)
  }

  private playCameraShake(intensity: number, duration: number): void {
    const shake = { v: intensity }
    new TWEEN.Tween(shake)
      .to({ v: 0 }, duration)
      .easing(TWEEN.Easing.Elastic.Out)
      .onUpdate(() => {
        this.camera.position.x += (Math.random() - 0.5) * shake.v
        this.camera.position.y += (Math.random() - 0.5) * shake.v
      })
      .start()
  }

  private playDamageFlash(): void {
    const overlay = document.getElementById('damage-overlay')
    if (!overlay) return
    const opacity = { v: 0.5 }
    new TWEEN.Tween(opacity)
      .to({ v: 0 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => { overlay.style.opacity = opacity.v.toString() })
      .start()
  }

  private createCollectParticlePool(): void {
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3))
      const mat = new THREE.PointsMaterial({ color: 0xFFD700, size: 0.12, transparent: true, opacity: 0, sizeAttenuation: true })
      const pts = new THREE.Points(geo, mat)
      pts.visible = false
      this.scene.add(pts)
      this.collectParticles.push(pts)
    }
  }

  private burstParticles(position: THREE.Vector3, color: number): void {
    const pts = this.collectParticles.find(p => !p.visible)
    if (!pts) return
    const mat = pts.material as THREE.PointsMaterial
    mat.color.set(color); mat.opacity = 1
    pts.position.copy(position); pts.visible = true
    const posArr    = pts.geometry.attributes.position.array as Float32Array
    const velocities: THREE.Vector3[] = []
    for (let i = 0; i < 30; i++) {
      posArr[i*3] = posArr[i*3+1] = posArr[i*3+2] = 0
      velocities.push(new THREE.Vector3((Math.random()-0.5)*6, Math.random()*5+2, (Math.random()-0.5)*6))
    }
    pts.geometry.attributes.position.needsUpdate = true
    let elapsed = 0
    const animate = () => {
      elapsed += 0.016
      if (elapsed > 1) { pts.visible = false; return }
      for (let i = 0; i < 30; i++) {
        posArr[i*3]   += velocities[i].x * 0.016
        posArr[i*3+1] += velocities[i].y * 0.016 - 9.8 * elapsed * 0.016
        posArr[i*3+2] += velocities[i].z * 0.016
      }
      pts.geometry.attributes.position.needsUpdate = true
      mat.opacity = 1 - elapsed
      requestAnimationFrame(animate)
    }
    animate()
  }

  private updateCamera(): void {
    const ratPos = this.rat.getPosition()
    const x = ratPos.x + Math.sin(this.cameraYaw) * this.cameraDistance * Math.cos(this.cameraPitch)
    const y = ratPos.y + Math.sin(this.cameraPitch) * this.cameraDistance + 1
    const z = ratPos.z + Math.cos(this.cameraYaw) * this.cameraDistance * Math.cos(this.cameraPitch)
    this.camera.position.lerp(new THREE.Vector3(x, y, z), 0.1)
    this.camera.lookAt(ratPos.x, ratPos.y + 0.5, ratPos.z)
  }

  private checkCollections(): void {
    const ratPos = this.rat.getPosition()
    for (let i = 0; i < this.ingredients.length; i++) {
      const ing = this.ingredients[i]
      if (ing.collected) continue
      if (ratPos.distanceTo(ing.getPosition()) < ing.getCollectionRadius()) {
        ing.collect()
        this.collectedCount++
        this.score += 100
        this.hud.collectIngredient(i)
        this.hud.updateScore(this.score)
        this.sound.playCollect()
        this.playCollectAnimation(ing.data.position, ing.data.color)
        this.burstParticles(ing.data.position, ing.data.color)
        const msgs = [
          `🧀 Parfait! ${ing.data.name} trouvé!`,
          `🐀 Magnifique! ${ing.data.name} dans la poche!`,
          `⭐ ${ing.data.name}! Rémi est un génie!`,
          `🎉 ${ing.data.name}! Le chef est content!`,
          `✨ ${ing.data.name}! Quel talent!`
        ]
        this.hud.showMessage(msgs[i], 2000)
        if (this.collectedCount === 5) this.win()
      }
    }
  }

  private checkEnemyCollisions(): void {
    const ratPos = this.rat.getPosition()
    for (const cat of this.cats) {
      const caught = cat.update(0.016, ratPos)
      if (caught && !this.rat.state.isInvincible) {
        this.rat.takeDamage()
        this.hud.updateLives(this.rat.state.lives)
        this.hud.showMessage('🙀 MON DIEU! Attention au chat!', 2000)
        this.sound.playDamage()
        this.sound.playCatMeow()
        this.playDamageFlash()
        this.playCameraShake(0.3, 400)

        for (const other of this.cats) {
          if (other.getPosition().distanceTo(ratPos) < 20) {
            other.triggerAlert(ratPos)
          }
        }

        if (this.rat.state.lives <= 0) this.lose()
      }
    }
  }

  private updateMinimap(): void {
    const ratPos = this.rat.getPosition()
    this.hud.updateMinimap(
      ratPos.x, ratPos.z,
      this.ingredients.map(ing => ({ x: ing.data.position.x, z: ing.data.position.z, collected: ing.collected })),
      this.cats.map(cat => { const p = cat.getPosition(); return { x: p.x, z: p.z } })
    )
  }

  private win(): void {
    this.gameState  = 'win'
    this.score     += Math.floor(this.timeLeft) * 5
    this.sound.playWin()
    const target   = this.rat.getPosition()
    const tweenObj = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z }
    new TWEEN.Tween(tweenObj)
      .to({ x: target.x + 2, y: target.y + 3, z: target.z + 2 }, 1500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => { this.camera.position.set(tweenObj.x, tweenObj.y, tweenObj.z) })
      .onComplete(() => { this.hud.showWin(this.score) })
      .start()
  }

  private lose(): void {
    this.gameState = 'lose'
    this.sound.playLose()
    this.hud.showLose()
  }

  startMenuMusic(): void { this.sound.playMenuMusic() }

  start(): void {
    this.gameState = 'playing'
    this.sound.playGameMusic()
    this.loop()
  }

  private loop = (): void => {
    requestAnimationFrame(this.loop)
    this.timer.update()
    const dt = Math.min(this.timer.getDelta(), 0.05)
    TWEEN.update()

    if (this.gameState !== 'playing') {
      this.renderer.render(this.scene, this.camera)
      return
    }

    this.timeLeft -= dt
    this.hud.updateTimer(this.timeLeft)
    if (this.timeLeft <= 0) { this.lose(); return }

    // Difficulty ramps 1.0 → 1.6 as time runs out
    this.difficulty = 1.0 + (1 - this.timeLeft / this.totalGameTime) * 0.6
    for (const cat of this.cats) cat.difficultyMult = this.difficulty

    this.physics.step(dt)
    this.rat.update(dt, this.cameraYaw)
    this.map.update(this.timer.getElapsed())
    for (const ing of this.ingredients) ing.update(dt)
    this.checkEnemyCollisions()
    this.checkCollections()
    this.updateCamera()
    this.updateMinimap()
    this.score += dt * 0.5
    this.hud.updateScore(Math.floor(this.score))

    this.renderer.render(this.scene, this.camera)
  }

  setARCamera(camera: THREE.PerspectiveCamera): void { this.camera = camera }

  worldToGPS(worldPos: THREE.Vector3): { lat: number; lng: number } {
    return {
      lat: 48.8566 + worldPos.z * 0.0001,
      lng: 2.3522  + worldPos.x * 0.0001
    }
  }
}
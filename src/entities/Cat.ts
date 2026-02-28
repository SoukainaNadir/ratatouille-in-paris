import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PhysicsWorld } from '../engine/PhysicsWorld'

export type CatState = 'patrol' | 'chase' | 'search' | 'celebrate'

export interface CatUpdateResult {
  caught: boolean
  spotted: boolean
}

export class Cat {
  public mesh: THREE.Group
  public body!: CANNON.Body
  public difficultyMult = 1.0
  public alertPos: THREE.Vector3 | null = null
  private alertTimer = 0

  private physics: PhysicsWorld
  private patrolPoints: THREE.Vector3[]
  private currentPatrolIndex = 0
  private state: CatState = 'patrol'

  private detectRange = 7
  private chaseRange  = 12
  private speed       = { patrol: 2.5, chase: 5.5 }
  private visionAngle = (2 * Math.PI) / 3

  private animTime  = 0
  private bodyMesh!: THREE.Mesh
  private tailMesh!: THREE.Mesh
  private headMesh!: THREE.Mesh
  private speechBubble: THREE.Sprite | null = null

  constructor(physics: PhysicsWorld, patrolPoints: THREE.Vector3[]) {
    this.physics      = physics
    this.patrolPoints = patrolPoints
    this.mesh         = new THREE.Group()
    this.buildMesh()
    this.buildPhysics()
  }

  private buildMesh(): void {
    const catMat   = new THREE.MeshToonMaterial({ color: 0x444444 })
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xeeeeee })

    this.bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.45, 4, 8), catMat)
    this.bodyMesh.rotation.x = Math.PI / 2
    this.bodyMesh.castShadow = true

    this.headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), catMat)
    this.headMesh.position.set(0, 0.1, 0.38)

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), whiteMat)
    muzzle.position.set(0, -0.04, 0.2)
    muzzle.scale.set(1.1, 0.8, 1)
    this.headMesh.add(muzzle)

    const eyeGeo   = new THREE.SphereGeometry(0.06, 8, 8)
    const eyeMat   = new THREE.MeshToonMaterial({ color: 0x88ff00 })
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 })

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
    leftEye.position.set(-0.1, 0.08, 0.18); leftEye.rotation.z = 0.3
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat)
    leftPupil.position.z = 0.05
    leftEye.add(leftPupil)
    this.headMesh.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
    rightEye.position.set(0.1, 0.08, 0.18); rightEye.rotation.z = -0.3
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat)
    rightPupil.position.z = 0.05
    rightEye.add(rightPupil)
    this.headMesh.add(rightEye)

    const earGeo  = new THREE.ConeGeometry(0.08, 0.18, 4)
    const leftEar = new THREE.Mesh(earGeo, catMat)
    leftEar.position.set(-0.14, 0.26, 0.04); leftEar.rotation.z = -0.2
    const rightEar = new THREE.Mesh(earGeo, catMat)
    rightEar.position.set(0.14, 0.26, 0.04); rightEar.rotation.z = 0.2
    this.headMesh.add(leftEar, rightEar)

    const tailPoints = []
    for (let i = 0; i <= 8; i++)
      tailPoints.push(new THREE.Vector3(Math.sin(i * 0.5) * 0.15, i * 0.08, -0.3 - i * 0.08))
    this.tailMesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPoints), 12, 0.04, 6, false), catMat)

    const legGeo = new THREE.CapsuleGeometry(0.07, 0.2, 4, 6)
    for (const [x, y, z] of [[-0.2,-0.22,0.15],[0.2,-0.22,0.15],[-0.18,-0.22,-0.15],[0.18,-0.22,-0.15]]) {
      const leg = new THREE.Mesh(legGeo, catMat)
      leg.position.set(x, y, z)
      this.mesh.add(leg)
    }

    this.mesh.add(this.bodyMesh, this.headMesh, this.tailMesh)
    this.mesh.position.copy(this.patrolPoints[0])
    this.mesh.position.y = 0.35
  }

  private buildPhysics(): void {
    this.body = new CANNON.Body({
      mass: 3, shape: new CANNON.Sphere(0.3),
      linearDamping: 0.6, angularDamping: 1.0
    })
    const sp = this.patrolPoints[0]
    this.body.position.set(sp.x, 1, sp.z)
    this.body.fixedRotation = true
    this.physics.world.addBody(this.body)
    this.physics.linkMeshToBody(this.mesh, this.body)
  }

  update(dt: number, ratPosition: THREE.Vector3): CatUpdateResult {
    this.animTime  += dt
    this.alertTimer = Math.max(0, this.alertTimer - dt)

    const myPos     = this.mesh.position.clone()
    const distToRat = myPos.distanceTo(ratPosition)

    const chaseSpd  = this.speed.chase  * this.difficultyMult
    const patrolSpd = this.speed.patrol * Math.min(this.difficultyMult, 1.3)
    const detectR   = this.detectRange  * Math.min(this.difficultyMult, 1.4)

    // Save state BEFORE the switch to detect transitions
    const prevState = this.state

    if (this.alertPos && this.alertTimer > 0 && this.state === 'patrol') {
      this.state = 'chase'
      this.showSpeechBubble('😾 J\'ARRIVE!')
    }

    switch (this.state) {
      case 'patrol':
        this.patrol(patrolSpd)
        if (this.canSeeRat(ratPosition, detectR, this.visionAngle)) {
          this.state = 'chase'
          this.showSpeechBubble('😾 J\'AI VU LE RAT!')
        }
        break

      case 'chase':
        this.chaseRat(ratPosition, chaseSpd)
        if (distToRat > this.chaseRange * this.difficultyMult) {
          this.state = 'search'
          this.showSpeechBubble('🙀 OÙ EST-IL?!')
          setTimeout(() => { if (this.state === 'search') this.state = 'patrol' }, 2000)
        }
        if (distToRat < 0.8) {
          this.showSpeechBubble('😸 ATTRAPPÉ!')
          this.animateCat()
          return { caught: true, spotted: false }
        }
        break

      case 'search':
        this.body.velocity.set(0, this.body.velocity.y, 0)
        this.mesh.rotation.y += dt * 3
        if (this.canSeeRat(ratPosition, detectR, Math.PI * 2)) {
          this.state = 'chase'
          this.showSpeechBubble('😾 TE VOILÀ!')
        }
        break

      case 'celebrate':
        this.mesh.rotation.y += dt * 5
        break
    }

    // spotted = true only on the frame the cat transitions INTO chase
    const spotted = prevState !== 'chase' && this.state === 'chase'

    this.animateCat()
    return { caught: false, spotted }
  }

  private canSeeRat(ratPos: THREE.Vector3, range: number, angle: number): boolean {
    const myPos = this.mesh.position
    if (myPos.distanceTo(ratPos) > range) return false
    if (angle >= Math.PI * 2) return true
    const toRat   = new THREE.Vector3().subVectors(ratPos, myPos).normalize()
    const forward = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y))
    return Math.acos(THREE.MathUtils.clamp(forward.dot(toRat), -1, 1)) < angle / 2
  }

  private patrol(speed: number): void {
    const target = this.patrolPoints[this.currentPatrolIndex]
    const myPos  = this.body.position
    const dx = target.x - myPos.x
    const dz = target.z - myPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < 0.5) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length
    } else {
      this.body.velocity.x = (dx / dist) * speed
      this.body.velocity.z = (dz / dist) * speed
      this.mesh.rotation.y = Math.atan2(dx, dz)
    }
  }

  private chaseRat(ratPos: THREE.Vector3, speed: number): void {
    const myPos = this.body.position
    const dx    = ratPos.x - myPos.x
    const dz    = ratPos.z - myPos.z
    const dist  = Math.sqrt(dx * dx + dz * dz)
    this.body.velocity.x = (dx / dist) * speed
    this.body.velocity.z = (dz / dist) * speed
    this.mesh.rotation.y = Math.atan2(dx, dz)
  }

  triggerAlert(ratPos: THREE.Vector3): void {
    this.alertPos   = ratPos.clone()
    this.alertTimer = 4
  }

  getPosition(): THREE.Vector3 { return this.mesh.position.clone() }
  isChasing():   boolean       { return this.state === 'chase' }

  private animateCat(): void {
    const isMoving = this.state === 'patrol' || this.state === 'chase'
    this.tailMesh.rotation.y = this.state === 'chase'
      ? Math.sin(this.animTime * 12) * 0.7
      : Math.sin(this.animTime * 2)  * 0.3
    if (isMoving) {
      this.bodyMesh.position.y = Math.sin(this.animTime * 8) * 0.04
      this.headMesh.position.y = 0.1 + Math.sin(this.animTime * 8) * 0.03
    }
    this.headMesh.scale.setScalar(this.state === 'chase' ? 1.08 : 1.0)
  }

  private showSpeechBubble(text: string): void {
    if (this.speechBubble) { this.mesh.remove(this.speechBubble); this.speechBubble = null }
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.roundRect(10, 10, 236, 60, 15); ctx.fill()
    ctx.fillStyle = '#333'; ctx.font = 'bold 22px Arial'
    ctx.textAlign = 'center'; ctx.fillText(text, 128, 47)
    const tex = new THREE.CanvasTexture(canvas)
    this.speechBubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }))
    this.speechBubble.position.set(0, 1.2, 0)
    this.speechBubble.scale.set(2, 0.6, 1)
    this.mesh.add(this.speechBubble)
    setTimeout(() => {
      if (this.speechBubble) { this.mesh.remove(this.speechBubble); this.speechBubble = null }
    }, 2000)
  }


  resetToPatrol(): void {
    this.state = 'patrol'
    this.currentPatrolIndex = 0
    this.alertPos   = null
    this.alertTimer = 0
    this.difficultyMult = 1.0
    const sp = this.patrolPoints[0]
    this.body.position.set(sp.x, 1, sp.z)
    this.body.velocity.set(0, 0, 0)
    if (this.speechBubble) {
      this.mesh.remove(this.speechBubble)
      this.speechBubble = null
    }
  }
}
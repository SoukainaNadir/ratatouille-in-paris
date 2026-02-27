import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PhysicsWorld } from '../engine/PhysicsWorld'

export type CatState = 'patrol' | 'chase' | 'search' | 'celebrate'

export class Cat {
  public mesh: THREE.Group
  public body!: CANNON.Body

  private physics: PhysicsWorld
  private patrolPoints: THREE.Vector3[]
  private currentPatrolIndex = 0
  private state: CatState = 'patrol'
  private detectRange = 5
  private chaseRange = 8
  private speed = { patrol: 3, chase: 7 }
  private animTime = 0
  private bodyMesh!: THREE.Mesh
  private tailMesh!: THREE.Mesh
  private headMesh!: THREE.Mesh
  private speechBubble: THREE.Sprite | null = null

  private visionAngle = Math.PI / 3 

  constructor(physics: PhysicsWorld, patrolPoints: THREE.Vector3[]) {
    this.physics = physics
    this.patrolPoints = patrolPoints
    this.mesh = new THREE.Group()
    this.buildMesh()
    this.buildPhysics()
  }

  private buildMesh(): void {
    const catMat = new THREE.MeshToonMaterial({ color: 0x444444 })
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xeeeeee })

    const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.45, 4, 8)
    this.bodyMesh = new THREE.Mesh(bodyGeo, catMat)
    this.bodyMesh.rotation.x = Math.PI / 2
    this.bodyMesh.castShadow = true

    const headGeo = new THREE.SphereGeometry(0.24, 10, 8)
    this.headMesh = new THREE.Mesh(headGeo, catMat)
    this.headMesh.position.set(0, 0.1, 0.38)

    const muzzleGeo = new THREE.SphereGeometry(0.1, 6, 4)
    const muzzle = new THREE.Mesh(muzzleGeo, whiteMat)
    muzzle.position.set(0, -0.04, 0.2)
    muzzle.scale.set(1.1, 0.8, 1)
    this.headMesh.add(muzzle)

    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8)
    const eyeMat = new THREE.MeshToonMaterial({ color: 0x88ff00 }) 
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 })

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
    leftEye.position.set(-0.1, 0.08, 0.18)
    leftEye.rotation.z = 0.3 
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat)
    leftPupil.position.z = 0.05
    leftEye.add(leftPupil)
    this.headMesh.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
    rightEye.position.set(0.1, 0.08, 0.18)
    rightEye.rotation.z = -0.3
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), pupilMat)
    rightPupil.position.z = 0.05
    rightEye.add(rightPupil)
    this.headMesh.add(rightEye)

    const earGeo = new THREE.ConeGeometry(0.08, 0.18, 4)
    const leftEar = new THREE.Mesh(earGeo, catMat)
    leftEar.position.set(-0.14, 0.26, 0.04)
    leftEar.rotation.z = -0.2
    const rightEar = new THREE.Mesh(earGeo, catMat)
    rightEar.position.set(0.14, 0.26, 0.04)
    rightEar.rotation.z = 0.2
    this.headMesh.add(leftEar, rightEar)

    const tailPoints = []
    for (let i = 0; i <= 8; i++) {
      tailPoints.push(
        new THREE.Vector3(
          Math.sin(i * 0.5) * 0.15,
          i * 0.08,
          -0.3 - i * 0.08
        )
      )
    }
    const tailCurve = new THREE.CatmullRomCurve3(tailPoints)
    const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.04, 6, false)
    this.tailMesh = new THREE.Mesh(tailGeo, catMat)

    const legGeo = new THREE.CapsuleGeometry(0.07, 0.2, 4, 6)
    const positions = [
      [-0.2, -0.22, 0.15], [0.2, -0.22, 0.15],
      [-0.18, -0.22, -0.15], [0.18, -0.22, -0.15]
    ]
    for (const [x, y, z] of positions) {
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
      mass: 3,
      shape: new CANNON.Sphere(0.3),
      linearDamping: 0.6,
      angularDamping: 1.0
    })
    const startPos = this.patrolPoints[0]
    this.body.position.set(startPos.x, 1, startPos.z)
    this.body.fixedRotation = true
    this.physics.world.addBody(this.body)
    this.physics.linkMeshToBody(this.mesh, this.body)
  }

  update(dt: number, ratPosition: THREE.Vector3): boolean {
    this.animTime += dt
    const myPos = this.mesh.position.clone()
    const distToRat = myPos.distanceTo(ratPosition)

    switch (this.state) {
      case 'patrol':
        this.patrol(dt)
        if (this.canSeeRat(ratPosition)) {
          this.state = 'chase'
          this.showSpeechBubble('😾 J\'AI VU LE RAT!')
        }
        break

      case 'chase':
        this.chaseRat(ratPosition)
        if (distToRat > this.chaseRange) {
          this.state = 'search'
          this.showSpeechBubble('🙀 OÙ EST-IL?!')
          setTimeout(() => { this.state = 'patrol' }, 3000)
        }
        if (distToRat < 0.8) {
          this.showSpeechBubble('😸 ATTRAPPÉ!')
          return true 
        }
        break

      case 'search':
        this.body.velocity.set(0, this.body.velocity.y, 0)
        this.mesh.rotation.y += dt * 2
        break

      case 'celebrate':
        this.mesh.rotation.y += dt * 5
        break
    }

    this.animateCat(dt)
    return false
  }

  private canSeeRat(ratPos: THREE.Vector3): boolean {
    const myPos = this.mesh.position
    const distToRat = myPos.distanceTo(ratPos)
    if (distToRat > this.detectRange) return false

    const toRat = new THREE.Vector3().subVectors(ratPos, myPos).normalize()
    const forward = new THREE.Vector3(
      Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y)
    )
    const angle = Math.acos(forward.dot(toRat))
    return angle < this.visionAngle / 2
  }

  private patrol(_dt: number): void {
    const target = this.patrolPoints[this.currentPatrolIndex]
    const myPos = this.body.position
    const dx = target.x - myPos.x
    const dz = target.z - myPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 0.5) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length
    } else {
      const speed = this.speed.patrol
      this.body.velocity.x = (dx / dist) * speed
      this.body.velocity.z = (dz / dist) * speed
      this.mesh.rotation.y = Math.atan2(dx, dz)
    }
  }

  private chaseRat(ratPos: THREE.Vector3): void {
    const myPos = this.body.position
    const dx = ratPos.x - myPos.x
    const dz = ratPos.z - myPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const speed = this.speed.chase

    this.body.velocity.x = (dx / dist) * speed
    this.body.velocity.z = (dz / dist) * speed
    this.mesh.rotation.y = Math.atan2(dx, dz)
  }

  private animateCat(dt: number): void {
    const isMoving = this.state === 'patrol' || this.state === 'chase'

    this.tailMesh.rotation.y = this.state === 'chase'
      ? Math.sin(this.animTime * 10) * 0.6
      : Math.sin(this.animTime * 2) * 0.3

    if (isMoving) {
      this.bodyMesh.position.y = Math.sin(this.animTime * 8) * 0.04
      this.headMesh.position.y = 0.1 + Math.sin(this.animTime * 8) * 0.03
    }

    if (this.state === 'chase') {
      this.headMesh.scale.set(1.05, 1.05, 1.05)
    } else {
      this.headMesh.scale.set(1, 1, 1)
    }
  }

  private showSpeechBubble(text: string): void {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 80
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.roundRect(10, 10, 236, 60, 15)
    ctx.fill()
    ctx.fillStyle = '#333'
    ctx.font = 'bold 22px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(text, 128, 47)

    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture })
    this.speechBubble = new THREE.Sprite(spriteMat)
    this.speechBubble.position.set(0, 1.2, 0)
    this.speechBubble.scale.set(2, 0.6, 1)
    this.mesh.add(this.speechBubble)

    setTimeout(() => {
      if (this.speechBubble) {
        this.mesh.remove(this.speechBubble)
        this.speechBubble = null
      }
    }, 2000)
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone()
  }
}
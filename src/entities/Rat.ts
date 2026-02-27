import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PhysicsWorld } from '../engine/PhysicsWorld'

export interface RatState {
  isGrounded: boolean
  isRunning: boolean
  isSliding: boolean
  lives: number
  isInvincible: boolean
}

export class Rat {
  public mesh: THREE.Group
  public body!: CANNON.Body
  public state: RatState

  private physics: PhysicsWorld
  private moveSpeed = 8
  private jumpForce = 8
  private keys: Set<string> = new Set()

  private bodyGroup!: THREE.Group
  private headGroup!: THREE.Group
  private tail!: THREE.Mesh
  private legs: THREE.Group[] = []
  private chefHat!: THREE.Group
  private leftEyeGroup!: THREE.Group
  private rightEyeGroup!: THREE.Group

  private animTime = 0
  private invincibleTimer = 0
  private blinkTimer = 0
  private hatTiltTarget = 0
  private hatTilt = 0

  constructor(physics: PhysicsWorld) {
    this.physics = physics
    this.mesh = new THREE.Group()
    this.state = {
      isGrounded: true, isRunning: false, isSliding: false, lives: 3, isInvincible: false
    }
    this.buildMesh()
    this.buildPhysics()
    this.setupControls()
  }

  private toon(hex: number): THREE.MeshToonMaterial {
    return new THREE.MeshToonMaterial({ color: hex })
  }

  private glossy(hex: number, shin = 80): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({ color: hex, shininess: shin, specular: 0xffffff })
  }

  private buildMesh(): void {
    const FUR      = 0x9aafc4  
    const FUR_LT   = 0xbdd0e0   
    const FUR_DK   = 0x6a8096   
    const BELLY    = 0xece0cc  
    const EAR_MID  = 0xf0aaaa  
    const EAR_DEEP = 0xd88090   
    const NOSE_P   = 0xee8888   
    const CHEEK_B  = 0xf0b0b8   
    const PAW_C    = 0xddd0b8   
    const HAT_W    = 0xf5f2ea   
    const HAT_BD   = 0xe0dbd0   
    const TAIL_C   = 0xd4b8a8   

    this.bodyGroup = new THREE.Group()
    this.bodyGroup.position.set(0, -0.05, 0)

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 32, 24),
      this.toon(FUR)
    )
    body.scale.set(1.0, 0.72, 1.60)
    body.castShadow = true
    body.receiveShadow = true
    this.bodyGroup.add(body)

    const dorsalPatch = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 20, 14),
      this.toon(FUR_LT)
    )
    dorsalPatch.scale.set(0.72, 0.40, 1.10)
    dorsalPatch.position.set(0, 0.16, 0)
    body.add(dorsalPatch)

    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 16),
      this.toon(BELLY)
    )
    belly.scale.set(0.78, 0.90, 0.38)
    belly.position.set(0, -0.06, 0.26)
    body.add(belly)

    this.mesh.add(this.bodyGroup)


    this.headGroup = new THREE.Group()
    this.headGroup.position.set(0, 0.08, 0.46)
    this.headGroup.rotation.x = -0.30  

    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.310, 36, 28),
      this.toon(FUR)
    )
    skull.scale.set(1.0, 1.0, 0.94)
    skull.castShadow = true
    this.headGroup.add(skull)

    const headTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.230, 22, 16),
      this.toon(FUR_LT)
    )
    headTop.scale.set(0.82, 0.52, 0.68)
    headTop.position.set(0, 0.20, 0.02)
    this.headGroup.add(headTop)

    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(
        new THREE.SphereGeometry(0.185, 20, 16),
        this.toon(FUR_LT)
      )
      cheek.scale.set(0.82, 0.72, 0.52)
      cheek.position.set(side * 0.240, -0.04, 0.190)
      this.headGroup.add(cheek)

      const blush = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 14, 10),
        this.toon(CHEEK_B)
      )
      blush.scale.set(1.10, 0.55, 0.22)
      blush.position.set(side * 0.255, -0.055, 0.238)
      this.headGroup.add(blush)
    }

    const muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.155, 24, 18),
      this.toon(BELLY)
    )
    muzzle.scale.set(1.0, 0.65, 0.90)
    muzzle.position.set(0, -0.105, 0.268)
    this.headGroup.add(muzzle)

    const muzzleTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 18, 14),
      this.toon(BELLY)
    )
    muzzleTop.scale.set(0.86, 0.52, 0.82)
    muzzleTop.position.set(0, -0.050, 0.265)
    this.headGroup.add(muzzleTop)

    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 18, 14),
      this.glossy(NOSE_P, 120)
    )
    nose.scale.set(1.0, 0.88, 0.88)
    nose.position.set(0, -0.070, 0.395)
    this.headGroup.add(nose)

    const noseShine = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    )
    noseShine.position.set(-0.018, -0.048, 0.446)
    this.headGroup.add(noseShine)

    const smile = new THREE.Mesh(
      new THREE.SphereGeometry(0.020, 10, 6),
      this.toon(0xcc8888)
    )
    smile.scale.set(2.8, 0.42, 0.50)
    smile.position.set(0, -0.130, 0.355)
    this.headGroup.add(smile)


    for (const side of [-1, 1]) {
      const eyeG = new THREE.Group()
      eyeG.position.set(side * 0.138, 0.072, 0.252)

      const outline = new THREE.Mesh(
        new THREE.SphereGeometry(0.092, 22, 18),
        this.toon(0x0a0806)
      )
      outline.scale.set(1.0, 1.18, 0.62)
      eyeG.add(outline)

      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.078, 22, 18),
        this.glossy(0xf8f4ec, 60)
      )
      sclera.scale.set(1.0, 1.16, 0.64)
      sclera.position.z = 0.008
      eyeG.add(sclera)

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 18, 14),
        this.glossy(0x3a1a08, 150)
      )
      iris.scale.set(1.0, 1.14, 0.65)
      iris.position.z = 0.032
      eyeG.add(iris)

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 16, 12),
        new THREE.MeshPhongMaterial({ color: 0x060302, shininess: 600, specular: 0xffffff })
      )
      pupil.scale.set(1, 1.12, 0.64)
      pupil.position.z = 0.040
      eyeG.add(pupil)

      const shine1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      )
      shine1.position.set(side * -0.022, 0.030, 0.085)
      eyeG.add(shine1)

      const shine2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xddeeff })
      )
      shine2.scale.set(1.4, 0.8, 1.0)
      shine2.position.set(side * 0.012, -0.022, 0.083)
      eyeG.add(shine2)

      const lash = new THREE.Mesh(
        new THREE.SphereGeometry(0.080, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.28),
        this.toon(0x050302)
      )
      lash.scale.set(1.0, 1.0, 0.60)
      lash.position.z = 0.012
      eyeG.add(lash)

      this.headGroup.add(eyeG)
      if (side === -1) this.leftEyeGroup  = eyeG
      else             this.rightEyeGroup = eyeG
    }

    for (const side of [-1, 1]) {
      const earG = new THREE.Group()
      earG.position.set(side * 0.298, 0.235, -0.018)
      earG.rotation.z = side * 0.08
      earG.rotation.x = -0.06

      const eOut = new THREE.Mesh(
        new THREE.SphereGeometry(0.195, 26, 20),
        this.toon(FUR)
      )
      eOut.scale.set(1.0, 1.35, 0.26)
      eOut.castShadow = true
      earG.add(eOut)

      const eMid = new THREE.Mesh(
        new THREE.SphereGeometry(0.148, 22, 16),
        this.toon(EAR_MID)
      )
      eMid.scale.set(0.76, 1.10, 0.18)
      eMid.position.z = 0.025
      earG.add(eMid)

      const eDeep = new THREE.Mesh(
        new THREE.SphereGeometry(0.084, 16, 12),
        this.toon(EAR_DEEP)
      )
      eDeep.scale.set(0.65, 0.88, 0.12)
      eDeep.position.z = 0.038
      earG.add(eDeep)

      this.headGroup.add(earG)
    }

    const wMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee })
    for (const side of [-1, 1]) {
      for (let w = 0; w < 3; w++) {
        const wm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0030, 0.0008, 0.32, 4), wMat
        )
        wm.rotation.z = (side * Math.PI / 2) + (w - 1) * 0.20
        wm.rotation.x = (w - 1) * 0.08
        wm.position.set(side * 0.108, -0.090 + w * 0.024, 0.350)
        this.headGroup.add(wm)
      }
    }

    this.chefHat = new THREE.Group()
    const hM = this.toon(HAT_W)
    const bM = this.toon(HAT_BD)

    const hBand = new THREE.Mesh(new THREE.CylinderGeometry(0.250, 0.250, 0.060, 28), bM)
    hBand.position.y = 0.316
    this.chefHat.add(hBand)

    const hBot = new THREE.Mesh(new THREE.CylinderGeometry(0.222, 0.243, 0.096, 28), hM)
    hBot.position.y = 0.402
    this.chefHat.add(hBot)

    const hMid = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.222, 0.152, 28), hM)
    hMid.position.y = 0.530
    this.chefHat.add(hMid)

    const hDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), hM
    )
    hDome.position.y = 0.606
    this.chefHat.add(hDome)

    this.headGroup.add(this.chefHat)
    this.mesh.add(this.headGroup)

  
    const legDef = [
      { x: -0.210, z:  0.230, rotZ:  0.25, front: true  }, 
      { x:  0.210, z:  0.230, rotZ: -0.25, front: true  }, 
      { x: -0.195, z: -0.230, rotZ:  0.20, front: false }, 
      { x:  0.195, z: -0.230, rotZ: -0.20, front: false }, 
    ]

    for (const def of legDef) {
      const lg = new THREE.Group()
      lg.position.set(def.x, 0, def.z)

      const upperG = new THREE.Group()
      upperG.rotation.z = def.rotZ      
      upperG.rotation.x = def.front ? 0.15 : -0.15  

      const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.060, 0.100, 8, 12),
        this.toon(FUR_DK)
      )
      upper.position.y = -0.05
      upper.castShadow = true
      upperG.add(upper)

      const lowerG = new THREE.Group()
      lowerG.position.y = -0.115
      lowerG.rotation.z = -def.rotZ * 1.6  
      lowerG.rotation.x = 0.5              

      const lower = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.048, 0.105, 8, 12),
        this.toon(FUR_DK)
      )
      lower.position.y = -0.052
      lower.castShadow = true
      lowerG.add(lower)

      const pawG = new THREE.Group()
      pawG.position.y = -0.115
      pawG.rotation.x = -0.5  

      const paw = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 18, 14),
        this.toon(PAW_C)
      )
      paw.scale.set(1.10, 0.42, 1.40)
      paw.castShadow = true
      pawG.add(paw)

      for (let t = 0; t < 3; t++) {
        const toe = new THREE.Mesh(
          new THREE.SphereGeometry(0.020, 10, 8),
          this.toon(PAW_C)
        )
        toe.position.set((t - 1) * 0.040, 0, 0.058)
        pawG.add(toe)
      }

      lowerG.add(pawG)
      upperG.add(lowerG)
      lg.add(upperG)

      this.legs.push(lg)
      this.mesh.add(lg)
    }

    const tPts: THREE.Vector3[] = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      tPts.push(new THREE.Vector3(
        Math.sin(t * Math.PI * 2.2) * 0.24 * t,
        0.0 - t * 0.055,
        -0.32 - t * 0.58
      ))
    }
    this.tail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tPts), 28, 0.022, 8, false),
      this.toon(TAIL_C)
    )
    this.tail.castShadow = true


    this.mesh.add(this.tail)
    this.mesh.position.set(0, 0.5, 0)
    this.mesh.castShadow = true
  }

  private buildPhysics(): void {
    this.body = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Sphere(0.36),
      linearDamping: 0.9,
      angularDamping: 1.0,
    })
    this.body.position.set(0, 1, 0)
    this.body.fixedRotation = true
    this.physics.world.addBody(this.body)
  }

  private setupControls(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code)
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))
        e.preventDefault()
      if (e.code === 'Space' && this.state.isGrounded) this.jump()
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
  }

  private jump(): void {
    this.body.velocity.y = this.jumpForce
    this.state.isGrounded = false
    this.hatTiltTarget = 0.55
  }

  update(dt: number, cameraYaw: number): void {
    this.animTime += dt
    this.invincibleTimer -= dt
    if (this.invincibleTimer <= 0) this.state.isInvincible = false

    if (this.body.position.y <= 0.5) {
      this.state.isGrounded = true
      this.body.position.y = 0.5
      if (this.body.velocity.y < 0) this.body.velocity.y = 0
    } else {
      this.state.isGrounded = false
    }

    let dx = 0, dz = 0
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    dz -= 1
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  dz += 1
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  dx -= 1
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1

    const moving = dx !== 0 || dz !== 0
    this.state.isRunning = moving

    if (moving) {
      const cos = Math.cos(cameraYaw), sin = Math.sin(cameraYaw)
      const wx = dx * cos - dz * sin
      const wz = dx * sin + dz * cos
      const len = Math.sqrt(wx * wx + wz * wz)
      this.body.velocity.x = (wx / len) * this.moveSpeed
      this.body.velocity.z = (wz / len) * this.moveSpeed
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y, Math.atan2(wx, wz), 0.18
      )
    } else {
      this.body.velocity.x *= 0.7
      this.body.velocity.z *= 0.7
    }

    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y - 0.15,
      this.body.position.z
    )

    this.animLegs()
    this.animHat()
    this.animEyes()
    this.tail.rotation.y = Math.sin(this.animTime * 2.5) * 0.42
    this.tail.rotation.x = Math.sin(this.animTime * 1.8) * 0.10

    if (this.state.isInvincible) {
      this.blinkTimer += dt * 15
      this.mesh.visible = Math.sin(this.blinkTimer) > 0
    } else {
      this.mesh.visible = true
    }
  }

  private animLegs(): void {
    if (this.state.isRunning) {
      const t = this.animTime * 9
      const amp = 0.45
      this.legs[0].children[0].rotation.x =  Math.sin(t) * amp            
      this.legs[1].children[0].rotation.x =  Math.sin(t + Math.PI) * amp  
      this.legs[2].children[0].rotation.x =  Math.sin(t + Math.PI) * amp  
      this.legs[3].children[0].rotation.x =  Math.sin(t) * amp            
      this.bodyGroup.position.y = -0.05 + Math.sin(t * 2) * 0.015
      this.headGroup.position.y = 0.08 + Math.sin(t * 2 + 0.4) * 0.012
    } else {
      const b = Math.sin(this.animTime * 1.5) * 0.010
      this.bodyGroup.position.y = -0.05 + b * 0.5
      this.headGroup.position.y = 0.08 + b * 0.7
      for (const lg of this.legs)
        lg.children[0].rotation.x = THREE.MathUtils.lerp(lg.children[0].rotation.x as number, 0, 0.10)
    }
  }

  private animHat(): void {
    this.hatTilt = THREE.MathUtils.lerp(this.hatTilt, this.hatTiltTarget, 0.10)
    this.hatTiltTarget = THREE.MathUtils.lerp(this.hatTiltTarget, 0, 0.05)
    this.chefHat.rotation.z = this.hatTilt
    if (this.state.isRunning)
      this.chefHat.rotation.x = Math.sin(this.animTime * 9) * 0.020
  }

  private animEyes(): void {
    const phase = (this.animTime % 3.8) / 3.8
    const blink = phase > 0.93 ? Math.sin(((phase - 0.93) / 0.07) * Math.PI) : 0
    const sy = 1 - blink * 0.96
    this.leftEyeGroup.scale.y  = sy
    this.rightEyeGroup.scale.y = sy
  }

  takeDamage(): void {
    if (this.state.isInvincible) return
    this.state.lives--
    this.state.isInvincible = true
    this.invincibleTimer = 2.5
    this.hatTiltTarget = 1.5
    this.body.velocity.y = 5
    this.body.velocity.x += (Math.random() - 0.5) * 8
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone()
  }

  reset(): void {
    this.body.position.set(0, 1, 0)
    this.body.velocity.set(0, 0, 0)
    this.state.lives = 3
    this.state.isInvincible = false
  }
}
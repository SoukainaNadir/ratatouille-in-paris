import { GameEngine } from "./engine/GameEngine";
import { StoryBook } from "./scenes/StoryBook";


async function bootstrap() {
  const splashScreen = document.getElementById('splash-screen')
  const loading      = document.getElementById('loading')
  const canvas       = document.getElementById('game-canvas') as HTMLCanvasElement | null

  if (!canvas) { console.error('#game-canvas manquant'); return }
  if (!loading) { console.error('#loading manquant'); return }
  if (!splashScreen) { console.error('#splash-screen manquant'); return }

  const enginePromise = (async () => {
    const engine = new GameEngine(canvas)
    await engine.init()
    return engine
  })()

  splashScreen.addEventListener('click', async () => {
    const engine = await enginePromise

    engine.startMenuMusic()

    splashScreen.style.opacity = '0'
    splashScreen.style.transition = 'opacity 0.5s'
    loading.style.display = 'flex'

    setTimeout(() => { splashScreen.style.display = 'none' }, 500)

    setTimeout(() => {
      loading.style.opacity = '0'
      loading.style.transition = 'opacity 0.5s'

      setTimeout(() => {
        loading.style.display = 'none'

        new StoryBook(() => {
          engine.start()
        })

      }, 500)
    }, 2500)
  })
}

bootstrap().catch(console.error)
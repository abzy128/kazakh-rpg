import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const Game = lazy(() => import('#/game/Game'))

export const Route = createFileRoute('/play')({
  ssr: false,
  component: Play,
})

function Play() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-stone-950 text-stone-400">Loading the steppe…</div>}>
      <Game />
    </Suspense>
  )
}

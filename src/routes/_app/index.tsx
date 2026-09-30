import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Repositories</h1>
      <p className="text-muted-foreground">Repos you can access will show up here.</p>
    </div>
  )
}

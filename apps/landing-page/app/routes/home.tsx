import type { Route } from './+types/home';
import { Button } from '@debridgers/ui-web';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Debridgers - Landing Page' },
    { name: 'description', content: 'Welcome to Debridgers' },
    { property: 'og:title', content: 'Debridgers' }
  ];
}

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">
        Debridgers Landing Page
      </h1>

      <Button onClick={() => alert('SSR App Working!')}>
        Click Me
      </Button>
    </div>
  );
}
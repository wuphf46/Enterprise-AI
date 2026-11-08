import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '../components/ui/button';

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function PlaceholderPage({ eyebrow, title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <section className="animate-fade-in">
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={26} />
        </div>
        <h2 className="text-lg font-semibold">Ready for implementation</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">This workspace is set up for the next phase. Backend integrations will be connected here later.</p>
        <Button className="mt-6" variant="outline">Explore workspace <ArrowUpRight className="ml-2" size={15} /></Button>
      </div>
    </section>
  );
}

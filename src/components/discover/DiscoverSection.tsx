import { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

const DiscoverSection = ({ eyebrow, title, description, action, children }: Props) => {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/80">
              {eyebrow}
            </p>
          )}
          <h2 className="font-serif text-xl text-white sm:text-2xl">{title}</h2>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-white/70">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};

export default DiscoverSection;

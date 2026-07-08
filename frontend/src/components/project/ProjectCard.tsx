import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const tagList: string[] = (() => {
    try {
      return JSON.parse(project.tags || '[]');
    } catch {
      return [];
    }
  })();

  return (
    <article
      className="rounded-lg border border-outline-variant bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
    >
      {/* Cover image */}
      {project.coverImage ? (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img
            src={project.coverImage}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-video bg-surface-container flex items-center justify-center rounded-t-lg">
          <svg
            className="w-12 h-12 text-outline-variant"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
        </div>
      )}

      <div className="p-6">
        {/* Tags */}
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tagList.map((tag) => (
              <span
                key={tag}
                className="inline-block px-3 py-1 rounded-full bg-secondary-container text-secondary text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-primary mb-2 line-clamp-1">
          {project.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-on-surface-variant leading-relaxed mb-4 line-clamp-3">
          {project.description}
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 rounded bg-primary text-white text-xs font-medium transition-opacity hover:opacity-90"
            >
              访问网站 &rarr;
            </a>
          )}
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 rounded border border-outline text-on-surface-variant text-xs font-medium transition-colors hover:border-primary hover:text-primary"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

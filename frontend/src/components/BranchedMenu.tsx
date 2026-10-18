import { useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, type LucideIcon } from "lucide-react";
import "./BranchedMenu.css";

export interface BranchLink {
  label: string;
  path: string;
  icon: LucideIcon;
}
export interface BranchSection {
  label: string;
  children: BranchLink[];
}

// Adapted from the React Bits Branched Menu source supplied with this task.
// Router links preserve standard navigation and make the URL the selection source.
export function BranchedMenu({
  sections,
  onNavigate,
}: {
  sections: BranchSection[];
  onNavigate: () => void;
}) {
  const { pathname } = useLocation();
  const id = useId();
  // A new route reveals its navigation context, including Back/Forward and mobile links.
  const [folds, setFolds] = useState<Record<string, string | undefined>>({});
  const rowHeight = 40;
  const rowY = (index: number) => 6 + index * rowHeight + rowHeight / 2;
  const reach = (index: number) =>
    `M 10 0 V ${rowY(index) - 10} A 10 10 0 0 0 20 ${rowY(index)} H 26`;
  return (
    <nav className="branch-nav" aria-label="Workspace pages">
      {sections.map((section, index) => {
        const expanded = folds[section.label] !== pathname;
        const selected = section.children.some(
          (item) => item.path === pathname,
        );
        const panelId = `${id}-branch-${index}`;
        return (
          <section
            className="branch-section"
            key={section.label}
            data-active={selected || undefined}
          >
            <button
              type="button"
              className="branch-heading"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() =>
                setFolds((prev) => ({
                  ...prev,
                  [section.label]: expanded ? pathname : undefined,
                }))
              }
            >
              <span>{section.label}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <div
              className="branch-fold"
              data-open={expanded}
              id={panelId}
              inert={!expanded}
              aria-hidden={!expanded}
            >
              <div className="branch-fold-inner">
                <div className="branch-tree">
                  <svg
                    className="branch-lines"
                    width="32"
                    height={12 + section.children.length * rowHeight}
                    aria-hidden="true"
                  >
                    <path
                      className="branch-base"
                      d={`M 10 0 V ${rowY(section.children.length - 1) - 10}`}
                    />
                    {section.children.map((item, childIndex) => (
                      <path
                        key={item.path}
                        className="branch-base"
                        d={`M 10 ${rowY(childIndex) - 10} A 10 10 0 0 0 20 ${rowY(childIndex)} H 26`}
                      />
                    ))}
                    {section.children.map((item, childIndex) => (
                      <path
                        key={item.path}
                        className="branch-reach"
                        d={reach(childIndex)}
                        pathLength={1}
                        strokeDasharray={1}
                        strokeDashoffset={pathname === item.path ? 0 : 1}
                      />
                    ))}
                  </svg>
                  {section.children.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `branch-link${isActive ? " is-active" : ""}`
                      }
                      tabIndex={expanded ? 0 : -1}
                    >
                      <item.icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </nav>
  );
}

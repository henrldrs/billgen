import type { ReactNode } from 'react';
import { TimelineEvent } from '../../types';
import { Badge } from './Badge';

export interface StatusTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function StatusTimeline({ events, className }: StatusTimelineProps) {
  const classes = ['bg-status-timeline', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {events.map((evt, i) => (
        <div key={evt.id || i} className="bg-status-timeline__item">
          <div className="bg-status-timeline__marker">
            <span className={`bg-status-timeline__dot bg-status-timeline__dot--${evt.status}`} />
            {i < events.length - 1 ? <span className="bg-status-timeline__line" /> : null}
          </div>
          <div className="bg-status-timeline__content">
            <div className="bg-status-timeline__header">
              <span className="bg-status-timeline__label">{evt.label}</span>
              <span className="bg-status-timeline__time bg-num">{evt.timestamp}</span>
            </div>
            {evt.description ? (
              <p className="bg-status-timeline__desc">{evt.description}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

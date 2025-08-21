import React from 'react';
import { Gantt, Task } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

interface FlightGanttItem {
  id: string;
  name: string;
  start: Date;
  end: Date;
  type: 'task';
  progress: number;
  styles?: { progressColor: string; progressSelectedColor: string };
}

interface FlightsGanttProps {
  items: FlightGanttItem[];
  from: Date;
  to: Date;
}

const FlightsGantt: React.FC<FlightsGanttProps> = ({ items, from, to }) => {
  if (!items || items.length === 0) {
    return <div className="text-muted-foreground text-sm">No flights to display in timeline.</div>;
  }

  return (
    <div style={{ overflowX: 'auto', padding: '1rem', background: 'white', borderRadius: '8px' }}>
      <Gantt
        tasks={items as Task[]}
        viewMode="Week"
        locale="en-GB"
        start={from}
        end={to}
      />
    </div>
  );
};

export default FlightsGantt;

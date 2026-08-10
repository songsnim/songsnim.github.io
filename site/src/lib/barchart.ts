import type { Day } from './goatcounter';

/**
 * Visitors per day, as bars. They are HTML rather than SVG on purpose: an SVG
 * sized to the container has to be stretched, and a stretched viewBox smears the
 * rounded data-ends into ovals. Divs take the container's width honestly.
 */

/** Beyond this many bars the columns fall below a usable width, so days are grouped into weeks. */
const MAX_BARS = 120;

interface Bar {
  label: string;
  count: number;
}

/** Groups days into runs of seven, labelled by the day the run starts. */
function weekly(days: Day[]): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    out.push({
      label: `${week[0].day} 주`,
      count: week.reduce((sum, d) => sum + d.count, 0),
    });
  }
  return out;
}

/** Reports which grouping it settled on, so the caption can say what a bar means. */
export function draw(host: HTMLElement, days: Day[]): 'day' | 'week' {
  const grouped = days.length > MAX_BARS;
  const bars = grouped ? weekly(days) : days.map((d) => ({ label: d.day, count: d.count }));
  // A flat run of zeroes would divide by zero; one is also the right floor for a
  // day with a single visit, which should not fill the plot.
  const peak = Math.max(1, ...bars.map((b) => b.count));

  host.replaceChildren();
  host.style.setProperty('--peak', String(peak));

  for (const bar of bars) {
    const col = document.createElement('div');
    col.className = 'plot__col';
    // The whole column is the hover target, not just the drawn part of it — a day
    // with one visitor is a two-pixel sliver and would be unhittable otherwise.
    col.tabIndex = 0;
    col.setAttribute('role', 'listitem');
    col.setAttribute('aria-label', `${bar.label}: ${bar.count}`);
    col.dataset.label = bar.label;
    col.dataset.count = String(bar.count);

    const fill = document.createElement('div');
    fill.className = 'plot__bar';
    // Zero stays visibly zero; everything else keeps at least a sliver so a quiet
    // day is distinguishable from no day at all.
    fill.style.height = bar.count ? `max(2px, ${(bar.count / peak) * 100}%)` : '0';
    col.append(fill);
    host.append(col);
  }

  host.setAttribute('role', 'list');
  host.dataset.peak = String(peak);
  return grouped ? 'week' : 'day';
}

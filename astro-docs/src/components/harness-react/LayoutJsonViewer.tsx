import './LayoutJsonViewer.css';

/**
 * React port of the Vue harness's own LayoutJsonViewer.vue — compact
 * "current layout state" readout showing live x/y/w/h for every item.
 */
export interface ILayoutJsonViewerProps {
  layout: { i: string | number; x: number; y: number; w: number; h: number }[];
  label?: string;
}

export default function LayoutJsonViewer({ layout, label }: ILayoutJsonViewerProps) {
  return (
    <div className="layout-json">
      {label ? <p className="layout-json__label">{label}</p> : null}
      <div className="layout-json__grid">
        {layout.map((item) => (
          <div className="layout-json__item" key={item.i}>
            <strong>{item.i}</strong>
            <span className="layout-json__coords">x:{item.x} y:{item.y} w:{item.w} h:{item.h}</span>
          </div>
        ))}
        {layout.length === 0 ? <p className="layout-json__empty">empty</p> : null}
      </div>
    </div>
  );
}

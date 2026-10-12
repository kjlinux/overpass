import type { ComponentChildren, JSX } from "preact";
import { cx } from "./cx";

export type Column<Row> = {
  key: string;
  header: string;
  numeric?: boolean;
  render: (row: Row) => ComponentChildren;
};

export type TableProps<Row> = {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
};

const headClass =
  "whitespace-nowrap border-b border-rule bg-surface px-2 py-3 text-left text-caption font-medium text-ink-2";

/** A ruled table that scrolls inside its container under narrow widths. */
export function Table<Row>({ caption, columns, rows, rowKey }: TableProps<Row>): JSX.Element {
  return (
    <div class="overflow-x-auto border-y border-rule">
      <table class="w-full border-collapse">
        <caption class="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                class={cx(headClass, column.numeric === true && "text-right tabular-nums")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} class="border-b border-rule last:border-b-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  class={cx(
                    "h-12 px-2 py-2 align-middle",
                    column.numeric === true && "text-right tabular-nums",
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaCog } from 'react-icons/fa';
import ActionMenu from './ActionMenu';

function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function resolveRowKey(row, rowKey, index) {
  if (typeof rowKey === 'function') return rowKey(row, index);
  if (row && rowKey in row) return row[rowKey];
  return index;
}

function getTextContent(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!React.isValidElement(node)) return '';
  return React.Children.toArray(node.props.children).map(getTextContent).join(' ').trim();
}

function collectRows(children) {
  const rows = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === 'tr') {
      rows.push(child);
    } else if (child.type === React.Fragment) {
      rows.push(...collectRows(child.props.children));
    }
  });
  return rows;
}

function NativeTableCards({ children }) {
  const table = React.Children.toArray(children).find((child) => React.isValidElement(child) && child.type === 'table');
  if (!table) return children;

  const sections = React.Children.toArray(table.props.children);
  const header = sections.find((section) => React.isValidElement(section) && section.type === 'thead');
  const body = sections.find((section) => React.isValidElement(section) && section.type === 'tbody');
  const headerRow = header && collectRows(header.props.children)[0];
  const headerCells = headerRow
    ? React.Children.toArray(headerRow.props.children).filter((cell) => React.isValidElement(cell) && cell.type === 'th')
    : [];
  const rows = body ? collectRows(body.props.children) : [];
  const actionColumnIndex = headerCells.findIndex((cell) => /^(action|actions)$/i.test(getTextContent(cell.props.children)));

  return (
    <>
      <div className="space-y-3 p-2 md:hidden">
        {rows.map((row, rowIndex) => {
          const cells = React.Children.toArray(row.props.children).filter((cell) => React.isValidElement(cell) && cell.type === 'td');
          if (!cells.length) return null;

          const primaryCell = cells[0];
          const actionCell = actionColumnIndex >= 0 ? cells[actionColumnIndex] : null;
          const detailCells = cells.filter((_, index) => index !== 0 && index !== actionColumnIndex);

          return (
            <article
              key={row.key || rowIndex}
              onClick={row.props.onClick}
              onContextMenu={row.props.onContextMenu}
              className="rounded-xl border border-gray-200 bg-white p-3 text-gray-800 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">{primaryCell.props.children}</div>
                {actionCell && <div className="shrink-0">{actionCell.props.children}</div>}
              </div>
              {detailCells.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  {detailCells.map((cell) => {
                    const index = cells.indexOf(cell);
                    const label = headerCells[index] ? getTextContent(headerCells[index].props.children) : `Detail ${index}`;
                    return (
                      <div key={cell.key || index} className="min-w-0">
                        <dt className="mb-0.5 text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</dt>
                        <dd className="break-words text-xs">{cell.props.children}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">{table}</div>
    </>
  );
}

export default function ManagementTable({
  children,
  rows = [],
  columns = [],
  rowKey = 'id',
  actions,
  getActions,
  activeId,
  onToggleAction,
  onRowClick,
  emptyState,
  className = '',
  tableClassName = '',
  containerClassName = '',
  headerClassName = '',
  bodyClassName = '',
  rowClassName = '',
  cellClassName = '',
  accent = 'slate',
  compact = false,
  showHeader = true,
  showActionsColumn = true,
  actionsHeader = <FaCog className="ml-auto h-4 w-4" />,
  actionsClassName = '',
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1024);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const allVisibleColumns = columns.filter((column) => column.visible !== false);

  const actionWidth = showActionsColumn && (actions || getActions) ? 56 : 0;
  const availableWidth = Math.max(0, containerWidth - 24 - actionWidth);
  let usedWidth = 0;
  const visibleColumnKeys = new Set();
  const orderedColumns = allVisibleColumns
    .map((column, index) => ({ column, index }))
    .sort((left, right) => (left.column.responsivePriority ?? left.index) - (right.column.responsivePriority ?? right.index));

  orderedColumns.forEach(({ column, index }) => {
    const minWidth = column.responsiveMinWidth ?? (index === 0 ? 150 : 120);
    if (index === 0 || usedWidth + minWidth <= availableWidth) {
      visibleColumnKeys.add(column.key);
      usedWidth += minWidth;
    }
  });

  const visibleColumns = allVisibleColumns.filter((column) => visibleColumnKeys.has(column.key));
  const densityClasses = compact
    ? 'px-2 py-2 sm:px-3 sm:py-3'
    : 'px-2 py-2 sm:px-3 sm:py-3 lg:px-6 lg:py-4';
  const cardAccentMap = {
    slate: 'border-gray-200/50 dark:border-gray-700/50 shadow-gray-200/50 dark:shadow-none',
    blue: 'border-blue-200/50 dark:border-blue-900/50 shadow-blue-100/50 dark:shadow-none',
    green: 'border-green-200/50 dark:border-green-900/50 shadow-green-100/50 dark:shadow-none',
    emerald: 'border-emerald-200/50 dark:border-emerald-900/50 shadow-emerald-100/50 dark:shadow-none',
    indigo: 'border-indigo-200/50 dark:border-indigo-900/50 shadow-indigo-100/50 dark:shadow-none',
    violet: 'border-violet-200/50 dark:border-violet-900/50 shadow-violet-100/50 dark:shadow-none',
    amber: 'border-amber-200/50 dark:border-amber-900/50 shadow-amber-100/50 dark:shadow-none',
    rose: 'border-rose-200/50 dark:border-rose-900/50 shadow-rose-100/50 dark:shadow-none',
  };
  const cardClass = cardAccentMap[accent] || cardAccentMap.slate;

  const handleContextMenu = (e, row, index) => {
    const rowActions = typeof getActions === 'function' ? getActions(row, index) : actions;
    if (!rowActions || (Array.isArray(rowActions) && !rowActions.length)) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ actions: rowActions, x: e.clientX, y: e.clientY, key: `ctx-${resolveRowKey(row, rowKey, index)}` });
  };

  if (children) {
    return <NativeTableCards>{children}</NativeTableCards>;
  }

  if (!rows.length) {
    return emptyState || null;
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className={joinClasses('overflow-hidden rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border w-full', cardClass, containerClassName, className)}
    >
      <div className={joinClasses('w-full', tableClassName)}>
        <div className="space-y-3 p-3 md:hidden">
          {rows.map((row, index) => {
            const key = resolveRowKey(row, rowKey, index);
            const rowActions = typeof getActions === 'function' ? getActions(row, index) : actions;
            const hasRowActions = Array.isArray(rowActions) ? rowActions.length > 0 : Boolean(rowActions);
            const primaryColumn = allVisibleColumns[0];
            const mobileColumns = allVisibleColumns.slice(1).filter((column) => column.mobile !== false);
            const rowId = `row-${String(key)}`;
            const primaryContent = primaryColumn
              ? (typeof primaryColumn.render === 'function' ? primaryColumn.render(row, index) : row?.[primaryColumn.key])
              : null;

            return (
              <div
                key={`mobile-${key}`}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                onContextMenu={(actions || getActions) ? (event) => handleContextMenu(event, row, index) : undefined}
                className={joinClasses(
                  'rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900',
                  onRowClick && 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-gray-800'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 text-sm">{primaryContent}</div>
                  {showActionsColumn && (actions || getActions) && hasRowActions && (
                    <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
                      <ActionMenu
                        menuId={`mobile-${rowId}`}
                        activeId={activeId}
                        onToggle={onToggleAction}
                        actions={rowActions}
                      />
                    </div>
                  )}
                </div>
                {mobileColumns.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    {mobileColumns.map((column) => {
                      const content = typeof column.render === 'function'
                        ? column.render(row, index)
                        : row?.[column.key];

                      return (
                        <div key={column.key} className={joinClasses('min-w-0 text-xs', column.mobileClassName)}>
                          <div className="mb-0.5 text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">{column.label}</div>
                          <div className="break-words text-gray-700 dark:text-gray-200">{content}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden md:block">
          <table className="w-full table-fixed text-left text-sm text-gray-700 dark:text-gray-300">
          {showHeader && (
            <thead className={joinClasses('hidden sm:table-header-group bg-gradient-to-r from-gray-100/90 to-gray-200/70 dark:from-gray-700/50 dark:to-gray-800/50 text-xs uppercase text-gray-600 dark:text-gray-400', headerClassName)}>
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={joinClasses(densityClasses, 'font-semibold text-left whitespace-nowrap', column.headerClassName)}
                  >
                    {column.label}
                  </th>
                ))}
                {showActionsColumn && (actions || getActions) && (
                  <th className={joinClasses(densityClasses, 'w-16 text-center', actionsClassName)}>
                    <div className="flex items-center justify-center">
                      {actionsHeader}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
          )}

          <tbody className={joinClasses('divide-y divide-gray-200/70 dark:divide-gray-700/50', bodyClassName)}>
            {rows.map((row, index) => {
              const key = resolveRowKey(row, rowKey, index);
              const rowActions = typeof getActions === 'function' ? getActions(row, index) : actions;
              const hasRowActions = Array.isArray(rowActions) ? rowActions.length > 0 : Boolean(rowActions);
              const rowId = `row-${String(key)}`;
              const resolvedRowClassName = typeof rowClassName === 'function'
                ? rowClassName(row, index)
                : rowClassName;

              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                  onContextMenu={(actions || getActions) ? (e) => handleContextMenu(e, row, index) : undefined}
                  className={joinClasses(
                    'align-middle text-left transition-all duration-200',
                    onRowClick && 'cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-gray-700/50',
                    resolvedRowClassName
                  )}
                >
                  {visibleColumns.map((column) => {
                    const content = typeof column.render === 'function'
                      ? column.render(row, index)
                      : row?.[column.key];

                    return (
                      <td
                        key={column.key}
                        className={joinClasses(
                          densityClasses,
                          'max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]',
                          column.className,
                          cellClassName
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}

                  {showActionsColumn && (actions || getActions) && (
                    <td className={joinClasses(densityClasses, 'w-16 text-center', actionsClassName)} onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        {hasRowActions && (
                          <ActionMenu
                            menuId={rowId}
                            activeId={activeId}
                            onToggle={onToggleAction}
                            actions={rowActions}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {contextMenu && (
        <ActionMenu
          menuId={contextMenu.key}
          activeId={contextMenu.key}
          onToggle={() => setContextMenu(null)}
          actions={contextMenu.actions}
          anchorCoords={{ x: contextMenu.x, y: contextMenu.y }}
        />
      )}
    </motion.div>
  );
}

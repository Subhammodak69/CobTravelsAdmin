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

export default function ManagementTable({
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

  const getResponsiveColumns = () => {
    let maxCols = allVisibleColumns.length;
    if (containerWidth < 340) maxCols = 1;
    else if (containerWidth < 480) maxCols = 2;
    else if (containerWidth < 640) maxCols = 3;
    else if (containerWidth < 768) maxCols = 4;
    else if (containerWidth < 1024) maxCols = 5;
    else if (containerWidth < 1280) maxCols = 6;

    return allVisibleColumns.slice(0, maxCols);
  };

  const visibleColumns = getResponsiveColumns();
  const densityClasses = compact ? 'px-3 py-3' : 'px-4 lg:px-6 py-4';
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

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FaEllipsisV } from 'react-icons/fa';

const MENU_WIDTH = 192;
const EDGE_PADDING = 8;

const ActionMenu = ({ actions = [], activeId, onToggle, menuId, trigger, anchorCoords }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: -9999, left: -9999 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const isMenuOpen = activeId !== undefined ? activeId === menuId : isOpen;

  const closeMenu = useCallback(() => {
    if (onToggle) { onToggle(null, null); } else { setIsOpen(false); }
  }, [onToggle]);

  const calcPosition = useCallback(() => {
    const measuredH = menuRef.current?.offsetHeight || 200;
    let anchorTop, anchorBottom, left;

    if (anchorCoords) {
      anchorTop = anchorCoords.y;
      anchorBottom = anchorCoords.y;
      left = anchorCoords.x;
    } else if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      anchorTop = rect.top;
      anchorBottom = rect.bottom;
      left = rect.right - MENU_WIDTH;
    } else {
      return;
    }

    let top = anchorBottom + 4;
    if (left < EDGE_PADDING) left = EDGE_PADDING;
    if (left + MENU_WIDTH > window.innerWidth - EDGE_PADDING) left = window.innerWidth - MENU_WIDTH - EDGE_PADDING;
    if (top + measuredH > window.innerHeight - EDGE_PADDING) top = anchorTop - measuredH - 4;
    if (top < EDGE_PADDING) top = EDGE_PADDING;

    setMenuPos({ top, left });
  }, [anchorCoords]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (onToggle) { onToggle(e, menuId); } else { setIsOpen((prev) => !prev); }
  };

  useLayoutEffect(() => {
    if (!isMenuOpen) return;
    calcPosition();
    const frame = requestAnimationFrame(calcPosition);
    return () => cancelAnimationFrame(frame);
  }, [isMenuOpen, calcPosition]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        (!triggerRef.current || !triggerRef.current.contains(e.target))
      ) { closeMenu(); }
    };
    const handleScroll = () => {
      if (anchorCoords) { closeMenu(); return; }
      calcPosition();
    };
    const handleEscape = (e) => { if (e.key === 'Escape') closeMenu(); };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isMenuOpen, calcPosition, closeMenu, anchorCoords]);

  const menuPortal = isMenuOpen ? createPortal(
    <motion.div
      ref={menuRef}
      key={`action-menu-${String(menuId ?? 'default')}`}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: `${menuPos.top}px`,
        left: `${menuPos.left}px`,
        zIndex: 9999,
        width: `${MENU_WIDTH}px`,
      }}
      className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1.5 shadow-xl shadow-slate-200/70 dark:shadow-gray-950/60 backdrop-blur-xl ring-1 ring-slate-900/5 dark:ring-white/10"
    >
      {actions.map((action, index) => (
        <button
          key={index}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!action.disabled) { action.onClick(); closeMenu(); }
          }}
          disabled={action.disabled}
          title={action.title || ''}
          className={`
            flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold
            transition-all duration-150
            ${action.disabled
              ? 'cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500'
              : `hover:bg-slate-100 dark:hover:bg-gray-800 hover:pl-4 ${action.className || 'text-slate-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-300'}`
            }
          `}
        >
          {action.icon && <span className="flex-shrink-0 opacity-80">{action.icon}</span>}
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </motion.div>,
    document.body
  ) : null;

  if (anchorCoords) {
    return menuPortal;
  }

  return (
    <div className="relative inline-block text-left">
      <div ref={triggerRef} onClick={toggleMenu} className="cursor-pointer">
        {trigger || (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-gray-700
                       bg-white text-slate-500 dark:bg-gray-900 dark:text-gray-400 transition-all hover:border-indigo-300 dark:hover:border-indigo-600
                       hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 hover:shadow-sm active:scale-95"
          >
            <FaEllipsisV size={14} />
          </button>
        )}
      </div>
      {menuPortal}
    </div>
  );
};

export default ActionMenu;

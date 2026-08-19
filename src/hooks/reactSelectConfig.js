export const getReactSelectStyles = (theme = 'light') => {
  const isDark = theme === 'dark';
  const colors = {
    controlBg: isDark ? '#111827' : '#f9fafb',
    controlBorder: isDark ? '#374151' : '#e5e7eb',
    controlBorderHover: isDark ? '#4b5563' : '#cbd5e1',
    controlText: isDark ? '#f3f4f6' : '#111827',
    placeholder: isDark ? '#9ca3af' : '#64748b',
    menuBg: isDark ? '#111827' : '#ffffff',
    menuBorder: isDark ? '#374151' : '#e5e7eb',
    optionText: isDark ? '#e5e7eb' : '#334155',
    optionFocused: isDark ? '#1f2937' : '#eef2ff',
    optionSelected: isDark ? '#4338ca' : '#4f46e5',
    multiBg: isDark ? '#1f2937' : '#eef2ff',
    multiText: isDark ? '#c7d2fe' : '#3730a3',
  };

  return {
  control: (provided, state) => {
    return {
      ...provided,
      backgroundColor: colors.controlBg,
      borderColor: state.isFocused ? '#6366f1' : colors.controlBorder,
      borderRadius: '0.5rem',
      boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.12)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#6366f1' : colors.controlBorderHover,
      },
      minHeight: '42px',
      fontSize: '0.875rem',
      transition: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
    };
  },
  option: (provided, state) => {
    return {
      ...provided,
      backgroundColor: state.isSelected 
        ? colors.optionSelected
        : state.isFocused 
          ? colors.optionFocused
          : colors.menuBg,
      color: state.isSelected ? '#ffffff' : colors.optionText,
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: state.isSelected ? 600 : 500,
      '&:active': {
        backgroundColor: state.isSelected ? colors.optionSelected : colors.optionFocused,
      }
    };
  },
  menu: (provided) => {
    return {
      ...provided,
      backgroundColor: colors.menuBg,
      borderRadius: '0.5rem',
      boxShadow: isDark
        ? '0 18px 40px rgba(0, 0, 0, 0.45)'
        : '0 18px 40px rgba(15, 23, 42, 0.14)',
      zIndex: 9999,
      border: `1px solid ${colors.menuBorder}`,
      overflow: 'hidden',
    };
  },
  menuPortal: base => ({ ...base, zIndex: 9999 }),
  singleValue: (provided) => {
    return {
      ...provided,
      color: colors.controlText,
      fontSize: '0.875rem'
    };
  },
  input: (provided) => ({
    ...provided,
    color: colors.controlText,
  }),
  placeholder: (provided) => ({
    ...provided,
    color: colors.placeholder,
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: colors.multiBg,
    borderRadius: '0.5rem',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: colors.multiText,
    fontWeight: 600,
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '2px 10px'
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  dropdownIndicator: (provided) => {
    return {
      ...provided,
      color: colors.placeholder,
      padding: '4px 8px',
      '&:hover': {
        color: isDark ? '#d1d5db' : '#475569',
      }
    };
  },
  clearIndicator: (provided) => {
    return {
      ...provided,
      color: colors.placeholder,
      padding: '4px 8px',
      '&:hover': {
        color: isDark ? '#f3f4f6' : '#334155',
      }
    };
  }
};
};

export const reactSelectStyles = getReactSelectStyles();

export const getReactSelectMenuProps = () => ({
  menuPortalTarget: typeof document !== 'undefined' ? document.body : null,
  menuPosition: "fixed",
  menuPlacement: "auto",
});

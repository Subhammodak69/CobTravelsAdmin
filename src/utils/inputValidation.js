export const sanitizeNumericInput = (value) => String(value).replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

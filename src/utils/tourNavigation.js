export const getPackageVariantsPath = (packageId) => {
  if (!packageId) return '/tour-packages';
  return `/tour-packages/${encodeURIComponent(packageId)}/variants`;
};

export const getVariantDetailsPath = (packageId, variantId) => {
  if (!packageId && !variantId) return '/tour-packages';
  const basePath = getPackageVariantsPath(packageId || '');
  if (!variantId) return basePath;
  return `${basePath}/${encodeURIComponent(variantId)}/details`;
};

// Adds the permission the in-app updater needs (installing the downloaded .apk) without touching app.json.
module.exports = ({ config }) => {
  const perms = (config.android && config.android.permissions) || [];
  return { ...config, android: { ...(config.android || {}), permissions: perms.includes('android.permission.REQUEST_INSTALL_PACKAGES') || perms.includes('REQUEST_INSTALL_PACKAGES') ? perms : [...perms, 'REQUEST_INSTALL_PACKAGES'] } };
};

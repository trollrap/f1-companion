// Two things are added here so app.json never has to be touched:
// 1. the permission the in-app updater needs (installing the downloaded .apk);
// 2. runtimeVersion, worked out automatically. It is a short fingerprint of the installed packages and the permissions, so it only changes when
//    a package is added, removed or upgraded (which may need a new native build). Changing app code, screens or data never changes it, so those
//    updates reach every installed APK over the air, and an APK is never sent code that needs native parts it does not have.
const crypto = require('crypto');
module.exports = ({ config }) => {
  const perms = (config.android && config.android.permissions) || [];
  const permissions = perms.includes('android.permission.REQUEST_INSTALL_PACKAGES') || perms.includes('REQUEST_INSTALL_PACKAGES') ? perms : [...perms, 'REQUEST_INSTALL_PACKAGES'];
  const deps = require('./package.json').dependencies || {};
  const fp = JSON.stringify([Object.keys(deps).sort().map((k) => [k, deps[k]]), [...permissions].sort(), (config.plugins || []).map((p) => (Array.isArray(p) ? p[0] : p)).sort()]);
  const runtimeVersion = crypto.createHash('sha1').update(fp).digest('hex').slice(0, 10);
  // Updates are never downloaded or applied behind your back: the app only looks when you open Settings or the banner, and installs when you tap it.
  return { ...config, runtimeVersion, updates: { ...(config.updates || {}), checkAutomatically: 'NEVER' }, android: { ...(config.android || {}), permissions } };
};

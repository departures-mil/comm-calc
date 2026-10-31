// electron-builder afterPack: Windows exe'ye simge ve sürüm bilgisi yazar (wine olmadan)
const path = require('path');
const { execFileSync } = require('child_process');
exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const info = ctx.packager.appInfo;
  const exe = path.join(ctx.appOutDir, info.productFilename + '.exe');
  const ico = path.join(ctx.packager.projectDir, ctx.packager.config.win.icon);
  execFileSync(process.execPath, [path.join(__dirname, 'set-exe-icon.mjs'), exe, ico, info.productName, info.version, info.description || info.productName], { stdio: 'inherit' });
};

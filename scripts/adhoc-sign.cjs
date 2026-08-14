const { execFileSync } = require("node:child_process");
const path = require("node:path");

/**
 * Ad-hoc signs the macOS app after packaging.
 *
 * Without this the bundle ships carrying Electron's own linker signature, which covers the
 * original binary and not the resources we add. `codesign --verify` rejects it with "code has
 * no resources but signature indicates they must be present", and once a download has been
 * quarantined macOS reports the app as **damaged** and refuses to open it at all — right-click
 * → Open doesn't help, because the problem isn't a missing developer identity, it's a
 * signature that fails to validate.
 *
 * An ad-hoc signature costs nothing and needs no certificate. It doesn't make the app trusted
 * — the first launch is still right-click → Open — but it makes it *valid*, which is the
 * difference between "unidentified developer" and "damaged".
 */
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  // --deep is the wrong tool for real distribution signing, but it is the right one here:
  // every nested binary needs the same ad-hoc signature for validation to succeed.
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], {
    stdio: "inherit",
  });
  execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], {
    stdio: "inherit",
  });

  console.log(`  • ad-hoc signed and verified  ${path.basename(appPath)}`);
};

{ pkgs, craneLib, ... }:
let
  src = craneLib.cleanCargoSource ../backend;

  commonArgs = {
    inherit src;
    strictDeps = true;
  };

  cargoArtifacts = craneLib.buildDepsOnly commonArgs;

  lshop-backend = craneLib.buildPackage (commonArgs // { inherit cargoArtifacts; });
in
{
  package = lshop-backend;

  checks = {
    # Note: We don't include package here as a check. This is done in the flake.

    clippy = craneLib.cargoClippy (
      commonArgs
      // {
        inherit cargoArtifacts;
        cargoClippyExtraArgs = "--all-features";
      }
    );

    # Check formatting
    better-api-fmt = craneLib.cargoFmt {
      inherit src;
    };

    better-api-toml-fmt = craneLib.taploFmt {
      src = pkgs.lib.sources.sourceFilesBySuffices src [ ".toml" ];
    };
  };
}

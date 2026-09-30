{ lib, ... }:
{
  perSystem =
    { pkgs, craneLib, ... }:
    let
      src = lib.fileset.toSource {
        root = ../backend;
        fileset = lib.fileset.unions [
          (craneLib.fileset.commonCargoSources ../backend)
          ../backend/migrations
        ];
      };

      commonArgs = {
        inherit src;
        strictDeps = true;
      };

      cargoArtifacts = craneLib.buildDepsOnly commonArgs;

      lshop-backend = craneLib.buildPackage (commonArgs // { inherit cargoArtifacts; });
    in
    {
      packages.backend = lshop-backend;

      checks = {
        backend = lshop-backend;

        backend-clippy = craneLib.cargoClippy (
          commonArgs
          // {
            inherit cargoArtifacts;
            cargoClippyExtraArgs = "--all-features";
          }
        );

        # Check formatting
        backend-fmt = craneLib.cargoFmt {
          inherit src;
        };

        backend-toml-fmt = craneLib.taploFmt {
          src = pkgs.lib.sources.sourceFilesBySuffices src [ ".toml" ];
        };
      };
    };
}

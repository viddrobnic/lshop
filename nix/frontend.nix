{ ... }:
{
  perSystem =
    { config, pkgs, ... }:
    let
      src = ../frontend;

      nodejs = pkgs.nodejs_26;
      npmDeps = pkgs.fetchNpmDeps {
        inherit src;
        hash = "sha256-sssEBY7Aw101j3RBBxOI0IAC+60OeB+UKPqF3Vg3qvI=";
      };
      commonArgs = {
        version = "0.1.0";
        inherit src nodejs npmDeps;
      };

      mkNpmCheck =
        { name, script }:
        pkgs.buildNpmPackage (
          commonArgs
          // {
            pname = name;

            dontNpmBuild = true;

            doCheck = true;
            checkPhase = ''
              runHook preCheck
              npm run ${script}
              runHook postCheck
            '';
          }
        );

    in
    {
      packages.frontend = pkgs.buildNpmPackage (
        commonArgs
        // {
          name = "lshop-frontend";

          npmBuildScript = "build";

          nativeBuildInputs = with pkgs; [
            coreutils
            findutils
          ];

          installPhase = ''
            runHook preInstall

            mkdir -p $out
            cp -r dist/* $out/

            # Generate content-based ETag sidecar files for Caddy.
            find $out -type f \
              ! -name '*.etag' \
              ! -name '*.br' \
              ! -name '*.gz' \
              ! -name '*.zst' \
              -print0 |
            while IFS= read -r -d ''' file; do
              hash="$(sha256sum "$file" | cut -d' ' -f1)"
              printf '"%s"\n' "$hash" > "$file.etag"
            done

            runHook postInstall
          '';
        }
      );

      checks = {
        frontend = config.packages.frontend;

        frontend-lint = mkNpmCheck {
          name = "lint";
          script = "lint";
        };

        frontend-prettier = mkNpmCheck {
          name = "prettier";
          script = "prettier:check";
        };

        frontend-check = mkNpmCheck {
          name = "tsc";
          script = "tsc";
        };
      };
    };
}

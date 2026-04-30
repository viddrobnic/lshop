{ pkgs, ... }:
let
  src = ../frontend;

  mkNpmCheck =
    { name, script }:
    pkgs.buildNpmPackage {
      inherit src;
      pname = name;
      version = "0.1.0";

      npmDeps = pkgs.importNpmLock { npmRoot = src; };
      npmConfigHook = pkgs.importNpmLock.npmConfigHook;
      npmFlags = [ "--legacy-peer-deps" ];

      dontNpmBuild = true;

      doCheck = true;
      checkPhase = ''
        runHook preCheck
        npm run ${script}
        runHook postCheck
      '';
    };

in
{
  package = pkgs.buildNpmPackage {
    inherit src;
    name = "lshop-frontend";
    version = "0.1.0";

    npmDeps = pkgs.importNpmLock { npmRoot = src; };
    npmConfigHook = pkgs.importNpmLock.npmConfigHook;
    npmFlags = [ "--legacy-peer-deps" ];

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
  };

  checks = {
    # Note: We don't include package here as a check. This is done in the flake.

    lint = mkNpmCheck {
      name = "lint";
      script = "lint";
    };

    prettier = mkNpmCheck {
      name = "prettier";
      script = "prettier:check";
    };

    check = mkNpmCheck {
      name = "tsc";
      script = "tsc";
    };

  };
}

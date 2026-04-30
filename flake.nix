{
  description = "Self hosted tool for managing and sharing a shopping list across the whole family.";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

    crane.url = "github:ipetkov/crane";

    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    inputs@{
      nixpkgs,
      flake-utils,
      rust-overlay,
      crane,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };

        craneLib = (crane.mkLib pkgs).overrideToolchain (
          p:
          p.rust-bin.stable.latest.default.override {
            extensions = [
              "rust-src"
              "rust-analyzer"
              "llvm-tools"
            ];
          }
        );

        args = inputs // {
          inherit pkgs system craneLib;
        };

        backend = import ./nix/backend.nix args;
        frontend = import ./nix/frontend.nix args;
      in
      {
        packages = {
          backend = backend.package;
          frontend = frontend.package;
        };

        checks = {
          backend = backend.package;
          frontend = frontend.package;
        }
        // pkgs.lib.mapAttrs' (name: value: {
          name = "backend-${name}";
          value = value;
        }) backend.checks
        // pkgs.lib.mapAttrs' (name: value: {
          name = "frontend-${name}";
          value = value;
        }) frontend.checks;

        devShells.default = craneLib.devShell {
          checks = backend.checks;
          packages = [ pkgs.nodejs_24 ];
        };

        formatter = nixpkgs.legacyPackages.${system}.nixfmt-tree;
      }
    );
}

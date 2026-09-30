{
  description = "Self hosted tool for managing and sharing a shopping list across the whole family.";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    crane.url = "github:ipetkov/crane";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs =
    inputs@{
      nixpkgs,
      crane,
      flake-parts,
      ...
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      imports = [
        ./nix/backend.nix
        ./nix/frontend.nix
      ];

      perSystem =
        {
          pkgs,
          craneLib,
          config,
          ...
        }:
        {
          _module.args.craneLib = crane.mkLib pkgs;

          devShells.default = craneLib.devShell {
            checks = config.checks;

            packages = with pkgs; [
              rust-analyzer
              nodejs_26
            ];
          };

          formatter = pkgs.nixfmt-tree;
        };
    };
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/WalrusBlobRegistry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        WalrusBlobRegistry registry = new WalrusBlobRegistry();
        
        console.log("WalrusBlobRegistry deployed to:", address(registry));
        
        vm.stopBroadcast();
    }
}
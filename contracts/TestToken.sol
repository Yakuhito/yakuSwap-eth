//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor(address initialAccount, uint initialBalance) ERC20("TestToken", "TST") {
        _mint(initialAccount, initialBalance);
    }
}
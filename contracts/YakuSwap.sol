//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract YakuSwap is Ownable {

  // Uninitialized - Default status (if swaps[index] doesn't exist, status will get this value)
  // Created - the swap was created, but the mone is still in the contract
  // Completed - the money has been sent to 'toAddress' (swap successful)
  // Cancelled - the money has been sent to 'fromAddress' (maxBlockHeight was reached)
  enum SwapStatus {Uninitialized, Created, Completed, Cancelled}

  mapping(bytes32 => SwapStatus) public swaps;

  uint public totalFees = 0;

  uint constant public MAX_BLOCK_HEIGHT = 256;

  event SwapCreated(
    bytes32 indexed swapHash,
    address indexed fromAddress,
    address indexed toAddress,
    uint value,
    bytes32 secretHash,
    uint blockNumber
  );
  
  function _getSwapHash(
    address fromAddress,
    address toAddress,
    uint value,
    bytes32 secretHash,
    uint blockNumber
  ) internal view returns (bytes32) {
    return keccak256(
      abi.encode(
        fromAddress,
        toAddress,
        value,
        secretHash,
        blockNumber,
        block.chainid
      )
    );
  }

  function getSwapHash(
    address fromAddress,
    address toAddress,
    uint value,
    bytes32 secretHash,
    uint blockNumber
  ) external view returns (bytes32) {
    return _getSwapHash(
      fromAddress, toAddress, value, secretHash, blockNumber
    );
  }

  function createSwap(address toAddress, bytes32 secretHash) payable external {
    require(toAddress != address(0), "Destination address cannot be zero");

    bytes32 swapHash = _getSwapHash(
      msg.sender,
      toAddress,
      msg.value,
      secretHash,
      block.number
    );

    require(swaps[swapHash] == SwapStatus.Uninitialized);
    swaps[swapHash] = SwapStatus.Created;

    emit SwapCreated(
      swapHash,
      msg.sender,
      toAddress,
      msg.value,
      secretHash,
      block.number
    );
  }

  function completeSwap(
    address fromAddress,
    address toAddress,
    uint value,
    uint blockNumber,
    string memory secret
  ) external {
    bytes32 secretHash = sha256(abi.encodePacked(secret));
    bytes32 swapHash = _getSwapHash(
      fromAddress,
      toAddress,
      value,
      secretHash,
      blockNumber
    );

    require(swaps[swapHash] == SwapStatus.Created, "Invalid swap data or swap already completed");
    require(block.number < blockNumber + MAX_BLOCK_HEIGHT, "Deadline exceeded");
    swaps[swapHash] = SwapStatus.Completed;

    uint swapAmount = value * 993 / 1000;
    totalFees += value - swapAmount;

    (bool success,) = toAddress.call{value : swapAmount}("");
    require(success, "Transfer failed");
  }

  function cancelSwap(
    address toAddress,
    uint value,
    bytes32 secretHash,
    uint blockNumber
  ) public {
    bytes32 swapHash = _getSwapHash(
      msg.sender,
      toAddress,
      value,
      secretHash,
      blockNumber
    );

    require(swaps[swapHash] == SwapStatus.Created, "Invalid swap status");
    require(block.number >= blockNumber + MAX_BLOCK_HEIGHT, "MAX_BLOCK_HEIGHT not exceeded");

    swaps[swapHash] = SwapStatus.Cancelled;
    (bool success,) = msg.sender.call{value : value}("");
    require(success, "Transfer failed");
  }

  function withdrawFees() external onlyOwner {
    uint feesToWithdraw = totalFees;
    totalFees = 0;

    (bool success,) = owner().call{value : feesToWithdraw}("");
    require(success, "Transfer failed");
  }
}
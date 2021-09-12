//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract YakuSwap is Ownable {
  using SafeERC20 for IERC20;

  // Uninitialized - Default status (if swaps[index] doesn't exist, status will get this value)
  // Created - the swap was created, but the mone is still in the contract
  // Completed - the money has been sent to 'toAddress' (swap successful)
  // Cancelled - the money has been sent to 'fromAddress' (maxBlockHeight was reached)
  enum SwapStatus {Uninitialized, Created, Completed, Cancelled}

  mapping(bytes32 => SwapStatus) public swaps;
  mapping(address => uint) public totalFees;

  uint constant public MAX_BLOCK_HEIGHT = 256;

  event SwapCreated(
    bytes32 swapHash,
    address indexed tokenAddress,
    address indexed fromAddress,
    address indexed toAddress,
    uint amount,
    bytes32 secretHash,
    uint blockNumber
  );
  
  function _getSwapHash(
    address tokenAddress,
    address fromAddress,
    address toAddress,
    uint amount,
    bytes32 secretHash,
    uint blockNumber
  ) internal view returns (bytes32) {
    return keccak256(
      abi.encode(
        tokenAddress,
        fromAddress,
        toAddress,
        amount,
        secretHash,
        blockNumber,
        block.chainid
      )
    );
  }

  function getSwapHash(
    address tokenAddress,
    address fromAddress,
    address toAddress,
    uint amount,
    bytes32 secretHash,
    uint blockNumber
  ) external view returns (bytes32) {
    return _getSwapHash(
      tokenAddress, fromAddress, toAddress, amount, secretHash, blockNumber
    );
  }

  function createSwap(address tokenAddress, address toAddress, uint amount, bytes32 secretHash) external {
    require(toAddress != address(0), "Destination address cannot be zero");
    require(tokenAddress != address(0), "Token contract address cannot be zero");

    bytes32 swapHash = _getSwapHash(
      tokenAddress,
      msg.sender,
      toAddress,
      amount,
      secretHash,
      block.number
    );

    require(swaps[swapHash] == SwapStatus.Uninitialized, "Invalid swap status");
    IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);

    swaps[swapHash] = SwapStatus.Created;
    emit SwapCreated(
      swapHash,
      tokenAddress,
      msg.sender,
      toAddress,
      amount,
      secretHash,
      block.number
    );
  }

  function completeSwap(
    address tokenAddress,
    address fromAddress,
    address toAddress,
    uint amount,
    uint blockNumber,
    string memory secret
  ) external {
    bytes32 secretHash = sha256(abi.encodePacked(secret));
    bytes32 swapHash = _getSwapHash(
      tokenAddress,
      fromAddress,
      toAddress,
      amount,
      secretHash,
      blockNumber
    );

    require(swaps[swapHash] == SwapStatus.Created, "Invalid swap data or swap already completed");
    require(block.number < blockNumber + MAX_BLOCK_HEIGHT, "Deadline exceeded");
    swaps[swapHash] = SwapStatus.Completed;

    uint swapAmount = amount * 993 / 1000;
    totalFees[tokenAddress] += amount - swapAmount;

    IERC20(tokenAddress).safeTransfer(toAddress, swapAmount);
  }

  function cancelSwap(
    address tokenAddress,
    address toAddress,
    uint amount,
    bytes32 secretHash,
    uint blockNumber
  ) public {
    bytes32 swapHash = _getSwapHash(
      tokenAddress,
      msg.sender,
      toAddress,
      amount,
      secretHash,
      blockNumber
    );

    require(swaps[swapHash] == SwapStatus.Created, "Invalid swap status");
    require(block.number >= blockNumber + MAX_BLOCK_HEIGHT, "MAX_BLOCK_HEIGHT not exceeded");

    swaps[swapHash] = SwapStatus.Cancelled;
    IERC20(tokenAddress).safeTransfer(msg.sender, amount);
  }

  function withdrawFees(address tokenAddress) external onlyOwner {
    uint feesToWithdraw = totalFees[tokenAddress];
    totalFees[tokenAddress] = 0;

    IERC20(tokenAddress).safeTransfer(msg.sender, feesToWithdraw);
  }
}